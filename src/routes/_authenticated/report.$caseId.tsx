import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer, ArrowLeft, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { caseQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/report/$caseId")({
  head: () => ({
    meta: [
      { title: "Investigation Report — ForensicAI" },
      { name: "description", content: "Full forensic report: executive summary, technical analysis, timeline, attack path and MITRE mapping." },
      { property: "og:title", content: "Investigation Report — ForensicAI" },
      { property: "og:description", content: "Full forensic report with timeline and MITRE ATT&CK mapping." },
    ],
  }),
  component: ReportPage,
});

interface ReportContent {
  technical_summary?: string;
  timeline?: { time?: string; event?: string; source?: string }[];
  attack_path?: string[];
  mitre?: { technique?: string; id?: string; rationale?: string }[];
  recommendations?: string[];
  limitations?: string[];
  threat_score?: number;
  risk?: string;
  evidence?: { file_name: string; sha256: string | null; file_size: number }[];
}

function ReportPage() {
  const { caseId } = useParams({ from: "/_authenticated/report/$caseId" });
  const { data, isLoading } = useQuery(caseQuery(caseId));
  const report = data?.report;
  const content = (report?.content ?? {}) as ReportContent;

  return (
    <AppShell
      title="Investigation report"
      subtitle={data?.caseRow?.title ?? ""}
      actions={
        <div className="mr-1 flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/case/$caseId" params={{ caseId }}>
              <ArrowLeft className="mr-1.5 size-4" /> Case
            </Link>
          </Button>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 size-4" /> Export
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : !report ? (
        <div className="glass-panel p-10 text-center text-sm text-muted-foreground">
          No report has been generated for this case yet.
        </div>
      ) : (
        <article className="glass-panel mx-auto max-w-4xl space-y-8 p-8 print:border-0 print:bg-white">
          <header className="border-b border-border pb-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="size-5" />
              <span className="font-display text-sm font-semibold uppercase tracking-[0.2em]">
                ForensicAI
              </span>
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold">{report.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">Case ID {caseId.slice(0, 8)}</span>
              <span>·</span>
              <span className="font-mono">{new Date(report.created_at).toLocaleString()}</span>
              {data?.caseRow?.risk && <StatusChip value={data.caseRow.risk} />}
              <span className="font-mono">Threat score {content.threat_score ?? data?.caseRow?.threat_score ?? 0}/100</span>
            </div>
          </header>

          <Section title="1 · Executive summary">
            <p className="leading-relaxed">{report.executive_summary}</p>
          </Section>

          {content.technical_summary && (
            <Section title="2 · Technical analysis">
              <p className="whitespace-pre-line leading-relaxed">{content.technical_summary}</p>
            </Section>
          )}

          {!!content.timeline?.length && (
            <Section title="3 · Reconstructed timeline">
              <ol className="space-y-3">
                {content.timeline.map((t, i) => (
                  <li key={i} className="flex gap-3 border-l border-primary/40 pl-4">
                    <div>
                      <p className="font-mono text-xs text-primary">{t.time ?? "unknown time"}</p>
                      <p className="text-sm">{t.event}</p>
                      {t.source && (
                        <p className="font-mono text-[11px] text-muted-foreground">source: {t.source}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {!!content.attack_path?.length && (
            <Section title="4 · Attack path">
              <ol className="space-y-2">
                {content.attack_path.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {!!content.mitre?.length && (
            <Section title="5 · MITRE ATT&CK mapping">
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Technique</th>
                      <th className="px-3 py-2">Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {content.mitre.map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-xs text-primary">{m.id}</td>
                        <td className="px-3 py-2">{m.technique}</td>
                        <td className="px-3 py-2 text-muted-foreground">{m.rationale}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {!!content.recommendations?.length && (
            <Section title="6 · Recommendations">
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                {content.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Section>
          )}

          {!!content.evidence?.length && (
            <Section title="7 · Evidence inventory">
              <ul className="space-y-1.5 font-mono text-xs text-muted-foreground">
                {content.evidence.map((e, i) => (
                  <li key={i}>
                    {e.file_name} · {(e.file_size / 1024).toFixed(0)} KB · sha256 {e.sha256 ?? "n/a"}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {!!content.limitations?.length && (
            <Section title="8 · Limitations">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {content.limitations.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
            </Section>
          )}

          <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
            This report was produced by an AI multi-agent system and must be validated by a
            qualified forensic analyst before use in legal proceedings.
          </footer>
        </article>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
