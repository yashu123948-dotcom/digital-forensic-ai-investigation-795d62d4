import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/help")({
  head: () => ({
    meta: [
      { title: "Help & Playbooks — ForensicAI" },
      { name: "description", content: "How to run an investigation, what each agent needs, and how to read confidence scores." },
      { property: "og:title", content: "Help & Playbooks — ForensicAI" },
      { property: "og:description", content: "Guides for running investigations in ForensicAI." },
    ],
  }),
  component: HelpPage,
});

const FAQ = [
  ["What evidence should I upload?", "Text-based artefacts give the best results: system and application logs, EDR exports, JSON/CSV telemetry, email headers and memory strings. Binary files are hashed and inventoried, but only text content is parsed."],
  ["How long does a pipeline take?", "Most investigations complete in under three minutes. Duration is recorded on the case and shown in analytics."],
  ["How should I read confidence?", "Each agent reports its own confidence between 0 and 1. Anything under 0.6 should be treated as a lead, not a conclusion."],
  ["Can I re-run an investigation?", "Yes. Re-running replaces previous agent output and regenerates the report for that case."],
  ["Is the report court-ready?", "The report is structured for legal review, but every AI-generated finding must be validated by a qualified analyst before submission."],
];

function HelpPage() {
  return (
    <AppShell title="Help" subtitle="Playbooks and frequently asked questions">
      <div className="grid max-w-3xl gap-3">
        {FAQ.map(([q, a]) => (
          <div key={q} className="glass-panel p-5">
            <p className="font-display text-sm font-semibold">{q}</p>
            <p className="mt-2 text-sm text-muted-foreground">{a}</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
