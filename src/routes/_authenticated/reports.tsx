import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { reportsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Forensic Reports — ForensicAI" },
      { name: "description", content: "Browse generated forensic reports with executive summaries, risk bands and threat scores." },
      { property: "og:title", content: "Forensic Reports — ForensicAI" },
      { property: "og:description", content: "Generated forensic reports ready for legal review." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { data = [], isLoading } = useQuery(reportsQuery());
  const [q, setQ] = useState("");
  const filtered = data.filter((r) => r.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <AppShell title="Reports" subtitle="Court-ready documentation for completed investigations">
      <div className="glass-panel mb-4 flex items-center gap-2 p-3">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reports…"
          className="h-9 border-0 bg-transparent focus-visible:ring-0"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No reports yet. Reports are generated automatically when a pipeline completes.
          </p>
          <Button asChild className="mt-4">
            <Link to="/investigate">Start an investigation</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((r) => (
            <div key={r.id} className="glass-panel flex flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold">{r.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="ml-auto flex shrink-0 gap-1.5">
                  {r.cases?.risk && <StatusChip value={r.cases.risk} />}
                </div>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {r.executive_summary ?? "No executive summary recorded."}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">
                  score {r.cases?.threat_score ?? 0}
                </span>
                <Button asChild variant="ghost" size="sm" className="ml-auto">
                  <Link to="/report/$caseId" params={{ caseId: r.case_id }}>
                    Open report <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
