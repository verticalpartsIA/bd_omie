import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "gestor" | "vendedor" | "financeiro" | "estoque" | "tv";

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  roles: Role[];
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (nome: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (r: Role) => boolean;
  hasAnyRole: (rs: Role[]) => boolean;
}

const STORAGE_KEY = "vp_auth_user";

const AuthContext = createContext<AuthState | null>(null);

function defaultUser(email: string, nome?: string): AuthUser {
  return {
    id: crypto.randomUUID(),
    nome: nome ?? email.split("@")[0],
    email,
    roles: ["admin", "gestor", "vendedor", "financeiro", "estoque"],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    }
  };

  const value: AuthState = {
    user,
    isAuthenticated: !!user,
    login: async (email) => {
      await new Promise((r) => setTimeout(r, 300));
      persist(defaultUser(email));
    },
    register: async (nome, email) => {
      await new Promise((r) => setTimeout(r, 300));
      persist(defaultUser(email, nome));
    },
    logout: () => persist(null),
    hasRole: (r) => !!user?.roles.includes(r),
    hasAnyRole: (rs) => !!user?.roles.some((r) => rs.includes(r)),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}