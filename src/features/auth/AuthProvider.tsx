import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { sessionStorageAdapter } from "@/services/api";
import type { AuthSession } from "@/types/auth.types";

import { AuthContext, type AuthContextValue } from "./auth-context-value";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(() =>
    sessionStorageAdapter.get(),
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session),
      setSession(nextSession) {
        sessionStorageAdapter.set(nextSession);
        setSessionState(nextSession);
      },
      logout() {
        sessionStorageAdapter.clear();
        setSessionState(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
