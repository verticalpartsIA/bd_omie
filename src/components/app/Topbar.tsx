import { useNavigate } from "@tanstack/react-router";
import { PanelLeft, HelpCircle, Bell, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-mock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  crumb: string;
  title: string;
  icon?: React.ReactNode;
  onToggleSidebar: () => void;
}

export function Topbar({ crumb, title, icon, onToggleSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials =
    user?.nome
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "VP";

  return (
    <header className="sticky top-0 z-10 flex h-[68px] items-center gap-5 border-b border-border bg-background px-7">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="flex h-[38px] w-[38px] items-center justify-center rounded border border-border bg-muted text-foreground/70 hover:bg-muted/70"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {icon && <span className="text-primary">{icon}</span>}
          {crumb}
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="flex h-[38px] w-[38px] items-center justify-center rounded text-foreground/70 hover:bg-muted">
          <HelpCircle className="h-4 w-4" />
        </button>
        <button className="relative flex h-[38px] w-[38px] items-center justify-center rounded text-foreground/70 hover:bg-muted">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2 h-2 w-2 rounded-full border-2 border-background bg-primary" />
        </button>
        <div className="mx-1 h-7 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full p-1 pr-3 hover:bg-muted">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[13px] font-extrabold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden flex-col items-start sm:flex">
                <span className="text-[13px] font-semibold leading-tight">{user?.nome}</span>
                <span className="mt-0.5 inline-block rounded-sm bg-black px-1.5 py-px text-[9px] font-extrabold uppercase tracking-[0.12em] text-primary">
                  {user?.roles[0] ?? "user"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => navigate({ to: "/perfil" })}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}