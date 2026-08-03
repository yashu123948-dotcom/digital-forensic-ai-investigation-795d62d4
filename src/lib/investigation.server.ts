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
