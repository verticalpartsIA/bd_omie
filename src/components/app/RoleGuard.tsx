import { useEffect, useState } from "react";
import { useAuth, type Role } from "@/lib/auth-mock";
import { ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { hasAnyRole, user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // While not mounted (SSR/initial) or while loading user from storage, render children optimistically
  if (!mounted || !user) return <>{children}</>;
  if (!hasAnyRole(allow)) {
    return (
      <main className="flex flex-1 items-center justify-center p-10">
        <div className="max-w-md rounded-md border border-border bg-card p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h2 className="text-lg font-extrabold">Acesso restrito</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu perfil <strong className="uppercase">{user.profile}</strong> não tem permissão para acessar esta página.
          </p>
          <Link
            to="/dashboard"
            className="mt-5 inline-flex rounded bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </main>
    );
  }
  return <>{children}</>;
}
