import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Download,
  Lock,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { caseQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/report/$caseId")({
  head: () => ({
    meta: [
      { title: "Investigation Report — ForensicAI" },
      {
        name: "description",
        content:
          "Court-ready forensic report: executive summary, technical analysis, timeline, attack path, MITRE mapping and chain of custody.",
      },
      { property: "og:title", content: "Investigation Report — ForensicAI" },
      { property: "og:description", content: "Court-ready forensic report with timeline and MITRE ATT&CK mapping." },
    ],
  }),
  component: ReportPage,
});

type Loose = Record<string, unknown>;

interface ReportContent {
  technical_summary?: string;
  timeline?: Loose[];
  attack_path?: (string | Loose)[];
  mitre?: Loose[];
  recommendations?: unknown;
  limitations?: unknown;
  threat_score?: number;
  risk?: string;
  malware_detected?: number;
  evidence?: { file_name: string; sha256: string | null; file_size: number; file_type?: string | null }[];
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v && typeof v === "object" ? Object.values(v).filter(Boolean).join(" — ") : String(v ?? "")))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n+/)
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function ReportPage() {
  const { caseId } = useParams({ from: "/_authenticated/report/$caseId" });
  const { isAdmin, profile } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(caseQuery(caseId));
  const [busy, setBusy] = useState(false);

  const report = data?.report as
    | (NonNullable<typeof data>["report"] & {
        approval_status?: string;
        approved_at?: string | null;
        approval_note?: string | null;
      })
    | null
    | undefined;
  const content = (report?.content ?? {}) as ReportContent;
  const approval = report?.approval_status ?? "pending";
  const approved = approval === "approved";

  const timeline = Array.isArray(content.timeline) ? content.timeline : [];
  const attackPath = Array.isArray(content.attack_path) ? content.attack_path : [];
  const mitre = Array.isArray(content.mitre) ? content.mitre : [];
  const recommendations = asList(content.recommendations);
  const limitations = asList(content.limitations);
  const evidence = Array.isArray(content.evidence) ? content.evidence : [];

  async function decide(status: "approved" | "rejected") {
    if (!report) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({
          approval_status: status,
          approved_at: new Date().toISOString(),
          approved_by: profile?.id ?? null,
          approval_note:
            status === "approved"
              ? `Released for download by ${profile?.full_name ?? profile?.email ?? "administrator"}`
              : `Withheld by ${profile?.full_name ?? profile?.email ?? "administrator"}`,
        })
        .eq("id", report.id);
      if (error) throw error;
      await supabase.from("audit_logs").insert({
        user_id: profile?.id ?? "",
        action: `report.${status}`,
        entity: "report",
        entity_id: report.id,
        detail: report.title,
      });
      await qc.invalidateQueries({ queryKey: ["case", caseId] });
      await qc.invalidateQueries({ queryKey: ["reports"] });
      toast.success(`Report ${status}`);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!approved) {
      toast.error("Download unlocks after an administrator approves this report.");
      return;
    }
    window.print();
  }

  return (
    <AppShell
      title="Investigation report"
      subtitle={data?.caseRow?.title ?? ""}
      actions={
        <div className="mr-1 flex gap-2 print:hidden">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/case/$caseId" params={{ caseId }}>
              <ArrowLeft className="mr-1.5 size-4" /> Case
            </Link>
          </Button>
          {isAdmin && report && approval !== "approved" && (
            <Button size="sm" variant="outline" onClick={() => decide("approved")} disabled={busy}>
              {busy ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Check className="mr-1.5 size-4" />}
              Approve
            </Button>
          )}
          {isAdmin && report && approval !== "rejected" && (
            <Button size="sm" variant="outline" onClick={() => decide("rejected")} disabled={busy}>
              <X className="mr-1.5 size-4" /> Reject
            </Button>
          )}
          <Button size="sm" onClick={download} disabled={!report || !approved}>
            {approved ? <Download className="mr-1.5 size-4" /> : <Lock className="mr-1.5 size-4" />}
            Download PDF
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading report…</p>
      ) : !report ? (
        <div className="glass-panel p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No report has been generated for this case yet.
          </p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/case/$caseId" params={{ caseId }}>
              Open the case and run the pipeline
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div
            className={`glass-panel mb-4 flex flex-wrap items-center gap-3 p-4 print:hidden ${
              approved ? "border-success/40" : ""
            }`}
          >
            <StatusChip value={approval === "approved" ? "approved" : approval === "rejected" ? "rejected" : "pending"} />
            <p className="text-xs text-muted-foreground">
              {approved
                ? `Released for evidentiary use${report.approved_at ? ` on ${new Date(report.approved_at).toLocaleString()}` : ""}. Download is unlocked.`
                : approval === "rejected"
                  ? "An administrator withheld this report. Download stays locked until it is approved."
                  : "Awaiting administrator approval. The report is readable, but download is locked until it is signed off."}
            </p>
          </div>

          <article className="glass-panel mx-auto max-w-4xl space-y-8 p-8 print:border-0 print:bg-white print:text-black">
            <header className="border-b border-border pb-6">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="size-5" />
                <span className="font-display text-sm font-semibold uppercase tracking-[0.2em]">
                  ForensicAI
                </span>
              </div>
              <h1 className="mt-4 font-display text-3xl font-bold">{report.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">Case ID {caseId}</span>
                <span>·</span>
                <span className="font-mono">Generated {new Date(report.created_at).toLocaleString()}</span>
                {data?.caseRow?.risk && <StatusChip value={data.caseRow.risk} />}
                <span className="font-mono">
                  Threat score {content.threat_score ?? data?.caseRow?.threat_score ?? 0}/100
                </span>
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                <Meta label="Case type" value={data?.caseRow?.case_type ?? "—"} />
                <Meta label="Examiner" value={profile?.full_name ?? profile?.email ?? "—"} />
                <Meta label="Artefacts examined" value={String(evidence.length || data?.evidence.length || 0)} />
                <Meta
                  label="Approval"
                  value={
                    approved
                      ? `Approved${report.approved_at ? ` · ${new Date(report.approved_at).toLocaleString()}` : ""}`
                      : approval === "rejected"
                        ? "Rejected"
                        : "Pending administrator review"
                  }
                />
              </dl>
            </header>

            <Section title="1 · Executive summary">
              <p className="leading-relaxed">{report.executive_summary}</p>
            </Section>

            {content.technical_summary && (
              <Section title="2 · Technical analysis">
                <p className="whitespace-pre-line leading-relaxed">{content.technical_summary}</p>
              </Section>
            )}

            <Section title="3 · Agent examination record">
              {data?.outputs.length ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Agent</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Conf.</th>
                        <th className="px-3 py-2">Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border align-top">
                      {data.outputs.map((o) => (
                        <tr key={o.id}>
                          <td className="px-3 py-2 font-medium">{o.agent_name}</td>
                          <td className="px-3 py-2 font-mono text-xs uppercase">{o.status}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {Math.round((o.confidence ?? 0) * 100)}%
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{o.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No agent records stored for this case.</p>
              )}
            </Section>

            {!!timeline.length && (
              <Section title="4 · Reconstructed timeline">
                <ol className="space-y-3">
                  {timeline.map((t, i) => (
                    <li key={i} className="border-l border-primary/40 pl-4">
                      <p className="font-mono text-xs text-primary">
                        {str(t["time"]) || "unknown time"}
                        {t["phase"] ? ` · ${str(t["phase"])}` : ""}
                      </p>
                      <p className="text-sm">{str(t["event"])}</p>
                      {(t["source"] || t["confidence"] != null) && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {t["source"] ? `source: ${str(t["source"])}` : ""}
                          {t["confidence"] != null
                            ? `${t["source"] ? " · " : ""}confidence ${Math.round(Number(t["confidence"]) * 100)}%`
                            : ""}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {!!attackPath.length && (
              <Section title="5 · Attack path">
                <ol className="space-y-2">
                  {attackPath.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="font-mono text-primary">{String(i + 1).padStart(2, "0")}</span>
                      <span>
                        {typeof step === "string"
                          ? step
                          : `${str(step["from"])} → ${str(step["to"])}${step["technique"] ? ` (${str(step["technique"])})` : ""}`}
                      </span>
                    </li>
                  ))}
                </ol>
              </Section>
            )}

            {!!mitre.length && (
              <Section title="6 · MITRE ATT&CK mapping">
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Technique</th>
                        <th className="px-3 py-2">Tactic</th>
                        <th className="px-3 py-2">Supporting evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border align-top">
                      {mitre.map((m, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-mono text-xs text-primary">{str(m["id"])}</td>
                          <td className="px-3 py-2">{str(m["name"]) || str(m["technique"])}</td>
                          <td className="px-3 py-2 text-muted-foreground">{str(m["tactic"])}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {str(m["evidence"]) || str(m["rationale"])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {!!recommendations.length && (
              <Section title="7 · Recommendations">
                <ul className="list-disc space-y-1.5 pl-5 text-sm">
                  {recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="8 · Evidence inventory and chain of custody">
              {evidence.length || data?.evidence.length ? (
                <div className="overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-secondary/50 uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Artefact</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">SHA-256</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(evidence.length ? evidence : (data?.evidence ?? [])).map((e, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{e.file_name}</td>
                          <td className="px-3 py-2 font-mono">{(e.file_size / 1024).toFixed(0)} KB</td>
                          <td className="break-all px-3 py-2 font-mono text-muted-foreground">
                            {e.sha256 ?? "not computed"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No artefacts were submitted with this case.</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Artefacts were uploaded by the examiner into a private, access-controlled store. Each
                artefact was hashed with SHA-256 on ingest; the hashes above allow an independent
                examiner to verify integrity of the originals.
              </p>
            </Section>

            {!!limitations.length && (
              <Section title="9 · Limitations and assumptions">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                  {limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </Section>
            )}

            <Section title="10 · Examiner attestation">
              <p className="text-sm leading-relaxed text-muted-foreground">
                The findings above were produced by the ForensicAI multi-agent analysis system from
                the artefacts listed in section 8 and reviewed by the named examiner. No artefact was
                altered during examination. Statements are limited to what the submitted evidence
                supports; confidence values are stated per agent.
              </p>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <SignatureLine label="Examiner" value={profile?.full_name ?? profile?.email ?? ""} />
                <SignatureLine
                  label="Approving administrator"
                  value={approved ? (report.approval_note ?? "Approved") : "Pending approval"}
                />
              </div>
            </Section>

            <footer className="border-t border-border pt-5 text-xs text-muted-foreground">
              This report was produced by an AI multi-agent system and must be validated by a
              qualified forensic analyst before use in legal proceedings.
            </footer>
          </article>
        </>
      )}
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="uppercase tracking-wider text-muted-foreground">{label}:</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}

function SignatureLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="h-8 border-b border-border" />
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-xs">{value}</p>
    </div>
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
