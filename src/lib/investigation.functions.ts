import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RunInput = z.object({ caseId: z.string().uuid() });
const ChatInput = z.object({
  question: z.string().min(1).max(2000),
  caseId: z.string().uuid().nullable(),
});

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

    const { data: evidence } = await supabase
      .from("evidence_files")
      .select("file_name, file_type, file_size, sha256, extracted_text")
      .eq("case_id", data.caseId);

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
