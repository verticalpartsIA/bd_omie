import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
  { to: "/forgot-password", label: "Forgot" },
  { to: "/reset-password", label: "Reset" },
] as const;

export function AuthSwitcher() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md border border-[#2a2a2a] bg-black/90 p-1 shadow-lg backdrop-blur">
      <div className="flex">
        {tabs.map((t) => {
          const active = path === t.to;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "rounded-sm px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
                active ? "bg-primary text-black" : "text-neutral-300 hover:text-white",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}