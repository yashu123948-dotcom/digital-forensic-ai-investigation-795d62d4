import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AccountStatus = "pending" | "approved" | "rejected" | "deactivated";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  organization: string | null;
  status: AccountStatus;
  created_at: string;
}

interface AuthValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** true once the role lookup for the current user has resolved successfully */
  roleLoaded: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | undefined>(undefined);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const activeRef = useRef(true);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const loadedUserRef = useRef<string | null>(null);

  async function loadProfile(userId: string, force = false): Promise<void> {
    // one lookup at a time; skip duplicates for the same user unless forced
    if (inFlightRef.current) return inFlightRef.current;
    if (!force && loadedUserRef.current === userId) return;

    const run = (async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        const [profileRes, rolesRes] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", userId),
        ]);

        if (!activeRef.current) return;

        // Never downgrade known state because of a transient failure — retry.
        if (profileRes.error || rolesRes.error) {
          await sleep(400 * 2 ** attempt);
          continue;
        }

        setProfile((profileRes.data as Profile | null) ?? null);
        setIsAdmin((rolesRes.data ?? []).some((r) => r.role === "admin"));
        setRoleLoaded(true);
        loadedUserRef.current = userId;
        return;
      }
    })();

    inFlightRef.current = run;
    try {
      await run;
    } finally {
      inFlightRef.current = null;
    }
  }

  useEffect(() => {
    activeRef.current = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!activeRef.current) return;
      setSession(next);
      if (next?.user) {
        const force = event === "USER_UPDATED";
        setTimeout(() => {
          void loadProfile(next.user.id, force);
        }, 0);
      } else if (event === "SIGNED_OUT") {
        loadedUserRef.current = null;
        setProfile(null);
        setIsAdmin(false);
        setRoleLoaded(false);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!activeRef.current) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      if (activeRef.current) setLoading(false);
    });

    const onFocus = () => {
      const uid = loadedUserRef.current;
      if (uid) void loadProfile(uid, true);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      activeRef.current = false;
      window.removeEventListener("focus", onFocus);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      roleLoaded,
      loading,
      refresh: async () => {
        if (session?.user) await loadProfile(session.user.id, true);
      },
      signOut: async () => {
        await supabase.auth.signOut();
        loadedUserRef.current = null;
        setProfile(null);
        setIsAdmin(false);
        setRoleLoaded(false);
      },
    }),
    [session, profile, isAdmin, roleLoaded, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
