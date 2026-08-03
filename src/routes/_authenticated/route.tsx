import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || (!session && typeof window !== "undefined")) {
    return (
      <div className="grid min-h-screen place-items-center bg-background cyber-grid">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Verifying credentials
          </p>
        </div>
      </div>
    );
  }

  if (profile && profile.status !== "approved") {
    const rejected = profile.status === "rejected" || profile.status === "deactivated";
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 cyber-grid">
        <div className="glass-panel max-w-md p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-warning/15">
            {rejected ? (
              <ShieldAlert className="size-7 text-danger" />
            ) : (
              <Clock className="size-7 text-warning" />
            )}
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold">
            {rejected ? "Access revoked" : "Awaiting administrator approval"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {rejected
              ? "This account is no longer authorised to access the platform. Contact your administrator."
              : "Your account has been created and is pending review. An administrator must approve it before you can open investigations."}
          </p>
          <p className="mt-4 font-mono text-xs text-muted-foreground">{profile.email}</p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth", replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
