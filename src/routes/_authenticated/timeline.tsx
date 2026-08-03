import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock4 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { reportsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/timeline")({
  head: () => ({
    meta: [
      { title: "Incident Timeline — ForensicAI" },
      { name: "description", content: "Chronological reconstruction of events across all completed investigations." },
      { property: "og:title", content: "Incident Timeline — ForensicAI" },
      { property: "og:description", content: "Chronological event reconstruction across investigations." },
    ],
  }),
  component: TimelinePage,
});

interface Entry {
  time?: string;
  event?: string;
  source?: string;
}

function TimelinePage() {
  const { data = [], isLoading } = useQuery(reportsQuery());

  const events = data.flatMap((r) => {
    const content = (r.content ?? {}) as { timeline?: Entry[] };
    return (content.timeline ?? []).map((e) => ({
      ...e,
      caseId: r.case_id,
      caseTitle: r.cases?.title ?? "Case",
      risk: r.cases?.risk ?? null,
    }));
  });

  return (
    <AppShell title="Timeline" subtitle="Event reconstruction across every investigation">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading timeline…</p>
      ) : events.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <Clock4 className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No reconstructed events yet — run an investigation to populate the timeline.
          </p>
        </div>
      ) : (
        <div className="glass-panel p-6">
          <ol className="relative space-y-6 border-l border-border pl-6">
            {events.map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[1.9rem] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-primary/15" />
                <p className="font-mono text-xs text-primary">{e.time ?? "unknown time"}</p>
                <p className="mt-1 text-sm">{e.event}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Link
                    to="/case/$caseId"
                    params={{ caseId: e.caseId }}
                    className="font-mono hover:text-primary"
                  >
                    {e.caseTitle}
                  </Link>
                  {e.source && <span className="font-mono">source: {e.source}</span>}
                  {e.risk && <StatusChip value={e.risk} />}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </AppShell>
  );
}
