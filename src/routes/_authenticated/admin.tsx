import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ProfileRow, AuditRow } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — ForensicAI" },
      { name: "description", content: "Approve analyst accounts, manage access and review the platform audit log." },
      { property: "og:title", content: "Admin Panel — ForensicAI" },
      { property: "og:description", content: "Approve accounts and review the audit log." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["admin-logs"],
    enabled: isAdmin,
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: "approved" | "rejected" | "deactivated") {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success(`Account ${status}`);
  }

  if (!isAdmin) {
    return (
      <AppShell title="Admin panel" subtitle="Restricted">
        <div className="glass-panel p-10 text-center text-sm text-muted-foreground">
          Administrator privileges are required to view this page.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin panel" subtitle="Account approvals and audit trail">
      <div className="glass-panel overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Users className="size-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Accounts</h2>
        </div>
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.full_name ?? u.email}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{u.email}</p>
              </div>
              <StatusChip value={u.status} />
              {u.status !== "approved" && (
                <Button size="sm" onClick={() => setStatus(u.id, "approved")}>
                  Approve
                </Button>
              )}
              {u.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "rejected")}>
                  Reject
                </Button>
              )}
              {u.status === "approved" && (
                <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "deactivated")}>
                  Deactivate
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel mt-4 overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <ShieldCheck className="size-4 text-primary" />
          <h2 className="font-display text-sm font-semibold">Audit log</h2>
        </div>
        {logs.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((l) => (
              <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs">
                <span className="font-mono text-primary">{l.action}</span>
                <span className="text-muted-foreground">{l.detail}</span>
                <span className="ml-auto font-mono text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
