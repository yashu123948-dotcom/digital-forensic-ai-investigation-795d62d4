import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Cpu, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { casesQuery, outputsQuery, type AgentOutputRow } from "@/lib/queries";
import { AGENT_LABELS } from "@/lib/agent-labels";

export const Route = createFileRoute("/_authenticated/agent-reports")({
  head: () => ({
    meta: [
      { title: "AI Agent Reports — ForensicAI" },
      {
        name: "description",
        content:
          "Timeline of what every AI agent did on each investigation: findings, recommendations and confidence.",
      },
      { property: "og:title", content: "AI Agent Reports — ForensicAI" },
      {
        property: "og:description",
        content: "Chronological AI agent activity across all forensic cases.",
      },
    ],
  }),
  component: AgentReportsPage,
});

interface Finding {
  title?: string;
  detail?: string;
  severity?: string;
}

interface Step {
  time: string;
  event: string;
  severity: string | null;
  kind: "summary" | "finding" | "recommendation" | "reasoning";
}

function toFindings(value: unknown): Finding[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) =>
    typeof v === "string" ? { detail: v } : (v as Finding),
  );
}

function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
}

function stamp(base: string, offsetSeconds: number) {
  const d = new Date(new Date(base).getTime() + offsetSeconds * 1000);
  return Number.isNaN(d.getTime()) ? base : d.toISOString().replace(/\.\d+Z$/, "Z");
}

function buildSteps(output: AgentOutputRow): Step[] {
  const steps: Step[] = [];
  let i = 0;
  const base = output.created_at;
  if (output.summary) {
    steps.push({
      time: stamp(base, i++),
      event: output.summary,
      severity: output.risk,
      kind: "summary",
    });
  }
  for (const f of toFindings(output.findings)) {
    const text = [f.title, f.detail].filter(Boolean).join(" — ");
    if (!text) continue;
    steps.push({
      time: stamp(base, i++),
      event: text,
      severity: f.severity ?? output.risk,
      kind: "finding",
    });
  }
  for (const r of toStrings(output.recommendations)) {
    steps.push({ time: stamp(base, i++), event: r, severity: null, kind: "recommendation" });
  }
  if (output.reasoning) {
    steps.push({
      time: stamp(base, i++),
      event: output.reasoning,
      severity: null,
      kind: "reasoning",
    });
  }
  return steps;
}

const KIND_LABEL: Record<Step["kind"], string> = {
  summary: "examination",
  finding: "finding",
  recommendation: "recommendation",
  reasoning: "reasoning",
};

function AgentReportsPage() {
  const { data: outputs = [], isLoading } = useQuery(outputsQuery());
  const { data: cases = [] } = useQuery(casesQuery());
  const [agentFilter, setAgentFilter] = useState<string>("all");

  const caseMap = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);

  const agentKeys = useMemo(
    () => Array.from(new Set(outputs.map((o) => o.agent_key))),
    [outputs],
  );

  const grouped = useMemo(() => {
    const filtered = outputs.filter(
      (o) => agentFilter === "all" || o.agent_key === agentFilter,
    );
    const map = new Map<string, AgentOutputRow[]>();
    for (const o of filtered) {
      const arr = map.get(o.case_id) ?? [];
      arr.push(o);
      map.set(o.case_id, arr);
    }
    return Array.from(map.entries()).map(([caseId, rows]) => ({
      caseId,
      rows: [...rows].sort((a, b) => a.sequence - b.sequence),
    }));
  }, [outputs, agentFilter]);

  return (
    <AppShell
      title="AI agent reports"
      subtitle="What every agent did, step by step, on each investigation"
    >
      <div className="glass-panel mb-4 flex flex-wrap items-center gap-2 p-3">
        <FilterChip
          label="All agents"
          active={agentFilter === "all"}
          onClick={() => setAgentFilter("all")}
        />
        {agentKeys.map((k) => (
          <FilterChip
            key={k}
            label={AGENT_LABELS[k] ?? k}
            active={agentFilter === k}
            onClick={() => setAgentFilter(k)}
          />
        ))}
      </div>

      {isLoading ? (
        <p className="glass-panel p-6 text-sm text-muted-foreground">
          Loading agent reports…
        </p>
      ) : grouped.length === 0 ? (
        <p className="glass-panel p-6 text-sm text-muted-foreground">
          No agent output yet. Start an investigation to generate agent reports.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ caseId, rows }) => {
            const c = caseMap.get(caseId);
            return (
              <section key={caseId} className="glass-panel overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                  <Cpu className="size-4 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold">
                      {c?.title ?? "Case"}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {rows.length} agent report{rows.length === 1 ? "" : "s"}
                      {c ? ` · ${c.case_type}` : ""}
                    </p>
                  </div>
                  {c && <StatusChip value={c.status} />}
                  <Link
                    to="/case/$caseId"
                    params={{ caseId }}
                    className="ml-auto flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
                  >
                    Open case <ChevronRight className="size-3" />
                  </Link>
                </div>

                <div className="divide-y divide-border">
                  {rows.map((o) => {
                    const steps = buildSteps(o);
                    return (
                      <article key={o.id} className="p-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-sm font-semibold">
                            {o.agent_name || AGENT_LABELS[o.agent_key] || o.agent_key}
                          </p>
                          <span className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                            {o.status}
                          </span>
                          {o.risk && <StatusChip value={o.risk} />}
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                            {Math.round(Number(o.confidence) * 100)}% conf.
                          </span>
                        </div>

                        {steps.length === 0 ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            This agent recorded no activity for this case.
                          </p>
                        ) : (
                          <ol className="relative mt-4 space-y-5 border-l border-border pl-6">
                            {steps.map((s, i) => (
                              <li key={i} className="relative">
                                <span className="absolute -left-[1.9rem] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                                <p className="font-mono text-xs text-primary">{s.time}</p>
                                <p className="mt-1 text-sm">{s.event}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                  <span className="font-mono">
                                    {(c?.title ?? "Case") + " · " + KIND_LABEL[s.kind]}
                                  </span>
                                  {s.severity && <StatusChip value={s.severity} />}
                                </div>
                              </li>
                            ))}
                          </ol>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "rounded-full border border-primary/50 bg-primary/12 px-3 py-1 font-mono text-[11px] text-primary"
          : "rounded-full border border-border px-3 py-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </button>
  );
}
