import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck, Lock, Mail, User, Building2, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Secure Access — ForensicAI Console" },
      {
        name: "description",
        content:
          "Sign in to the ForensicAI console or request an analyst account. Administrator-approved access only.",
      },
      { property: "og:title", content: "Secure Access — ForensicAI Console" },
      {
        property: "og:description",
        content: "Administrator-approved access to the ForensicAI investigation console.",
      },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  organization: z.string().trim().max(120).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Access granted");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      fullName: form.get("fullName"),
      organization: form.get("organization") || undefined,
    });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin + "/auth",
        data: {
          full_name: parsed.data.fullName,
          organization: parsed.data.organization ?? null,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Account created — check your email to confirm, then await approval.");
    } else {
      toast.success("Account created. Awaiting administrator approval.");
      navigate({ to: "/dashboard", replace: true });
    }
  }

  async function handleGoogle() {
    const { lovable } = await import("@/integrations/lovable/index");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email access.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="pointer-events-none fixed inset-0 cyber-grid opacity-40" />

      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border p-12 lg:flex">
        <div className="pointer-events-none absolute -left-20 top-10 size-[420px] rounded-full bg-primary/15 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 size-[360px] rounded-full bg-violet/15 blur-[130px]" />
        <Link to="/" className="relative flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to overview
        </Link>
        <div className="relative">
          <div className="mb-6 grid size-14 place-items-center rounded-xl bg-primary/15 neon-border">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <h1 className="max-w-md font-display text-4xl font-bold leading-tight">
            Autonomous Digital Forensic Investigation Platform
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Nine specialist AI agents collect evidence, parse telemetry, reconstruct timelines
            and produce court-ready reports — with explicit confidence on every finding.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
            {[
              ["9", "AI agents"],
              ["100%", "Audit logged"],
              ["RBAC", "Access control"],
            ].map(([v, l]) => (
              <div key={l} className="glass-panel p-4">
                <p className="font-display text-2xl font-bold neon-text">{v}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {l}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative font-mono text-xs text-muted-foreground">
          "The quieter you become, the more you are able to hear." — security adage
        </p>
      </div>

      {/* Form panel */}
      <div className="relative grid place-items-center px-5 py-12">
        <div className="glass-panel w-full max-w-md p-8">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="grid size-9 place-items-center rounded-lg bg-primary/15 neon-border">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <p className="font-display text-lg font-bold">ForensicAI</p>
          </div>

          <h2 className="font-display text-2xl font-semibold">Secure console access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Analyst accounts require administrator approval before activation.
          </p>

          <Tabs defaultValue="signin" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Request access</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Field
                  id="email"
                  name="email"
                  label="Work email"
                  type="email"
                  icon={Mail}
                  error={errors["email"]}
                  autoComplete="email"
                />
                <Field
                  id="password"
                  name="password"
                  label="Password"
                  type="password"
                  icon={Lock}
                  error={errors["password"]}
                  autoComplete="current-password"
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Authenticate
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Field
                  id="fullName"
                  name="fullName"
                  label="Full name"
                  icon={User}
                  error={errors["fullName"]}
                  autoComplete="name"
                />
                <Field
                  id="organization"
                  name="organization"
                  label="Organisation (optional)"
                  icon={Building2}
                  error={errors["organization"]}
                  autoComplete="organization"
                />
                <Field
                  id="su-email"
                  name="email"
                  label="Work email"
                  type="email"
                  icon={Mail}
                  error={errors["email"]}
                  autoComplete="email"
                />
                <Field
                  id="su-password"
                  name="password"
                  label="Password (min 8 characters)"
                  type="password"
                  icon={Lock}
                  error={errors["password"]}
                  autoComplete="new-password"
                />
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Request analyst account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={handleGoogle}>
            Continue with Google
          </Button>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            The first account created on a fresh deployment is provisioned as the platform
            administrator. All later accounts start in a pending state.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  icon: Icon,
  error,
  autoComplete,
}: {
  id: string;
  name: string;
  label: string;
  type?: string | undefined;
  icon: typeof Mail;
  error?: string | undefined;
  autoComplete?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          className="pl-9"
          aria-invalid={!!error}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

