import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Home,
  Cpu,
  FolderPlus,
  Boxes,
  Clock4,
  Globe2,
  FileText,
  BarChart3,
  Settings,
  LifeBuoy,
  Info,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Search,
  Bell,
  Sun,
  Moon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { casesQuery } from "@/lib/queries";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AssistantDock } from "@/components/AssistantDock";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/home", label: "Home", icon: Home },
  { to: "/agents", label: "AI Agents", icon: Cpu },
  { to: "/investigate", label: "New Investigation", icon: FolderPlus },
  { to: "/evidence", label: "Evidence Explorer", icon: Boxes },
  { to: "/timeline", label: "Timeline", icon: Clock4 },
  { to: "/threat-intel", label: "Threat Intelligence", icon: Globe2 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const FOOTER_NAV = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help", icon: LifeBuoy },
  { to: "/about", label: "About", icon: Info },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [light, setLight] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: cases = [] } = useQuery(casesQuery());

  const results = cases
    .filter((c) =>
      `${c.title} ${c.case_type}`.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .slice(0, 8);
  const notifications = [...cases]
    .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at))
    .slice(0, 6);

  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setBellOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", light);
  }, [light]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setBellOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        navigate({ to: "/investigate" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name || profile?.email || "A")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 cyber-grid opacity-40" />
      <div className="pointer-events-none fixed -top-40 left-1/3 size-[520px] rounded-full bg-primary/10 blur-[140px]" />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="grid size-9 place-items-center rounded-lg bg-primary/15 neon-border">
            <ShieldCheck className="size-5 text-primary" />
          </div>
          <div className="leading-tight">
            <p className="font-display text-base font-bold tracking-tight">ForensicAI</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              SOC Console
            </p>
          </div>
          <button
            className="ml-auto lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => (
            <SideLink key={item.to} {...item} active={pathname === item.to} />
          ))}
          {isAdmin && (
            <SideLink
              to="/admin"
              label="Admin Panel"
              icon={ShieldCheck}
              active={pathname === "/admin"}
            />
          )}
          <div className="!my-4 h-px bg-sidebar-border" />
          {FOOTER_NAV.map((item) => (
            <SideLink key={item.to} {...item} active={pathname === item.to} />
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-sidebar-accent/60 px-3 py-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/20 font-mono text-xs font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-medium">
                {profile?.full_name || profile?.email}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {isAdmin ? "Administrator" : "Analyst"}
              </p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="relative lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {actions}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              aria-label="Global search"
            >
              <Search className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLight((v) => !v)}
              aria-label="Toggle theme"
            >
              {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                onClick={() => setBellOpen((v) => !v)}
              >
                <Bell className="size-4" />
                {notifications.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />
                )}
              </Button>
              {bellOpen && (
                <div className="absolute right-0 top-11 z-50 w-72 rounded-lg border border-border bg-popover p-2 shadow-xl">
                  <p className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Recent activity
                  </p>
                  {notifications.length === 0 ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">Nothing new yet.</p>
                  ) : (
                    notifications.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setBellOpen(false);
                          navigate({ to: "/case/$caseId", params: { caseId: c.id } });
                        }}
                        className="flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-secondary/60"
                      >
                        <span className="truncate text-xs font-medium">{c.title}</span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {c.status} · {new Date(c.updated_at ?? c.created_at).toLocaleString()}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {searchOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-start justify-center bg-background/70 p-4 pt-28 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          >
            <div
              className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="size-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cases by title or type…"
                  className="h-12 w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="max-h-72 overflow-y-auto p-2">
                {results.length === 0 ? (
                  <p className="px-2 py-4 text-xs text-muted-foreground">No matching cases.</p>
                ) : (
                  results.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSearchOpen(false);
                        setQuery("");
                        navigate({ to: "/case/$caseId", params: { caseId: c.id } });
                      }}
                      className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-secondary/60"
                    >
                      <span className="truncate text-sm">{c.title}</span>
                      <span className="font-mono text-[10px] uppercase text-muted-foreground">
                        {c.case_type} · {c.status}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
                Tip: press Esc to close · artefact search lives in the Evidence Explorer.
              </div>
            </div>
          </div>
        )}
        <main className="relative p-4 sm:p-6">{children}</main>
      </div>

      <AssistantDock />
    </div>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
        active
          ? "bg-primary/12 font-medium text-primary neon-border"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}
