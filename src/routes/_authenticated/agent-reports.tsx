import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Cpu } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { casesQuery, caseQuery, type AgentOutputRow, type EvidenceRow } from "@/lib/queries";
import { AGENT_LABELS } from "@/lib/agent-labels";

export const Route = createFileRoute("/_authenticated/agent-reports")({
  head: () => ({
    meta: [
      { title: "AI Agent Reports — ForensicAI" },
      {
        name: "description",
        content:
          "Per-agent forensic reporting: each AI agent's own evidence, findings, reasoning and actions for the selected investigation.",
      },
      { property: "og:title", content: "AI Agent Reports — ForensicAI" },
      {
        property: "og:description",
        content: "Agent-by-agent examination record for a single investigation.",
      },
    ],
  }),
  component: AgentReportsPage,
});

/** Display order of the forensic pipeline. Unknown agents are appended. */
const AGENT_ORDER = [
  "orchestrator",
  "evidence_collection",
  "timeline_reconstruction",
  "log_analysis",
  "malware_detection",
  "threat_intelligence",
  "risk_assessment",
  "correlation",
  "report_generation",
];

type Loose = Record<string, unknown>;

interface Finding {
  title?: string;
  detail?: string;
  severity?: string;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function toFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? { detail: v } : (v as Finding)));
}

function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) =>
    typeof v === "string"
      ? v
      : v && typeof v === "object"
        ? Object.values(v as Loose).filter(Boolean).join(" — ")
        : String(v ?? ""),
  );
}

function pct(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `${Math.round(Number(value) * 100)}%`;
}

function AgentReportsPage() {
  const { data: cases = [], isLoading: casesLoading } = useQuery(casesQuery());
  const [selected, setSelected] = useState<string>("");

  const caseId = selected || cases[0]?.id || "";
  const { data, isLoading } = useQuery({ ...caseQuery(caseId), enabled: !!caseId });

  const outputs = data?.outputs ?? [];
  const outputByKey = useMemo(
    () => new Map(outputs.map((o) => [o.agent_key, o])),
    [outputs],
  );

  const agentKeys = useMemo(() => {
    const extra = outputs.map((o) => o.agent_key).filter((k) => !AGENT_ORDER.includes(k));
    return [...AGENT_ORDER, ...Array.from(new Set(extra))];
  }, [outputs]);

  const caseRow = data?.caseRow;
  const done = outputs.filter((o) => o.status !== "queued" && o.status !== "running").length;
  const progress = agentKeys.length ? Math.round((done / agentKeys.length) * 100) : 0;

  return (
    <AppShell
      title="AI agent reports"
      subtitle="Agent-by-agent examination record for a single investigation"
    >
      <div className="glass-panel mb-4 flex flex-wrap items-center gap-3 p-4">
        <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Investigation
        </label>
        <select
          value={caseId}
          onChange={(e) => setSelected(e.target.value)}
          className="h-9 min-w-64 rounded-md border border-border bg-secondary/50 px-3 text-sm outline-none focus:border-primary/60"
        >
          {cases.length === 0 && <option value="">No investigations yet</option>}
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {caseRow && (
          <>
            <StatusChip value={caseRow.status} />
            {caseRow.risk && <StatusChip value={caseRow.risk} />}
            <span className="font-mono text-[11px] text-muted-foreground">
              INV-{caseRow.id.slice(0, 8).toUpperCase()} · progress {progress}%
            </span>
            <Link
              to="/case/$caseId"
              params={{ caseId: caseRow.id }}
              className="ml-auto flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
            >
              Open case <ChevronRight className="size-3" />
            </Link>
          </>
        )}
      </div>

      {casesLoading || isLoading ? (
        <p className="glass-panel p-6 text-sm text-muted-foreground">Loading agent reports…</p>
      ) : !caseId ? (
        <div className="glass-panel p-10 text-center text-sm text-muted-foreground">
          No investigations exist yet. Start a new investigation to generate agent reports.
        </div>
      ) : (
        <div className="space-y-3">
          {agentKeys.map((key) => (
            <AgentSection
              key={key}
              agentKey={key}
              output={outputByKey.get(key) ?? null}
              caseId={caseId}
              caseTitle={caseRow?.title ?? ""}
              evidence={data?.evidence ?? []}
              report={data?.report ?? null}
              allOutputs={outputs}
              agentKeys={agentKeys}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

interface SectionProps {
  agentKey: string;
  output: AgentOutputRow | null;
  caseId: string;
  caseTitle: string;
  evidence: EvidenceRow[];
  report: { id: string; title: string; approval_status?: string | null; content?: unknown; created_at: string } | null;
  allOutputs: AgentOutputRow[];
  agentKeys: string[];
}

function AgentSection(props: SectionProps) {
  const { agentKey, output, caseId, evidence, report, allOutputs, agentKeys } = props;
  const [open, setOpen] = useState(false);

  const name = output?.agent_name || AGENT_LABELS[agentKey] || agentKey;
  const status = (output?.status ?? "queued").toUpperCase();

  const headline = (() => {
    switch (agentKey) {
      case "evidence_collection":
        return `Evidence collected: ${evidence.length}`;
      case "timeline_reconstruction":
        return `Events identified: ${timelineEvents(report).length}`;
      case "orchestrator":
        return `Agents activated: ${allOutputs.length}/${agentKeys.length}`;
      case "report_generation":
        return `Report: ${(report?.approval_status ?? (report ? "pending" : "not generated")).toUpperCase().replace(/-/g, "_")}`;
      default: {
        const n = toFindings(output?.findings).length;
        return `Findings: ${n}`;
      }
    }
  })();

  return (
    <section className="glass-panel overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <Cpu className="size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold">{name}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {headline}
          </p>
        </div>
        <span className="ml-auto rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
          {status}
        </span>
        {output?.risk && <StatusChip value={output.risk} />}
        <span className="font-mono text-[11px] text-muted-foreground">
          conf. {pct(output?.confidence as number | null)}
        </span>
        {open ? (
          <ChevronDown className="size-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="space-y-5 border-t border-border px-5 py-5">
          <dl className="grid gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground sm:grid-cols-2">
            <Meta label="Investigation ID" value={`INV-${caseId.slice(0, 8).toUpperCase()}`} />
            <Meta label="Agent ID" value={agentKey} />
            <Meta
              label="Execution ID"
              value={output ? `EX-${output.id.slice(0, 8).toUpperCase()}` : "—"}
            />
            <Meta
              label="Timestamp"
              value={output ? new Date(output.created_at).toLocaleString() : "—"}
            />
          </dl>

          {!output ? (
            <Empty text="This agent has not been executed for this investigation." />
          ) : (
            <>
              {output.summary && <Block label="Summary">{output.summary}</Block>}

              {agentKey === "orchestrator" && (
                <Orchestration outputs={allOutputs} agentKeys={agentKeys} />
              )}

              {agentKey === "evidence_collection" && <EvidenceTable evidence={evidence} />}

              {agentKey === "timeline_reconstruction" && (
                <TimelineView report={report} findings={toFindings(output.findings)} />
              )}

              {agentKey === "report_generation" && <ReportActivity report={report} caseId={caseId} />}

              {agentKey !== "evidence_collection" && agentKey !== "timeline_reconstruction" && (
                <FindingsList findings={toFindings(output.findings)} agentKey={agentKey} />
              )}

              {!!toStrings(output.evidence_refs).length && (
                <Block label="Referenced evidence">
                  <div className="flex flex-wrap gap-1.5">
                    {toStrings(output.evidence_refs).map((r, i) => (
                      <span
                        key={i}
                        className="rounded border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[11px]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </Block>
              )}

              {!!toStrings(output.recommendations).length && (
                <Block label="Recommended actions">
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {toStrings(output.recommendations).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </Block>
              )}

              {output.reasoning && <Block label="Reasoning">{output.reasoning}</Block>}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function timelineEvents(report: SectionProps["report"]): Loose[] {
  const content = (report?.content ?? {}) as { timeline?: unknown };
  return Array.isArray(content.timeline) ? (content.timeline as Loose[]) : [];
}

function Orchestration({
  outputs,
  agentKeys,
}: {
  outputs: AgentOutputRow[];
  agentKeys: string[];
}) {
  const byKey = new Map(outputs.map((o) => [o.agent_key, o]));
  return (
    <Block label="Execution sequence">
      <ol className="space-y-1.5">
        {agentKeys.map((k, i) => {
          const o = byKey.get(k);
          return (
            <li key={k} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-xs text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 truncate">{AGENT_LABELS[k] ?? k}</span>
              <span className="ml-auto font-mono text-[10px] uppercase text-muted-foreground">
                {(o?.status ?? "queued").toUpperCase()}
              </span>
            </li>
          );
        })}
      </ol>
    </Block>
  );
}

function EvidenceTable({ evidence }: { evidence: EvidenceRow[] }) {
  if (!evidence.length) {
    return (
      <Empty text="No forensic evidence has been collected by this agent for this investigation." />
    );
  }
  return (
    <Block label={`Evidence collected (${evidence.length})`}>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary/50 uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Evidence ID</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">SHA-256</th>
              <th className="px-3 py-2">Integrity</th>
              <th className="px-3 py-2">Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {evidence.map((e, i) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-mono text-primary">
                  EV-{String(i + 1).padStart(3, "0")}
                </td>
                <td className="px-3 py-2">{e.file_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.file_type ?? "unknown"}</td>
                <td className="px-3 py-2 font-mono">{(e.file_size / 1024).toFixed(0)} KB</td>
                <td className="max-w-48 break-all px-3 py-2 font-mono text-muted-foreground">
                  {e.sha256 ?? "not computed"}
                </td>
                <td className="px-3 py-2 font-mono uppercase">
                  {e.sha256 ? "verified" : "unhashed"}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {new Date(e.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Chain of custody: artefacts were ingested into the private evidence store by the case owner
        and hashed on upload.
      </p>
    </Block>
  );
}

function TimelineView({
  report,
  findings,
}: {
  report: SectionProps["report"];
  findings: Finding[];
}) {
  const events = timelineEvents(report);
  if (!events.length && !findings.length) {
    return <Empty text="No timeline events were identified from the available forensic artifacts." />;
  }
  return (
    <Block label={`Chronological reconstruction (${events.length || findings.length})`}>
      <ol className="relative space-y-5 border-l border-border pl-6">
        {(events.length
          ? events.map((t) => ({
              time: str(t["time"]) || "unknown time",
              event: str(t["event"]),
              meta: [str(t["phase"]), str(t["source"])].filter(Boolean).join(" · "),
              severity: str(t["severity"]) || null,
              confidence: t["confidence"] as number | undefined,
            }))
          : findings.map((f) => ({
              time: f.title ?? "unknown time",
              event: f.detail ?? "",
              meta: "",
              severity: f.severity ?? null,
              confidence: undefined,
            }))
        ).map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[1.9rem] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
            <p className="font-mono text-xs text-primary">{e.time}</p>
            <p className="mt-1 text-sm">{e.event}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {e.meta && <span className="font-mono">{e.meta}</span>}
              {e.confidence != null && (
                <span className="font-mono">confidence {Math.round(Number(e.confidence) * 100)}%</span>
              )}
              {e.severity && <StatusChip value={e.severity} />}
            </div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

function ReportActivity({
  report,
  caseId,
}: {
  report: SectionProps["report"];
  caseId: string;
}) {
  if (!report) {
    return <Empty text="No report has been generated for this investigation yet." />;
  }
  const content = (report.content ?? {}) as Loose;
  const sections = [
    ["Executive summary", true],
    ["Technical analysis", !!content["technical_summary"]],
    ["Timeline", Array.isArray(content["timeline"]) && (content["timeline"] as unknown[]).length > 0],
    ["Attack path", Array.isArray(content["attack_path"]) && (content["attack_path"] as unknown[]).length > 0],
    ["MITRE ATT&CK mapping", Array.isArray(content["mitre"]) && (content["mitre"] as unknown[]).length > 0],
    ["Recommendations", Array.isArray(content["recommendations"]) && (content["recommendations"] as unknown[]).length > 0],
    ["Evidence inventory", Array.isArray(content["evidence"]) && (content["evidence"] as unknown[]).length > 0],
  ] as const;

  return (
    <Block label="Report generation activity">
      <dl className="grid gap-x-6 gap-y-1 font-mono text-[11px] text-muted-foreground sm:grid-cols-2">
        <Meta label="Report ID" value={`RPT-${report.id.slice(0, 8).toUpperCase()}`} />
        <Meta label="Generated" value={new Date(report.created_at).toLocaleString()} />
        <Meta
          label="Status"
          value={
            report.approval_status === "approved"
              ? "APPROVED"
              : report.approval_status === "rejected"
                ? "REJECTED"
                : "PENDING_ADMIN_APPROVAL"
          }
        />
      </dl>
      <ul className="mt-3 space-y-1 text-sm">
        {sections.map(([label, present]) => (
          <li key={label} className="flex items-center gap-2">
            <span className={present ? "text-primary" : "text-muted-foreground"}>
              {present ? "✓" : "—"}
            </span>
            <span className={present ? "" : "text-muted-foreground"}>{label}</span>
          </li>
        ))}
      </ul>
      <Link
        to="/report/$caseId"
        params={{ caseId }}
        className="mt-3 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
      >
        View generated report <ChevronRight className="size-3" />
      </Link>
    </Block>
  );
}

function FindingsList({ findings, agentKey }: { findings: Finding[]; agentKey: string }) {
  if (!findings.length) {
    return <Empty text={`This agent produced no findings for this investigation (${AGENT_LABELS[agentKey] ?? agentKey}).`} />;
  }
  return (
    <Block label={`Findings (${findings.length})`}>
      <ul className="space-y-3">
        {findings.map((f, i) => (
          <li key={i} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{f.title ?? `Finding ${i + 1}`}</p>
              {f.severity && <StatusChip value={f.severity} />}
            </div>
            {f.detail && <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>}
          </li>
        ))}
      </ul>
    </Block>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="uppercase tracking-wider">{label}:</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
      {text}
    </p>
  );
}
