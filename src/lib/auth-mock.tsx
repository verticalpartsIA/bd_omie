import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "admin" | "gestor" | "vendedor" | "financeiro" | "estoque" | "tv";
export type Profile = "admin" | "estrategico" | "analitico" | "operacional";

export const profileToRoles: Record<Profile, Role[]> = {
  admin: ["admin", "gestor", "vendedor", "financeiro", "estoque", "tv"],
  estrategico: ["gestor"],
  analitico: ["gestor", "financeiro"],
  operacional: ["vendedor", "estoque"],
};

export const profileLanding: Record<Profile, string> = {
  admin: "/dashboard",
  estrategico: "/dashboard",
  analitico: "/analytical",
  operacional: "/operational",
};

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  roles: Role[];
  profile: Profile;
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (nome: string, email: string, password: string, profile?: Profile) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (r: Role) => boolean;
  hasAnyRole: (rs: Role[]) => boolean;
}

const STORAGE_KEY = "vp_auth_user";

const AuthContext = createContext<AuthState | null>(null);

function defaultUser(email: string, nome?: string, profile: Profile = "admin"): AuthUser {
  return {
    id: crypto.randomUUID(),
    nome: nome ?? email.split("@")[0],
    email,
    profile,
    roles: profileToRoles[profile],
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
      const u = defaultUser(email);
      persist(u);
      return u;
    },
    register: async (nome, email, _pw, profile = "estrategico") => {
      await new Promise((r) => setTimeout(r, 300));
      const u = defaultUser(email, nome, profile);
      persist(u);
      return u;
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