import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  LayoutDashboard,
  TrendingUp,
} from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { KpiCard } from "@/components/app/KpiCard";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Strategic Dashboard — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor"]}>
      <StrategicDashboard />
    </RoleGuard>
  ),
});

const revenueData = [
  { m: "Jan", r: 520, ly: 460 },
  { m: "Fev", r: 610, ly: 510 },
  { m: "Mar", r: 680, ly: 540 },
  { m: "Abr", r: 720, ly: 580 },
  { m: "Mai", r: 690, ly: 600 },
  { m: "Jun", r: 760, ly: 640 },
  { m: "Jul", r: 810, ly: 660 },
  { m: "Ago", r: 790, ly: 700 },
  { m: "Set", r: 860, ly: 720 },
  { m: "Out", r: 940, ly: 780 },
];

const categoryData = [
  { name: "Polias", value: 280 },
  { name: "Cabos", value: 220 },
  { name: "Painéis", value: 190 },
  { name: "Motores", value: 160 },
  { name: "Degraus", value: 130 },
];

const channelData = [
  { name: "Manutenção", value: 62 },
  { name: "Cliente Final", value: 38 },
];

const ordersData = [
  { d: "S1", v: 38 }, { d: "S2", v: 52 }, { d: "S3", v: 47 },
  { d: "S4", v: 64 }, { d: "S5", v: 58 }, { d: "S6", v: 71 }, { d: "S7", v: 82 },
];

const COLORS = ["#F5C400", "#161616", "#808080", "#C99E00", "#E5E5E5"];

function StrategicDashboard() {
  const toggle = useSidebarToggle();
  return (
    <>
      <Topbar
        crumb="DASHBOARDS · STRATEGIC"
        title="Strategic Dashboard"
        icon={<LayoutDashboard className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">
              Visão executiva · <span className="text-[#C99E00]">Out 2025</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              KPIs consolidados, evolução de receita e distribuição por categoria.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground/70 hover:border-neutral-400">
              Últimos 30 dias
            </button>
            <button className="rounded bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
              Exportar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard accent label="Receita do mês" value="R$ 940k" delta={18} hint="vs. mês anterior" icon={DollarSign} />
          <KpiCard label="Pedidos" value="1.284" delta={9} hint="846 entregues" icon={ShoppingCart} />
          <KpiCard label="Clientes ativos" value="277" delta={4} hint="183 manutenção · 94 final" icon={Users} />
          <KpiCard label="SKUs em estoque" value="4.128" delta={-2} hint="62 abaixo do mínimo" icon={Package} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-card shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-sm font-bold">Evolução de Receita</h4>
                <p className="text-[11px] text-muted-foreground">2025 vs 2024 · em milhares R$</p>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-foreground/70">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />2025</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-neutral-400" />2024</span>
              </div>
            </div>
            <div className="h-[280px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5C400" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#F5C400" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                  <XAxis dataKey="m" stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                  <Area type="monotone" dataKey="ly" stroke="#A0A0A0" strokeDasharray="4 4" fill="transparent" />
                  <Area type="monotone" dataKey="r" stroke="#F5C400" strokeWidth={2.5} fill="url(#g1)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Mix por Categoria</h4>
              <p className="text-[11px] text-muted-foreground">Receita por família de produto</p>
            </div>
            <div className="h-[280px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Pedidos por Semana</h4>
              <p className="text-[11px] text-muted-foreground">Últimas 7 semanas</p>
            </div>
            <div className="h-[220px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                  <XAxis dataKey="d" stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                  <Bar dataKey="v" fill="#F5C400" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Tipo de Cliente</h4>
              <p className="text-[11px] text-muted-foreground">Manutenção vs Cliente final</p>
            </div>
            <div className="h-[220px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    <Cell fill="#F5C400" />
                    <Cell fill="#161616" />
                  </Pie>
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-sm font-bold">Crescimento YoY</h4>
                <p className="text-[11px] text-muted-foreground">Receita acumulada</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-1 text-xs font-bold text-success">
                <TrendingUp className="h-3 w-3" /> +18%
              </span>
            </div>
            <div className="h-[220px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                  <XAxis dataKey="m" stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                  <Line type="monotone" dataKey="r" stroke="#F5C400" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="ly" stroke="#808080" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}