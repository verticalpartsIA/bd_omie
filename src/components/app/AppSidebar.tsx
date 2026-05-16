import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BarChart3,
  MonitorPlay,
  Package,
  Users,
  Briefcase,
  ShoppingCart,
  Wallet,
  FileBarChart,
  Settings,
  ChevronsLeft,
  MoreVertical,
  ShoppingBag,
  Tag,
  Warehouse,
  ArrowLeftRight,
  Target,
  Tv2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-mock";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  newTab?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    label: "Dashboards",
    items: [
      { to: "/dashboard", label: "Strategic Dashboard", icon: LayoutDashboard },
      { to: "/analytical", label: "Analytical Dashboard", icon: BarChart3 },
      { to: "/operational", label: "Operational Dashboard", icon: MonitorPlay },
      { to: "/tv", label: "TV · Sala de Controle", icon: Tv2, newTab: true },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { to: "/clientes", label: "Customers", icon: Users },
      { to: "/segmentos", label: "Segmentação RFM", icon: Target },
      { to: "/vendedores", label: "Sellers", icon: Briefcase },
    ],
  },
  {
    label: "Produtos & Estoque",
    items: [
      { to: "/produtos", label: "Produtos", icon: ShoppingBag, badge: "4k" },
      { to: "/categorias", label: "Categorias", icon: Tag },
      { to: "/estoque", label: "Estoque", icon: Warehouse },
      { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Operação",
    items: [
      { to: "/pedidos", label: "Orders", icon: ShoppingCart, badge: 12 },
      { to: "/financeiro", label: "Finance", icon: Wallet },
      { to: "/relatorios", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    label: "Sistema",
    items: [{ to: "/perfil", label: "Settings", icon: Settings }],
  },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initials =
    user?.nome
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "VP";

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[72px]" : "w-[248px]",
      )}
    >
      <div className="flex h-[68px] items-center justify-between border-b border-sidebar-border px-5">
        {!collapsed ? (
          <span className="text-base font-extrabold uppercase leading-none tracking-tight">
            <span className="text-neutral-400">Vertical</span>
            <span className="text-primary">Parts</span>
          </span>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-black text-primary-foreground">
            VP
          </div>
        )}
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
            aria-label="Recolher"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {groups.map((g) => (
          <div key={g.label} className="mb-2">
            {!collapsed && (
              <div className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
                {g.label}
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    target={item.newTab ? "_blank" : undefined}
                    rel={item.newTab ? "noopener noreferrer" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded px-3 py-2.5 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && (
                      <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary-foreground" : "text-neutral-400 group-hover:text-primary",
                      )}
                    />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && (
                          <span
                            className={cn(
                              "ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold",
                              active
                                ? "bg-black text-primary"
                                : "bg-primary text-primary-foreground",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "flex shrink-0 items-center gap-3 border-t border-sidebar-border p-3",
          collapsed && "justify-center p-3",
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-neutral-800 bg-primary text-[13px] font-extrabold text-primary-foreground">
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold text-white">{user?.nome}</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                {user?.roles[0] ?? "user"}
              </div>
            </div>
            <button
              type="button"
              className="rounded p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
              aria-label="Mais"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}