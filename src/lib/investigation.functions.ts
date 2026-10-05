import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RunInput = z.object({ caseId: z.string().uuid() });
const ChatInput = z.object({
  question: z.string().min(1).max(2000),
  caseId: z.string().uuid().nullable(),
});
const EvidenceIdInput = z.object({ evidenceId: z.string().uuid() });

export const runInvestigation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const started = Date.now();

    const { data: caseRow, error: caseError } = await supabase
      .from("cases")
      .select("id, title, description, case_type, user_id")
      .eq("id", data.caseId)
      .maybeSingle();
    if (caseError || !caseRow) throw new Error("Case not found or not accessible.");

    const { data: evidenceRows, error: evidenceError } = await supabase
      .from("evidence_files")
      .select("id, file_name, file_type, file_size, sha256, extracted_text, created_at")
      .eq("case_id", data.caseId);
    if (evidenceError) throw new Error("Could not read this investigation's evidence.");
    const evidence = (evidenceRows ?? []).filter((file) => Boolean(file.sha256));
    if (evidence.length === 0) {
      throw new Error("No fingerprinted evidence is available. Upload a file and wait for processing before starting the investigation.");
    }

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    const { runForensicPipeline, AGENT_ORDER } = await import("./investigation.server");
    const { AGENT_LABELS } = await import("./agent-labels");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabase.from("cases").update({ status: "running" }).eq("id", data.caseId);

    let result;
    try {
      result = await runForensicPipeline(
        apiKey,
        caseRow.title,
        caseRow.case_type,
        caseRow.description,
        evidence ?? [],
      );
    } catch (error) {
      await supabase.from("cases").update({ status: "failed" }).eq("id", data.caseId);
      throw error;
    }

    await supabaseAdmin.from("agent_outputs").delete().eq("case_id", data.caseId);
    await supabaseAdmin.from("reports").delete().eq("case_id", data.caseId);

    const rows = result.agents.map((agent, index) => ({
      case_id: data.caseId,
      user_id: caseRow.user_id,
      agent_key: agent.agent_key,
      agent_name: AGENT_LABELS[agent.agent_key] ?? agent.agent_key,
      sequence: AGENT_ORDER.indexOf(agent.agent_key) >= 0
        ? AGENT_ORDER.indexOf(agent.agent_key)
        : index,
      status: agent.status ?? "completed",
      summary: agent.summary ?? "",
      findings: agent.findings,
      evidence_refs: agent.evidence_refs,
      recommendations: agent.recommendations,
      reasoning: agent.reasoning ?? "",
      confidence: agent.confidence,
      risk: (["low", "medium", "high", "critical"] as const).find(
        (level) => level === agent.risk,
      ) ?? null,
    }));
    if (rows.length) await supabaseAdmin.from("agent_outputs").insert(rows);

    await supabaseAdmin.from("reports").insert({
      case_id: data.caseId,
      user_id: caseRow.user_id,
      title: `Forensic Report — ${caseRow.title}`,
      executive_summary: result.executive_summary,
      content: {
        technical_summary: result.technical_summary,
        timeline: result.timeline,
        attack_path: result.attack_path,
        mitre: result.mitre,
        recommendations: result.recommendations,
        limitations: result.limitations,
        threat_score: result.threat_score,
        risk: result.risk,
        malware_detected: result.malware_detected,
        evidence: (evidence ?? []).map((e) => ({
          file_name: e.file_name,
          file_type: e.file_type,
          file_size: e.file_size,
          sha256: e.sha256,
        })),
      },
    });

    const duration = Math.round((Date.now() - started) / 1000);
    await supabase
      .from("cases")
      .update({
        status: "completed",
        risk: result.risk,
        threat_score: result.threat_score,
        malware_detected: result.malware_detected,
        duration_seconds: duration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", data.caseId);

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "investigation.completed",
      entity: "case",
      entity_id: data.caseId,
      detail: `Risk ${result.risk} · score ${result.threat_score} · ${duration}s`,
    });

    return { ok: true, risk: result.risk, threatScore: result.threat_score };
  });

export const processEvidenceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EvidenceIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: evidence, error: evidenceError } = await context.supabase
      .from("evidence_files")
      .select("id, case_id, user_id, file_name, file_type, file_size, storage_path, created_at")
      .eq("id", data.evidenceId)
      .maybeSingle();
    if (evidenceError || !evidence) throw new Error("Evidence is not available to this account.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const logProcessing = async (detail: string, action = "evidence.processing.completed") => {
      const { error } = await supabaseAdmin.from("audit_logs").insert({
        user_id: context.userId,
        action,
        entity: "evidence_file",
        entity_id: evidence.id,
        detail,
      });
      if (error) throw new Error("Could not record the evidence custody event.");
    };
    const recordFailure = async (reason: string) => {
      await supabaseAdmin
        .from("evidence_files")
        .update({ sha256: null, extracted_text: null })
        .eq("id", evidence.id);
      await logProcessing(
        `Source: Manual upload | Acquired: ${evidence.created_at} | SHA-256: failed | Extraction: failed | Reason: ${reason}`,
        "evidence.processing.failed",
      );
      return { status: "failed" as const, extraction: "failed" as const, sha256: null };
    };

    if (!evidence.storage_path || evidence.file_size > 20 * 1024 * 1024) {
      return recordFailure("Missing stored file or file exceeds the 20 MB processing limit.");
    }

    const { data: storedFile, error: downloadError } = await context.supabase.storage
      .from("evidence")
      .download(evidence.storage_path);
    if (downloadError || !storedFile) return recordFailure("Stored file could not be read.");
    if (storedFile.size > 20 * 1024 * 1024) return recordFailure("Stored file exceeds the 20 MB processing limit.");

    const { inspectEvidenceBytes } = await import("./investigation.server");
    const bytes = await storedFile.arrayBuffer();
    let fingerprint: string | null = null;
    try {
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      fingerprint = Array.from(new Uint8Array(digest))
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      return recordFailure("SHA-256 fingerprint could not be calculated.");
    }

    const inspection = inspectEvidenceBytes(bytes, evidence.file_name, evidence.file_type);
    const { error: updateError } = await supabaseAdmin
      .from("evidence_files")
      .update({
        sha256: fingerprint,
        file_type: inspection.fileType,
        extracted_text: inspection.extractedText,
      })
      .eq("id", evidence.id);
    if (updateError) return recordFailure("Evidence processing results could not be saved.");

    const dateSummary = inspection.timestamps.length
      ? inspection.timestamps.join(", ")
      : "none found in inspected text";
    const details = [
      "Source: Manual upload",
      `Acquired: ${evidence.created_at}`,
      "SHA-256: recorded",
      `Extraction: ${inspection.extractionStatus}`,
      `Parser: ${inspection.parser}`,
      `Observed timestamps: ${dateSummary}`,
    ].join(" | ");
    await logProcessing(details);

    return {
      status: "processed" as const,
      extraction: inspection.extractionStatus,
      sha256: fingerprint,
    };
  });

export const verifyEvidenceIntegrity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => EvidenceIdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: evidence, error } = await context.supabase
      .from("evidence_files")
      .select("id, storage_path, sha256")
      .eq("id", data.evidenceId)
      .maybeSingle();
    if (error || !evidence?.storage_path) throw new Error("Evidence is not available to this account.");

    const { data: storedFile, error: downloadError } = await context.supabase.storage
      .from("evidence")
      .download(evidence.storage_path);
    if (downloadError || !storedFile) throw new Error("The stored evidence file could not be read.");

    const digest = await crypto.subtle.digest("SHA-256", await storedFile.arrayBuffer());
    const currentHash = Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    const status = !evidence.sha256
      ? "unverified"
      : evidence.sha256.toLowerCase() === currentHash
        ? "match"
        : "mismatch";

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "evidence.integrity.checked",
      entity: "evidence_file",
      entity_id: evidence.id,
      detail: `SHA-256 recheck: ${status}`,
    });
    if (auditError) throw new Error("Could not record the integrity check.");

    return { status, storedHash: evidence.sha256, currentHash };
  });

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured for this project.");

    let contextText = "No specific case selected.";
    if (data.caseId) {
      const { data: outputs } = await context.supabase
        .from("agent_outputs")
        .select("agent_name, summary, confidence, risk")
        .eq("case_id", data.caseId)
        .order("sequence");
      if (outputs?.length) {
        contextText = outputs
          .map(
            (o) =>
              `${o.agent_name} (confidence ${o.confidence}, risk ${o.risk ?? "n/a"}): ${o.summary}`,
          )
          .join("\n");
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "You are the ForensicAI assistant. Answer concisely for a SOC analyst. Only use the supplied investigation context; if it does not answer the question, say so instead of guessing.",
          },
          { role: "user", content: `CONTEXT:\n${contextText}\n\nQUESTION: ${data.question}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) throw new Error("Rate limited. Try again shortly.");
      if (response.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`Assistant unavailable (${response.status}).`);
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return { answer: payload.choices?.[0]?.message?.content ?? "No answer produced." };
  });
