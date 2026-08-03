import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Boxes, Cpu } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { casesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Workspace Home — ForensicAI" },
      { name: "description", content: "Your forensic workspace: recent cases and quick actions." },
      { property: "og:title", content: "Workspace Home — ForensicAI" },
      { property: "og:description", content: "Your forensic workspace and quick actions." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { data: cases = [] } = useQuery(casesQuery());

  return (
    <AppShell title="Workspace" subtitle="Jump back into your investigations">
      <div className="grid gap-4 sm:grid-cols-3">
        <QuickAction to="/investigate" icon={Plus} title="New investigation" body="Create a case and run the pipeline." />
        <QuickAction to="/evidence" icon={Boxes} title="Evidence explorer" body="Search artefacts and hashes." />
        <QuickAction to="/agents" icon={Cpu} title="Agent catalogue" body="Review how each agent works." />
      </div>

      <div className="glass-panel mt-4 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <FileText className="size-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Your cases</h2>
        </div>
        {cases.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No cases yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {cases.map((c) => (
              <Link
                key={c.id}
                to="/case/$caseId"
                params={{ caseId: c.id }}
                className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-secondary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{c.case_type}</p>
                </div>
                <StatusChip value={c.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  body,
}: {
  to: string;
  icon: typeof Plus;
  title: string;
  body: string;
}) {
  return (
    <Link to={to} className="glass-panel group p-5 transition-colors hover:border-primary/40">
      <div className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary transition-transform group-hover:scale-110">
        <Icon className="size-5" />
      </div>
      <p className="mt-3 font-display text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </Link>
  );
}
