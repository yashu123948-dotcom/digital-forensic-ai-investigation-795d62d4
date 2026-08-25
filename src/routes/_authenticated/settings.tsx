import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { StatusChip } from "@/components/StatusChip";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ForensicAI" },
      { name: "description", content: "Account details, role and platform preferences for your ForensicAI console." },
      { property: "og:title", content: "Settings — ForensicAI" },
      { property: "og:description", content: "Account details and console preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, isAdmin, roleLoaded } = useAuth();
  return (
    <AppShell title="Settings" subtitle="Account and access details">
      <div className="glass-panel max-w-2xl divide-y divide-border">
        <Row label="Name" value={profile?.full_name ?? "—"} />
        <Row label="Email" value={profile?.email ?? "—"} />
        <Row label="Organisation" value={profile?.organization ?? "—"} />
        <Row label="Role" value={!roleLoaded ? "Checking role…" : isAdmin ? "Administrator" : "Analyst"} />
        <div className="flex items-center gap-4 px-5 py-4">
          <p className="w-40 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
            Account status
          </p>
          <StatusChip value={profile?.status ?? "pending"} />
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-xs text-muted-foreground">
        Contact an administrator to change your role or deactivate this account. All access
        changes are written to the audit log.
      </p>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <p className="w-40 shrink-0 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate text-sm">{value}</p>
    </div>
  );
}
