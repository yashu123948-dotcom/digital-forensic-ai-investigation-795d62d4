import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  ArrowRight,
  Cpu,
  Radar,
  FileText,
  Lock,
  Workflow,
  Gauge,
} from "lucide-react";
import { ClientOnly } from "@/components/ClientOnly";
import { AGENTS } from "@/lib/agents";
import { Button } from "@/components/ui/button";

const CyberScene = lazy(() => import("@/components/three/CyberScene"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ForensicAI — Autonomous Digital Forensics Platform" },
      {
        name: "description",
        content:
          "ForensicAI runs nine specialist AI agents to collect evidence, detect malware, reconstruct attack timelines and generate court-ready forensic reports.",
      },
      { property: "og:title", content: "ForensicAI — Autonomous Digital Forensics Platform" },
      {
        property: "og:description",
        content:
          "Nine specialist AI agents for evidence collection, malware detection, timeline reconstruction and court-ready reporting.",
      },
    ],
  }),
  component: Landing,
});

const CAPABILITIES = [
  {
    icon: Workflow,
    title: "Automated pipelines",
    body: "Upload evidence and the orchestrator dispatches every downstream agent in sequence, with full audit trails.",
  },
  {
    icon: Radar,
    title: "Threat intelligence",
    body: "IOCs are enriched and mapped to MITRE ATT&CK techniques so findings land in a language your SOC already speaks.",
  },
  {
    icon: Gauge,
    title: "Quantified risk",
    body: "Every case gets a 0–100 threat score, a risk band and per-finding confidence — no unexplained verdicts.",
  },
  {
    icon: FileText,
    title: "Court-ready reports",
    body: "Executive summary, technical detail, timeline, attack path and limitations, exportable for legal review.",
  },
  {
    icon: Lock,
    title: "Locked-down access",
    body: "Administrator-approved accounts, role-based permissions, private evidence storage and immutable audit logs.",
  },
  {
    icon: Cpu,
    title: "Explainable agents",
    body: "Each agent publishes its reasoning, evidence references and recommendations alongside its findings.",
  },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 cyber-grid opacity-50" />

      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/15 neon-border">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">ForensicAI</span>
          <nav className="ml-8 hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#capabilities" className="hover:text-foreground">
              Capabilities
            </a>
            <a href="#agents" className="hover:text-foreground">
              Agents
            </a>
            <a href="#pipeline" className="hover:text-foreground">
              Pipeline
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth">Request access</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-0 h-[560px]">
          <ClientOnly>
            <CyberScene />
          </ClientOnly>
        </div>
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-24 text-center">
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-fit rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 font-mono text-[11px] uppercase tracking-[0.22em] text-primary"
          >
            Multi-agent forensic intelligence
          </motion.p>
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] sm:text-6xl"
          >
            Investigate incidents at <span className="neon-text">machine speed</span>
          </motion.h1>
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg"
          >
            ForensicAI turns raw artefacts into a defensible investigation: nine specialist
            agents parse your evidence, correlate the signals, score the threat and hand you a
            report you can put in front of a court.
          </motion.p>
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-9 flex flex-wrap justify-center gap-3"
          >
            <Button asChild size="lg">
              <Link to="/auth">
                Launch console <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#agents">Meet the agents</a>
            </Button>
          </motion.div>

          <div className="mx-auto mt-20 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["9", "Specialist agents"],
              ["<3 min", "Typical pipeline"],
              ["0–100", "Threat scoring"],
              ["MITRE", "ATT&CK mapped"],
            ].map(([v, l]) => (
              <div key={l} className="glass-panel p-4">
                <p className="font-display text-xl font-bold neon-text">{v}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="relative mx-auto max-w-6xl px-5 py-20">
        <SectionHeading
          kicker="Platform"
          title="Everything a forensic team needs, in one console"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => (
            <motion.div
              key={c.title}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.04 }}
              className="glass-panel group p-6 transition-colors hover:border-primary/40"
            >
              <div className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary transition-transform group-hover:scale-110">
                <c.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Agents */}
      <section id="agents" className="relative mx-auto max-w-6xl px-5 py-20">
        <SectionHeading
          kicker="Multi-agent system"
          title="Nine agents, one chain of custody"
          body="Each agent owns a narrow slice of the investigation and reports its own confidence, so you always know which conclusions to trust."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.key}
              initial={false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: (i % 3) * 0.05 }}
              className="glass-panel p-6"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary">
                  <agent.icon className="size-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-semibold">{agent.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {agent.role}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{agent.purpose}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {agent.technologies.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="relative mx-auto max-w-4xl px-5 py-20">
        <SectionHeading kicker="Workflow" title="From artefact to court-ready report" />
        <ol className="mt-10 space-y-4">
          {[
            ["Create the case", "Describe the incident and classify the investigation type."],
            ["Upload evidence", "Logs, memory dumps, disk artefacts and network captures land in private storage."],
            ["Run the pipeline", "The orchestrator dispatches all nine agents and streams progress."],
            ["Review findings", "Inspect per-agent reasoning, timelines, IOCs and MITRE mappings."],
            ["Export the report", "Publish an executive and technical report for legal review."],
          ].map(([title, body], i) => (
            <motion.li
              key={title}
              initial={false}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-panel flex gap-4 p-5"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="font-display font-semibold">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </section>

      <section className="relative mx-auto max-w-4xl px-5 pb-24">
        <div className="glass-panel relative overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/20 blur-[100px]" />
          <h2 className="relative font-display text-3xl font-bold">
            Bring your next investigation online
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-muted-foreground">
            Request an analyst account. An administrator reviews every request before console
            access is granted.
          </p>
          <Button asChild size="lg" className="relative mt-7">
            <Link to="/auth">
              Request access <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <footer className="relative border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 text-center text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <span className="font-display text-sm font-semibold text-foreground">ForensicAI</span>
          </div>
          <p>Autonomous digital forensic investigation platform. Findings are AI-assisted and require analyst validation.</p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-primary">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
      {body && <p className="mt-3 text-muted-foreground">{body}</p>}
    </div>
  );
}
