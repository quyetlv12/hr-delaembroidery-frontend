import { createContext } from "react";

import type { AuthSession, AuthUser } from "@/types/auth.types";

export type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
