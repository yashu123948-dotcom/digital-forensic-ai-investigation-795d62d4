import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { casesQuery, outputsQuery } from "@/lib/queries";
import { AGENTS } from "@/lib/agents";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — ForensicAI" },
      { name: "description", content: "Agent performance, case throughput and confidence analytics for your forensic operations." },
      { property: "og:title", content: "Analytics — ForensicAI" },
      { property: "og:description", content: "Agent performance and case throughput analytics." },
    ],
  }),
  component: Analytics,
});

function Analytics() {
  const { data: cases = [] } = useQuery(casesQuery());
  const { data: outputs = [] } = useQuery(outputsQuery());

  const byType = Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => {
      acc[c.case_type] = (acc[c.case_type] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value }));

  const confidence = AGENTS.map((a) => {
    const rows = outputs.filter((o) => o.agent_key === a.key);
    const avg = rows.length
      ? Math.round((rows.reduce((s, r) => s + (r.confidence ?? 0), 0) / rows.length) * 100)
      : 0;
    return { agent: a.name.replace(/ Agent$/, ""), value: avg };
  });

  const tooltipStyle = {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
  };

  return (
    <AppShell title="Analytics" subtitle="Operational metrics across cases and agents">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-panel p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Cases by investigation type
          </h2>
          <div className="mt-4 h-72">
            {byType.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} interval={0} angle={-18} height={60} textAnchor="end" />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Average agent confidence
          </h2>
          <div className="mt-4 h-72">
            {outputs.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={confidence} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="agent" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <Radar dataKey="value" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.28} />
                  <Tooltip contentStyle={tooltipStyle} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel mt-4 grid gap-4 p-5 sm:grid-cols-3">
        <Kpi label="Agent runs recorded" value={outputs.length} />
        <Kpi
          label="Mean pipeline duration"
          value={`${
            cases.filter((c) => c.duration_seconds).length
              ? Math.round(
                  cases.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) /
                    cases.filter((c) => c.duration_seconds).length,
                )
              : 0
          }s`}
        />
        <Kpi
          label="Completion rate"
          value={`${
            cases.length
              ? Math.round((cases.filter((c) => c.status === "completed").length / cases.length) * 100)
              : 0
          }%`}
        />
      </div>
    </AppShell>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Not enough data yet.
    </div>
  );
}
