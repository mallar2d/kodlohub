"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  supabase: ReturnType<typeof createClient>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  supabase: {} as ReturnType<typeof createClient>,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabase] = useState(() => createClient());
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    // Ensure a profiles row exists for the signed-in user. Without this a user
    // gets a session but never appears in /users or gets a profile page.
    // Runs once per user id; the route upserts, so repeat calls are harmless.
    function ensureProfile(nextUser: User | null) {
      if (!nextUser) {
        syncedRef.current = null;
        return;
      }
      if (syncedRef.current === nextUser.id) return;
      syncedRef.current = nextUser.id;
      fetch("/api/sync-profile", { method: "POST" }).catch(() => {});
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      ensureProfile(data.user);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      ensureProfile(nextUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}
