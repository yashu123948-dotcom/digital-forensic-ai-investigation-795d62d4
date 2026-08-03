import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AGENTS } from "@/lib/agents";

export const Route = createFileRoute("/_authenticated/about")({
  head: () => ({
    meta: [
      { title: "About ForensicAI" },
      { name: "description", content: "About the ForensicAI platform: architecture, agent design and responsible-use guidance." },
      { property: "og:title", content: "About ForensicAI" },
      { property: "og:description", content: "Architecture, agent design and responsible-use guidance." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <AppShell title="About" subtitle="Platform architecture and responsible use">
      <div className="glass-panel max-w-3xl p-8">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck className="size-5" />
          <span className="font-display text-sm font-semibold uppercase tracking-[0.2em]">
            ForensicAI
          </span>
        </div>
        <h2 className="mt-4 font-display text-2xl font-bold">
          Autonomous digital forensic investigation
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          ForensicAI coordinates {AGENTS.length} specialist AI agents across a single
          investigation pipeline. Evidence is stored in a private bucket, every finding is
          traceable to the artefact that produced it, and each case ends with a structured,
          exportable report.
        </p>

        <h3 className="mt-6 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Architecture
        </h3>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>React 19 + TanStack Start front end with server functions for all AI work.</li>
          <li>Postgres with row-level security; analysts see only their own cases.</li>
          <li>Private object storage for evidence, with per-user folder policies.</li>
          <li>LLM analysis through the Lovable AI gateway — no keys in the browser.</li>
          <li>Immutable audit logging on privileged and pipeline actions.</li>
        </ul>

        <h3 className="mt-6 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Responsible use
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Outputs are AI-generated and probabilistic. Treat every finding as an investigative
          lead requiring analyst validation, and preserve original evidence through your own
          chain-of-custody process.
        </p>
      </div>
    </AppShell>
  );
}
