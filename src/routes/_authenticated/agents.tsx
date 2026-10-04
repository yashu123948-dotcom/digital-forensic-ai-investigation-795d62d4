import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AGENTS, type AgentSpec } from "@/lib/agents";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({
    meta: [
      { title: "AI Agents — ForensicAI" },
      { name: "description", content: "The nine specialist forensic agents: purpose, inputs, outputs, workflow and technologies." },
      { property: "og:title", content: "AI Agents — ForensicAI" },
      { property: "og:description", content: "Nine specialist forensic AI agents and their workflows." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgentsPage,
});

const pad = (n: number) => String(n).padStart(2, "0");

function AgentsPage() {
  const total = AGENTS.length;
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const touchX = useRef<number | null>(null);

  const go = useCallback((d: number) => setActive((i) => (i + d + total) % total), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, open]);

  const agent = AGENTS[active];
  const spread = isMobile ? 70 : 190;
  const rot = isMobile ? 6 : 14;
  const visible = isMobile ? 1 : 3;

  return (
    <AppShell title="AI agents" subtitle="Nine specialists, each with a defined scope and output contract">
      <section
        className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card/60 to-background/80 px-4 pb-8 pt-10"
        aria-roledescription="carousel"
        aria-label="AI agents"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-primary) 1px, transparent 1px), linear-gradient(90deg, var(--color-primary) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="pointer-events-none absolute left-1/2 top-1/3 size-96 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />

        <div
          className="relative mx-auto h-[460px] sm:h-[480px]"
          style={{ perspective: "1400px" }}
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touchX.current = null;
          }}
        >
          {AGENTS.map((a, i) => {
            let off = i - active;
            if (off > total / 2) off -= total;
            if (off < -total / 2) off += total;
            const abs = Math.abs(off);
            const hidden = abs > visible;
            const center = off === 0;
            return (
              <div
                key={a.key}
                className="absolute left-1/2 top-0 w-[min(88vw,340px)] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{
                  transform: `translateX(calc(-50% + ${off * spread}px)) translateY(${abs * 18}px) translateZ(${-abs * 120}px) rotateY(${-off * rot}deg) rotateZ(${off * 2}deg) scale(${1 - abs * 0.08})`,
                  zIndex: 50 - abs,
                  opacity: hidden ? 0 : 1 - abs * 0.12,
                  filter: center ? "none" : `brightness(${1 - abs * 0.18})`,
                  pointerEvents: hidden ? "none" : "auto",
                }}
                aria-hidden={!center}
              >
                <AgentCard
                  agent={a}
                  index={i}
                  total={total}
                  center={center}
                  onSelect={() => (center ? setOpen(true) : setActive(i))}
                  onDetails={() => setOpen(true)}
                />
              </div>
            );
          })}
        </div>

        <div className="relative mt-2 flex items-center justify-center gap-5">
          <button
            onClick={() => go(-1)}
            aria-label="Previous agent"
            className="grid size-10 place-items-center rounded-full border border-border bg-card/80 text-foreground transition hover:border-primary hover:text-primary"
          >
            <ChevronLeft className="size-5" />
          </button>
          <div className="text-center">
            <p className="font-mono text-sm text-foreground">
              <span className="text-primary">{pad(active + 1)}</span> / {pad(total)}
            </p>
            <div className="mt-2 flex gap-1.5">
              {AGENTS.map((a, i) => (
                <button
                  key={a.key}
                  onClick={() => setActive(i)}
                  aria-label={`Show ${a.name}`}
                  className={`h-1 rounded-full transition-all ${i === active ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground"}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => go(1)}
            aria-label="Next agent"
            className="grid size-10 place-items-center rounded-full border border-border bg-card/80 text-foreground transition hover:border-primary hover:text-primary"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
        <p className="relative mt-3 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {agent.name} · use ← → or swipe
        </p>
      </section>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <AgentDetails agent={agent} />
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}

function AgentCard({
  agent: a,
  index,
  total,
  center,
  onSelect,
  onDetails,
}: {
  agent: AgentSpec;
  index: number;
  total: number;
  center: boolean;
  onSelect: () => void;
  onDetails: () => void;
}) {
  const conf = Math.round(a.baselineConfidence * 100);
  return (
    <div
      role="button"
      tabIndex={center ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onDetails()}
      className={`glass-panel flex h-[420px] cursor-pointer flex-col overflow-hidden rounded-2xl p-6 shadow-2xl transition-shadow ${
        center ? "border-primary/50 shadow-[0_0_40px_-8px_var(--color-primary)]" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="grid size-14 place-items-center rounded-xl border border-primary/30 bg-primary/12 text-primary">
          <a.icon className="size-7" />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>
      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">{a.role}</p>
      <h3 className="mt-1 font-display text-xl font-semibold leading-tight">{a.name}</h3>
      <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{a.purpose}</p>

      <div className="mt-4">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Baseline confidence</span>
          <span className="text-foreground">{conf}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${conf}%` }} />
        </div>
      </div>

      <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
        {a.workflow.slice(0, 2).map((s) => (
          <li key={s} className="flex gap-2">
            <span className="text-primary">›</span>
            <span className="line-clamp-1">{s}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDetails();
        }}
        tabIndex={center ? 0 : -1}
        className="mt-auto inline-flex items-center gap-1.5 self-start rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-primary transition hover:bg-primary/20"
      >
        View details <ArrowUpRight className="size-3.5" />
      </button>
    </div>
  );
}

function AgentDetails({ agent: a }: { agent: AgentSpec }) {
  const label = "font-mono text-[10px] uppercase tracking-wider text-primary";
  return (
    <div className="space-y-6">
      <SheetHeader className="text-left">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-primary/12 text-primary">
            <a.icon className="size-5" />
          </div>
          <div>
            <SheetTitle className="font-display">{a.name}</SheetTitle>
            <SheetDescription className="font-mono text-[10px] uppercase tracking-wider">{a.role}</SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div>
        <p className={label}>Overview</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{a.purpose}</p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          ~{Math.round(a.baselineConfidence * 100)}% baseline confidence
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className={label}>Input</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{a.input}</p>
        </div>
        <div>
          <p className={label}>Output</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{a.output}</p>
        </div>
      </div>
      <div>
        <p className={label}>Workflow</p>
        <ol className="mt-2 space-y-2">
          {a.workflow.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-muted-foreground">
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-primary/40 font-mono text-[10px] text-primary">
                {i + 1}
              </span>
              {s}
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className={label}>Technologies</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.technologies.map((t) => (
            <span key={t} className="rounded border border-border bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className={label}>Example result</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{a.exampleResult}</p>
      </div>
    </div>
  );
}
