/**
 * Server-only forensic pipeline helpers.
 * Contains the multi-agent prompt construction and Lovable AI Gateway call.
 */

export interface EvidenceSummary {
  file_name: string;
  file_type: string | null;
  file_size: number;
  sha256: string | null;
  extracted_text: string | null;
}

export interface AgentResult {
  agent_key: string;
  status: string;
  summary: string;
  findings: { title: string; detail: string; severity: string }[];
  evidence_refs: string[];
  recommendations: string[];
  reasoning: string;
  confidence: number;
  risk: string | null;
}

export interface PipelineResult {
  agents: AgentResult[];
  threat_score: number;
  risk: "low" | "medium" | "high" | "critical";
  malware_detected: number;
  executive_summary: string;
  technical_summary: string;
  timeline: { time: string; phase: string; event: string; confidence: number }[];
  attack_path: { from: string; to: string; technique: string }[];
  mitre: { id: string; name: string; tactic: string; evidence: string }[];
  recommendations: string[];
  limitations: string;
}

export type EvidenceExtractionStatus = "parsed_text" | "archive_listed" | "metadata_only" | "failed";

export function inspectEvidenceBytes(
  buffer: ArrayBuffer,
  fileName: string,
  reportedType: string | null,
): {
  fileType: string;
  extractedText: string | null;
  extractionStatus: EvidenceExtractionStatus;
  parser: string;
  timestamps: string[];
} {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const lowerName = fileName.toLowerCase();
  const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  const isZip = startsWith(0x50, 0x4b, 0x03, 0x04) || startsWith(0x50, 0x4b, 0x05, 0x06);
  let fileType = "application/octet-stream";
  if (startsWith(0x25, 0x50, 0x44, 0x46, 0x2d)) fileType = "application/pdf";
  else if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) fileType = "image/png";
  else if (startsWith(0xff, 0xd8, 0xff)) fileType = "image/jpeg";
  else if (startsWith(0x47, 0x49, 0x46, 0x38)) fileType = "image/gif";
  else if (startsWith(0x4d, 0x5a)) fileType = "application/vnd.microsoft.portable-executable";
  else if (startsWith(0x7f, 0x45, 0x4c, 0x46)) fileType = "application/x-elf";
  else if (startsWith(0x1f, 0x8b)) fileType = "application/gzip";
  else if (isZip) fileType = "application/zip";

  const timestamps: string[] = [];
  if (isZip || lowerName.endsWith(".zip")) {
    if (!isZip || bytes.length < 22) {
      return {
        fileType: isZip ? fileType : "application/zip",
        extractedText: null,
        extractionStatus: "failed",
        parser: "ZIP directory listing",
        timestamps,
      };
    }
    let endRecord = -1;
    const lowerBound = Math.max(0, bytes.length - 65557);
    for (let position = bytes.length - 22; position >= lowerBound; position -= 1) {
      if (view.getUint32(position, true) === 0x06054b50) {
        endRecord = position;
        break;
      }
    }
    if (endRecord < 0) {
      return { fileType, extractedText: null, extractionStatus: "failed", parser: "ZIP directory listing", timestamps };
    }
    const entries = view.getUint16(endRecord + 10, true);
    const directorySize = view.getUint32(endRecord + 12, true);
    let position = view.getUint32(endRecord + 16, true);
    if (entries > 200 || position + directorySize > bytes.length) {
      return { fileType, extractedText: null, extractionStatus: "failed", parser: "ZIP directory listing (200-entry safety limit)", timestamps };
    }
    const names: string[] = [];
    try {
      for (let index = 0; index < entries; index += 1) {
        if (position + 46 > bytes.length || view.getUint32(position, true) !== 0x02014b50) throw new Error("Invalid central directory");
        const nameLength = view.getUint16(position + 28, true);
        const extraLength = view.getUint16(position + 30, true);
        const commentLength = view.getUint16(position + 32, true);
        const nameStart = position + 46;
        const nameEnd = nameStart + nameLength;
        if (nameEnd > bytes.length) throw new Error("Invalid archive entry");
        const name = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(nameStart, nameEnd));
        if (name && !name.endsWith("/")) names.push(name.replace(/[\r\n\u0000-\u001f]/g, " "));
        position = nameEnd + extraLength + commentLength;
      }
    } catch {
      return { fileType, extractedText: null, extractionStatus: "failed", parser: "ZIP directory listing", timestamps };
    }
    const listing = names.length ? names.join("\n") : "No files listed in archive.";
    return {
      fileType,
      extractedText: `Extraction method: ZIP central directory listing only. Archive member contents were not extracted.\nListed entries (${names.length}):\n${listing}`,
      extractionStatus: "archive_listed",
      parser: "ZIP central directory listing (filenames only)",
      timestamps,
    };
  }

  const textExtension = /\.(txt|log|csv|json|xml|md|conf|ini|yaml|yml)$/i.test(fileName);
  const mayBeText = textExtension || (reportedType ?? "").toLowerCase().startsWith("text/") || lowerName.endsWith(".json");
  if (!mayBeText || bytes.includes(0)) {
    return {
      fileType: fileType === "application/octet-stream" && textExtension ? "text/plain" : fileType,
      extractedText: null,
      extractionStatus: "metadata_only",
      parser: "No content parser available for this format",
      timestamps,
    };
  }

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const inspectedText = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 2 * 1024 * 1024)));
    const timestampPattern = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\b|\b\d{1,2}\/\d{1,2}\/\d{4}[ ,T]+\d{1,2}:\d{2}:\d{2}(?:\s*[AP]M)?\b/gi;
    for (const match of inspectedText.matchAll(timestampPattern)) {
      if (match[0] && !timestamps.includes(match[0])) timestamps.push(match[0]);
      if (timestamps.length >= 30) break;
    }
    const preview = inspectedText.slice(0, 20000);
    const truncated = bytes.length > 2 * 1024 * 1024 || inspectedText.length > 20000;
    const timeSection = timestamps.length
      ? `\nTimestamp strings observed (unchanged; timezone is not inferred):\n${timestamps.join("\n")}`
      : "\nNo supported timestamp strings were found in the inspected text.";
    return {
      fileType: fileType === "application/octet-stream" ? (reportedType || "text/plain") : fileType,
      extractedText: `Extraction method: UTF-8 text preview.\n${truncated ? "Text was truncated to a safe preview; " : ""}Evidence text:\n${preview}${truncated ? "\n...[preview truncated]" : ""}${timeSection}`,
      extractionStatus: "parsed_text",
      parser: "UTF-8 text preview and timestamp scan (first 2 MB; 20,000-character text preview)",
      timestamps,
    };
  } catch {
    return {
      fileType,
      extractedText: null,
      extractionStatus: "failed",
      parser: "UTF-8 text decoding failed",
      timestamps,
    };
  }
}

const AGENT_KEYS = [
  "orchestrator",
  "evidence_collection",
  "log_analysis",
  "malware_detection",
  "timeline_reconstruction",
  "correlation",
  "risk_assessment",
  "threat_intelligence",
  "report_generation",
];

const SYSTEM_PROMPT = `You are ForensicAI, an autonomous digital forensic investigation platform composed of nine specialist agents.

Absolute rules:
- You analyse ONLY the evidence provided. Never invent artifacts, hashes, IP addresses, usernames or log lines that were not supplied.
- When evidence is thin, say so plainly and lower the confidence score. Low-confidence output is correct; fabricated certainty is a critical failure.
- Every finding must be traceable to a named uploaded artifact.
- Confidence is a decimal between 0 and 1. Threat score is an integer 0-100.
- Severity values: info, low, medium, high, critical. Risk values: low, medium, high, critical.

Return STRICT JSON only, matching this shape:
{
  "agents": [ { "agent_key": one of ${AGENT_KEYS.join("|")}, "status": "completed"|"partial"|"no_findings",
    "summary": string, "findings": [{"title": string, "detail": string, "severity": string}],
    "evidence_refs": [string], "recommendations": [string], "reasoning": string,
    "confidence": number, "risk": string|null } ],
  "threat_score": number, "risk": string, "malware_detected": number,
  "executive_summary": string, "technical_summary": string,
  "timeline": [{"time": string, "phase": string, "event": string, "confidence": number}],
  "attack_path": [{"from": string, "to": string, "technique": string}],
  "mitre": [{"id": string, "name": string, "tactic": string, "evidence": string}],
  "recommendations": [string], "limitations": string
}
Include exactly one entry per agent_key, in the order listed.`;

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}\n...[truncated]` : value;
}

export function buildUserPrompt(
  caseTitle: string,
  caseType: string,
  description: string | null,
  evidence: EvidenceSummary[],
) {
  const manifest = evidence
    .map((file, index) => {
      const head = `#${index + 1} ${file.file_name} | type=${file.file_type ?? "unknown"} | size=${file.file_size} bytes | sha256=${file.sha256 ?? "not computed"}`;
      const body = file.extracted_text
        ? `\n--- content start ---\n${truncate(file.extracted_text, 12000)}\n--- content end ---`
        : "\n(no machine-readable text content; treat as binary artifact — metadata only)";
      return head + body;
    })
    .join("\n\n");

  return `CASE: ${caseTitle}
TYPE: ${caseType}
ANALYST BRIEF: ${description || "none provided"}
ARTIFACT COUNT: ${evidence.length}

EVIDENCE MANIFEST:
${manifest || "No artifacts were uploaded. Report this explicitly and set every confidence very low."}

Run the full nine-agent investigation over this evidence and return the JSON object.`;
}

export async function runForensicPipeline(
  apiKey: string,
  caseTitle: string,
  caseType: string,
  description: string | null,
  evidence: EvidenceSummary[],
): Promise<PipelineResult> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: buildUserPrompt(caseTitle, caseType, description, evidence),
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 429) {
      throw new Error("AI rate limit reached. Please retry in a moment.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Add credits to continue investigations.");
    }
    throw new Error(`AI gateway error ${response.status}: ${text.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

  let parsed: PipelineResult;
  try {
    parsed = JSON.parse(cleaned) as PipelineResult;
  } catch {
    throw new Error("The analysis engine returned malformed output. Please retry.");
  }

  const clamp = (n: unknown, min: number, max: number, fallback: number) => {
    const num = typeof n === "number" && Number.isFinite(n) ? n : fallback;
    return Math.min(max, Math.max(min, num));
  };

  parsed.agents = (parsed.agents ?? []).map((agent) => ({
    ...agent,
    findings: Array.isArray(agent.findings) ? agent.findings : [],
    evidence_refs: Array.isArray(agent.evidence_refs) ? agent.evidence_refs : [],
    recommendations: Array.isArray(agent.recommendations) ? agent.recommendations : [],
    confidence: clamp(agent.confidence, 0, 1, 0.5),
  }));
  parsed.threat_score = Math.round(clamp(parsed.threat_score, 0, 100, 0));
  parsed.malware_detected = Math.round(clamp(parsed.malware_detected, 0, 999, 0));
  if (!["low", "medium", "high", "critical"].includes(parsed.risk)) {
    parsed.risk =
      parsed.threat_score >= 80
        ? "critical"
        : parsed.threat_score >= 60
          ? "high"
          : parsed.threat_score >= 30
            ? "medium"
            : "low";
  }
  parsed.timeline = Array.isArray(parsed.timeline) ? parsed.timeline : [];
  parsed.attack_path = Array.isArray(parsed.attack_path) ? parsed.attack_path : [];
  parsed.mitre = Array.isArray(parsed.mitre) ? parsed.mitre : [];
  parsed.recommendations = Array.isArray(parsed.recommendations)
    ? parsed.recommendations
    : [];

  return parsed;
}

export const AGENT_ORDER = AGENT_KEYS;
