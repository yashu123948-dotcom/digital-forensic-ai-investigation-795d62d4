import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FolderOpen,
  ShieldAlert,
  Bug,
  Timer,
  ArrowRight,
  Plus,
  Activity,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { casesQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "SOC Dashboard — ForensicAI" },
      {
        name: "description",
        content: "Live overview of investigations, threat scores, malware detections and agent activity.",
      },
      { property: "og:title", content: "SOC Dashboard — ForensicAI" },
      { property: "og:description", content: "Live overview of forensic investigations and threats." },
    ],
  }),
  component: Dashboard,
});

const RISK_COLORS: Record<string, string> = {
  low: "var(--success)",
  medium: "var(--warning)",
  high: "var(--danger)",
  critical: "var(--critical)",
};

function Dashboard() {
  const { profile } = useAuth();
  const { data: cases = [], isLoading } = useQuery(casesQuery());

  const completed = cases.filter((c) => c.status === "completed");
  const malware = cases.reduce((sum, c) => sum + (c.malware_detected ?? 0), 0);
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, c) => s + (c.threat_score ?? 0), 0) / completed.length)
    : 0;
  const critical = cases.filter((c) => c.risk === "critical" || c.risk === "high").length;

  const trend = [...completed]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-12)
    .map((c) => ({
      name: new Date(c.created_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: c.threat_score ?? 0,
    }));

  const riskData = ["low", "medium", "high", "critical"]
    .map((r) => ({ name: r, value: cases.filter((c) => c.risk === r).length }))
    .filter((d) => d.value > 0);

  return (
    <AppShell
      title={`Welcome back, ${profile?.full_name?.split(" ")[0] ?? "analyst"}`}
      subtitle="Security operations overview"
      actions={
        <Button asChild size="sm" className="mr-1">
          <Link to="/investigate">
            <Plus className="mr-1.5 size-4" /> New investigation
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={FolderOpen} label="Total cases" value={cases.length} hint={`${completed.length} completed`} />
        <Stat icon={ShieldAlert} label="High / critical" value={critical} hint="Requires attention" tone="danger" />
        <Stat icon={Bug} label="Malware detected" value={malware} hint="Across all cases" tone="warning" />
        <Stat icon={Timer} label="Avg threat score" value={avgScore} hint="0–100 scale" tone="primary" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
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
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    fill="url(#ts)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
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
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart />
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel mt-4 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Activity className="size-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Recent investigations</h2>
          <Button asChild variant="ghost" size="sm" className="ml-auto">
            <Link to="/reports">
              All reports <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading cases…</p>
        ) : cases.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No investigations yet. Create your first case to run the agent pipeline.
            </p>
            <Button asChild className="mt-4">
              <Link to="/investigate">Start an investigation</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {cases.slice(0, 8).map((c) => (
              <Link
                key={c.id}
                to="/case/$caseId"
                params={{ caseId: c.id }}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-secondary/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {c.case_type} · {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="hidden font-mono text-xs text-muted-foreground sm:block">
                  score {c.threat_score ?? 0}
                </span>
                <StatusChip value={c.risk ?? "info"} />
                <StatusChip value={c.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
}: {
  icon: typeof FolderOpen;
  label: string;
  value: number;
  hint: string;
  tone?: "primary" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "bg-danger/12 text-danger"
      : tone === "warning"
        ? "bg-warning/12 text-warning"
        : "bg-primary/12 text-primary";
  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
        </div>
        <div className={`grid size-10 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Run an investigation to populate analytics.
    </div>
  );
}
