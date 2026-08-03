import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { AGENTS } from "@/lib/agents";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "AI Agents — ForensicAI" },
      { name: "description", content: "The nine specialist forensic agents: purpose, inputs, outputs, workflow and technologies." },
      { property: "og:title", content: "AI Agents — ForensicAI" },
      { property: "og:description", content: "Nine specialist forensic AI agents and their workflows." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  return (
    <AppShell title="AI agents" subtitle="Nine specialists, each with a defined scope and output contract">
      <div className="grid gap-4 lg:grid-cols-2">
        {AGENTS.map((a) => (
          <div key={a.key} className="glass-panel p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-lg bg-primary/12 text-primary">
                <a.icon className="size-5" />
              </div>
              <div>
                <p className="font-display text-base font-semibold">{a.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {a.role}
                </p>
              </div>
              <span className="ml-auto font-mono text-xs text-muted-foreground">
                ~{Math.round(a.baselineConfidence * 100)}% conf.
              </span>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{a.purpose}</p>

            <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-mono uppercase tracking-wider text-primary">Input</dt>
                <dd className="mt-1 text-muted-foreground">{a.input}</dd>
              </div>
              <div>
                <dt className="font-mono uppercase tracking-wider text-primary">Output</dt>
                <dd className="mt-1 text-muted-foreground">{a.output}</dd>
              </div>
            </dl>

            <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-primary">Workflow</p>
            <ol className="mt-1.5 space-y-1 text-xs text-muted-foreground">
              {a.workflow.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-primary">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.technologies.map((t) => (
                <span
                  key={t}
                  className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
