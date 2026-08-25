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

  const completed = cases.filter((c) => c.status === "completed");
  const malware = cases.reduce((s, c) => s + (c.malware_detected ?? 0), 0);
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, c) => s + (c.threat_score ?? 0), 0) / completed.length)
    : 0;
  const critical = cases.filter((c) => c.risk === "critical" || c.risk === "high").length;

  const trend = [...completed]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-12)
    .map((c) => ({
      name: new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: c.threat_score ?? 0,
    }));

  const riskData = (["low", "medium", "high", "critical"] as const)
    .map((r) => ({ name: r, value: cases.filter((c) => c.risk === r).length }))
    .filter((d) => d.value > 0);

  return (
    <AppShell title="Analytics" subtitle="Operational metrics across cases and agents">
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total cases" value={cases.length} />
        <Kpi label="High / critical" value={critical} />
        <Kpi label="Malware detected" value={malware} />
        <Kpi label="Avg threat score" value={avgScore} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <div className="glass-panel p-5 lg:col-span-2">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Threat score trend
          </h2>
          <div className="mt-4 h-64">
            {trend.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="ts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} fill="url(#ts)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </div>

        <div className="glass-panel p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Risk distribution
          </h2>
          <div className="mt-4 h-64">
            {riskData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    stroke="var(--background)"
                  >
                    {riskData.map((d) => (
                      <Cell key={d.name} fill={RISK_COLORS[d.name]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty />
            )}
          </div>
        </div>
      </div>

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
