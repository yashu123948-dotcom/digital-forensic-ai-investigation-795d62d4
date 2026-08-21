import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  Gauge,
  Bug,
  Clock4,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { caseQuery } from "@/lib/queries";
import { AGENTS } from "@/lib/agents";
import { runInvestigation } from "@/lib/investigation.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/case/$caseId")({
  head: () => ({
    meta: [
      { title: "Case Detail — ForensicAI" },
      { name: "description", content: "Per-agent findings, evidence, timeline and threat scoring for a forensic case." },
      { property: "og:title", content: "Case Detail — ForensicAI" },
      { property: "og:description", content: "Per-agent forensic findings and threat scoring." },
    ],
  }),
  component: CaseDetail,
});

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function CaseDetail() {
  const { caseId } = useParams({ from: "/_authenticated/case/$caseId" });
  const qc = useQueryClient();
  const run = useServerFn(runInvestigation);
  const [rerunning, setRerunning] = useState(false);
  const { data, isLoading } = useQuery(caseQuery(caseId));

  async function rerun() {
    setRerunning(true);
    try {
      await run({ data: { caseId } });
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
      toast.success("Pipeline re-run complete");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRerunning(false);
    }
  }

  const caseRow = data?.caseRow;

  return (
    <AppShell
      title={caseRow?.title ?? "Case"}
      subtitle={caseRow ? `${caseRow.case_type} · opened ${new Date(caseRow.created_at).toLocaleString()}` : "Loading…"}
      actions={
        <div className="mr-1 flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/reports">
              <ArrowLeft className="mr-1.5 size-4" /> Reports
            </Link>
          </Button>
          <Button size="sm" onClick={rerun} disabled={rerunning}>
            {rerunning ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 size-4" />
            )}
            Re-run
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading case…</p>
      ) : !caseRow ? (
        <p className="text-sm text-muted-foreground">This case does not exist or is not accessible.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Gauge} label="Threat score" value={`${caseRow.threat_score ?? 0}/100`}>
              <Progress value={caseRow.threat_score ?? 0} className="mt-3 h-1.5" />
            </MetricCard>
            <MetricCard icon={Bug} label="Malware detected" value={String(caseRow.malware_detected ?? 0)} />
            <MetricCard icon={Clock4} label="Pipeline duration" value={`${caseRow.duration_seconds ?? 0}s`} />
            <div className="glass-panel flex flex-col justify-between p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Status</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip value={caseRow.status} />
                <StatusChip value={caseRow.risk ?? "info"} />
              </div>
            </div>
          </div>

          {caseRow.description && (
            <div className="glass-panel p-5">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Incident context
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{caseRow.description}</p>
            </div>
          )}

          {data?.report?.executive_summary && (
            <div className="glass-panel p-5">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <h2 className="font-display text-sm font-semibold">Executive summary</h2>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link to="/report/$caseId" params={{ caseId }}>
                    Full report
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{data.report.executive_summary}</p>
            </div>
          )}

          <div className="glass-panel overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
              <h2 className="font-display text-sm font-semibold">Agent review</h2>
              <span className="font-mono text-[11px] text-muted-foreground">
                {data?.outputs.length ?? 0} / {AGENTS.length} agents reported
              </span>
              {data?.report && (
                <Button asChild size="sm" variant="ghost" className="ml-auto">
                  <Link to="/report/$caseId" params={{ caseId }}>
                    View report
                  </Link>
                </Button>
              )}
            </div>
            <div className="divide-y divide-border">
              {AGENTS.map((spec) => {
                const output = data?.outputs.find((o) => o.agent_key === spec.key);
                return output ? (
                  <AgentRow key={spec.key} output={output} />
                ) : (
                  <div
                    key={spec.key}
                    className="flex items-center gap-3 px-5 py-4 text-left opacity-70"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      <spec.icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{spec.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{spec.role}</p>
                    </div>
                    <StatusChip value={rerunning ? "running" : "pending"} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-panel overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-display text-sm font-semibold">Evidence</h2>
            </div>
            {data?.evidence.length ? (
              <div className="divide-y divide-border">
                {data.evidence.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{e.file_name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                      {(e.file_size / 1024).toFixed(0)} KB
                    </span>
                    <span className="hidden shrink-0 truncate font-mono text-[10px] text-muted-foreground md:block">
                      {e.sha256?.slice(0, 16)}…
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">No artefacts attached to this case.</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold">{value}</p>
        </div>
        <div className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
      {children}
    </div>
  );
}

function AgentRow({
  output,
}: {
  output: {
    id: string;
    agent_key: string;
    agent_name: string;
    summary: string | null;
    reasoning: string | null;
    confidence: number;
    status: string;
    risk: string | null;
    findings: unknown;
    recommendations: unknown;
    evidence_refs: unknown;
  };
}) {
  const [open, setOpen] = useState(false);
  const spec = AGENTS.find((a) => a.key === output.agent_key);
  const Icon = spec?.icon ?? FileText;
  const findings = toList(output.findings);
  const recommendations = toList(output.recommendations);
  const refs = toList(output.evidence_refs);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
      >
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{output.agent_name}</p>
          <p className="truncate text-xs text-muted-foreground">{output.summary}</p>
        </div>
        <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:block">
          {Math.round((output.confidence ?? 0) * 100)}% conf.
        </span>
        {output.risk && <StatusChip value={output.risk} className="hidden sm:inline-flex" />}
        <StatusChip value={output.status} />
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-4 border-t border-border bg-secondary/20 px-5 py-4 text-sm">
          {output.reasoning && (
            <Block title="Reasoning">
              <p className="text-muted-foreground">{output.reasoning}</p>
            </Block>
          )}
          {findings.length > 0 && (
            <Block title="Findings">
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {findings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </Block>
          )}
          {refs.length > 0 && (
            <Block title="Evidence references">
              <ul className="flex flex-wrap gap-1.5">
                {refs.map((r, i) => (
                  <li
                    key={i}
                    className="rounded border border-border bg-background/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            </Block>
          )}
          {recommendations.length > 0 && (
            <Block title="Recommendations">
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">{title}</p>
      {children}
    </div>
  );
}
