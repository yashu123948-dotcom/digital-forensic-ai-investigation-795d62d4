import {
  Brain,
  Boxes,
  ScrollText,
  ShieldAlert,
  Clock4,
  Network,
  Gauge,
  Globe2,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type AgentKey =
  | "orchestrator"
  | "evidence_collection"
  | "log_analysis"
  | "malware_detection"
  | "timeline_reconstruction"
  | "correlation"
  | "risk_assessment"
  | "threat_intelligence"
  | "report_generation";

export interface AgentSpec {
  key: AgentKey;
  name: string;
  role: string;
  icon: LucideIcon;
  purpose: string;
  input: string;
  output: string;
  workflow: string[];
  technologies: string[];
  baselineConfidence: number;
  exampleResult: string;
  accent: "neon" | "cyan" | "violet" | "warning" | "danger" | "success";
}

export const AGENTS: AgentSpec[] = [
  {
    key: "orchestrator",
    name: "Orchestrator Agent",
    role: "Mission control",
    icon: Brain,
    purpose:
      "Plans the investigation, decides which specialist agents to dispatch, and arbitrates conflicting findings.",
    input: "Case metadata, evidence manifest, analyst objectives",
    output: "Execution plan, agent dispatch order, consolidated verdict",
    workflow: [
      "Parse case scope and evidence manifest",
      "Derive investigative hypotheses",
      "Dispatch specialist agents in dependency order",
      "Reconcile conflicting agent conclusions",
    ],
    technologies: ["LLM planner", "Task graph", "Structured output schema"],
    baselineConfidence: 0.9,
    exampleResult:
      "Dispatched 8 specialist agents across 14 artifacts; escalated 2 conflicting findings for analyst review.",
    accent: "neon",
  },
  {
    key: "evidence_collection",
    name: "Evidence Collection Agent",
    role: "Acquisition & chain of custody",
    icon: Boxes,
    purpose:
      "Normalises uploaded artifacts, records hashes, and maintains an auditable chain of custody.",
    input: "Uploaded files, archives, disk/memory artifacts",
    output: "Evidence inventory with hashes, types and custody records",
    workflow: [
      "Enumerate and classify artifacts",
      "Compute SHA-256 integrity hashes",
      "Extract readable content where supported",
      "Register custody entries in the audit log",
    ],
    technologies: ["SHA-256", "MIME sniffing", "Object storage", "Audit trail"],
    baselineConfidence: 0.94,
    exampleResult:
      "Inventoried 12 artifacts (3 log files, 6 documents, 3 images); all hashes recorded, no integrity gaps.",
    accent: "cyan",
  },
  {
    key: "log_analysis",
    name: "Log Analysis Agent",
    role: "Telemetry parsing",
    icon: ScrollText,
    purpose:
      "Parses Windows Event Logs, syslog, web and application logs to surface anomalous authentication and execution activity.",
    input: "EVTX exports, syslog, auth logs, application logs",
    output: "Structured events, anomaly clusters, suspicious sequences",
    workflow: [
      "Detect log format and normalise timestamps",
      "Index events by actor, host and action",
      "Flag anomalies against baseline patterns",
      "Rank events by investigative relevance",
    ],
    technologies: [
      "Windows Event Log parser",
      "Regex extraction",
      "Statistical baselining",
      "LLM reasoning",
    ],
    baselineConfidence: 0.82,
    exampleResult:
      "Detected 43 failed logons (4625) followed by one success (4624) from a single source within 90 seconds.",
    accent: "violet",
  },
  {
    key: "malware_detection",
    name: "Malware Detection Agent",
    role: "Signature & heuristic scanning",
    icon: ShieldAlert,
    purpose:
      "Screens artifacts for known malicious signatures and suspicious structural indicators.",
    input: "Binary and document artifacts, archive contents",
    output: "Scan verdicts, indicator matches, quarantine recommendations",
    workflow: [
      "Signature screening across the artifact set",
      "Heuristic inspection of macros, scripts and packers",
      "Correlate indicators with observed behaviour",
      "Emit verdict with explicit confidence",
    ],
    technologies: ["ClamAV signature engine", "Heuristics", "Entropy analysis"],
    baselineConfidence: 0.78,
    exampleResult:
      "1 artifact flagged suspicious (macro-enabled document with obfuscated AutoOpen routine). No signature match.",
    accent: "danger",
  },
  {
    key: "timeline_reconstruction",
    name: "Timeline Reconstruction Agent",
    role: "Temporal ordering",
    icon: Clock4,
    purpose:
      "Fuses timestamps across all sources into a single defensible incident timeline.",
    input: "Normalised events from every artifact source",
    output: "Ordered timeline with phases and confidence per entry",
    workflow: [
      "Normalise timezones and clock skew",
      "Merge multi-source events",
      "Segment into incident phases",
      "Annotate gaps and uncertainty",
    ],
    technologies: ["Temporal fusion", "Clock-skew correction", "LLM synthesis"],
    baselineConfidence: 0.85,
    exampleResult:
      "Reconstructed 9-step timeline spanning 3h 42m from initial access to data staging.",
    accent: "cyan",
  },
  {
    key: "correlation",
    name: "Correlation Agent",
    role: "Entity linking",
    icon: Network,
    purpose:
      "Links accounts, hosts, files and network endpoints into an attack graph across independent evidence sources.",
    input: "Agent findings, extracted entities, timeline",
    output: "Entity graph, corroborated links, attack path",
    workflow: [
      "Extract entities from all agent outputs",
      "Score links by corroboration strength",
      "Build the attack path graph",
      "Highlight single-source, unverified links",
    ],
    technologies: ["Graph correlation", "Entity resolution", "LLM reasoning"],
    baselineConfidence: 0.79,
    exampleResult:
      "Linked 3 artifacts to a single actor account via matching host, session ID and file hash.",
    accent: "neon",
  },
  {
    key: "risk_assessment",
    name: "Risk Assessment Agent",
    role: "Impact scoring",
    icon: Gauge,
    purpose:
      "Scores likelihood and impact to produce a defensible risk rating with the reasoning that produced it.",
    input: "Correlated findings, asset context, timeline",
    output: "Threat score (0-100), risk level, justification",
    workflow: [
      "Weigh severity of corroborated findings",
      "Assess blast radius and data exposure",
      "Compute composite threat score",
      "State assumptions and residual uncertainty",
    ],
    technologies: ["Weighted scoring model", "LLM justification"],
    baselineConfidence: 0.8,
    exampleResult:
      "Threat score 72/100 (High). Driven by credential compromise plus outbound staging activity.",
    accent: "warning",
  },
  {
    key: "threat_intelligence",
    name: "Threat Intelligence Agent",
    role: "Adversary context",
    icon: Globe2,
    purpose:
      "Maps observed behaviour to known adversary techniques and provides contextual intelligence.",
    input: "Behavioural findings, indicators, attack path",
    output: "MITRE ATT&CK mapping, technique confidence, context notes",
    workflow: [
      "Extract observed behaviours",
      "Map to ATT&CK tactics and techniques",
      "Note the evidence supporting each mapping",
      "Flag speculative mappings explicitly",
    ],
    technologies: ["MITRE ATT&CK", "IOC extraction", "LLM knowledge"],
    baselineConfidence: 0.74,
    exampleResult:
      "Mapped to T1110.001 (Password Guessing) and T1078 (Valid Accounts) with supporting log evidence.",
    accent: "violet",
  },
  {
    key: "report_generation",
    name: "Report Generation Agent",
    role: "Documentation",
    icon: FileText,
    purpose:
      "Compiles the investigation into an executive and technical report suitable for legal and management review.",
    input: "All agent outputs, timeline, risk rating",
    output: "Executive summary, technical report, recommendations",
    workflow: [
      "Summarise findings for non-technical readers",
      "Compile technical evidence sections",
      "Attach timeline and ATT&CK mapping",
      "Record limitations and confidence",
    ],
    technologies: ["LLM synthesis", "Structured report schema", "PDF/HTML export"],
    baselineConfidence: 0.88,
    exampleResult:
      "Generated an 8-section report with executive summary, evidence table and 5 prioritised recommendations.",
    accent: "success",
  },
];

export const AGENT_MAP = Object.fromEntries(
  AGENTS.map((agent) => [agent.key, agent]),
) as Record<AgentKey, AgentSpec>;

export const PIPELINE_STAGES = [
  "Scanning uploaded files",
  "Collecting evidence & hashing",
  "Running signature scan (ClamAV)",
  "Analyzing log telemetry",
  "Building incident timeline",
  "Correlating evidence",
  "Assessing risk",
  "Generating report",
];

export const accentClass: Record<AgentSpec["accent"], string> = {
  neon: "text-primary",
  cyan: "text-cyan",
  violet: "text-violet",
  warning: "text-warning",
  danger: "text-danger",
  success: "text-success",
};
