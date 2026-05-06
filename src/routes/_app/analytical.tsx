import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BarChart3, TrendingUp, Users, Package, Award, Filter } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { KpiCard } from "@/components/app/KpiCard";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";

export const Route = createFileRoute("/_app/analytical")({
  head: () => ({ meta: [{ title: "Analytical Dashboard — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <AnalyticalDashboard />
    </RoleGuard>
  ),
});

const topClients = [
  { name: "Elevadores Atlas SP", v: 184 },
  { name: "Manutec Engenharia", v: 162 },
  { name: "ThyssenKrupp Service", v: 148 },
  { name: "OTIS Manutenção RJ", v: 131 },
  { name: "Sigma Elevadores", v: 119 },
  { name: "VertCare Service", v: 102 },
  { name: "EleTech Brasil", v: 94 },
  { name: "Polia & Cia", v: 88 },
];

const topProducts = [
  { sku: "POL-450-3R", desc: "Polia 450mm 3 raias", qty: 412, rev: 96 },
  { sku: "CAB-AC-12", desc: "Cabo aço 12mm", qty: 388, rev: 88 },
  { sku: "PNL-COP-V8", desc: "Painel cabine V8", qty: 274, rev: 71 },
  { sku: "MOT-TRC-22", desc: "Motor tração 22kW", qty: 196, rev: 64 },
  { sku: "DEG-INX-200", desc: "Degrau inox 200", qty: 312, rev: 58 },
  { sku: "BTN-LED-BL", desc: "Botoeira LED azul", qty: 502, rev: 41 },
];

const sellersData = [
  { name: "Carla M.", v: 218 },
  { name: "Rafael T.", v: 196 },
  { name: "Bruno S.", v: 174 },
  { name: "Júlia P.", v: 142 },
  { name: "Igor F.", v: 118 },
];

const seasonality = [
  { m: "Jan", v: 62 }, { m: "Fev", v: 70 }, { m: "Mar", v: 84 },
  { m: "Abr", v: 78 }, { m: "Mai", v: 88 }, { m: "Jun", v: 96 },
  { m: "Jul", v: 102 }, { m: "Ago", v: 108 }, { m: "Set", v: 124 },
  { m: "Out", v: 138 }, { m: "Nov", v: 130 }, { m: "Dez", v: 142 },
];

const channelMix = [
  { name: "Manutenção", value: 62 },
  { name: "Cliente Final", value: 26 },
  { name: "Distribuidor", value: 12 },
];

const COLORS = ["#F5C400", "#161616", "#808080", "#C99E00", "#E5E5E5"];

function AnalyticalDashboard() {
  const toggle = useSidebarToggle();
  return (
    <>
      <Topbar
        crumb="DASHBOARDS · ANALYTICAL"
        title="Analytical Dashboard"
        icon={<BarChart3 className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">
              Análise comercial · <span className="text-[#C99E00]">Out 2025</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Clientes, produtos, vendedores e sazonalidade — dados consolidados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground/70 hover:border-neutral-400">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </button>
            <select className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground/70">
              <option>Últimos 30 dias</option>
              <option>Últimos 90 dias</option>
              <option>Ano corrente</option>
            </select>
            <select className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground/70">
              <option>Todos canais</option>
              <option>Manutenção</option>
              <option>Cliente Final</option>
            </select>
            <button className="rounded bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
              Exportar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard accent label="Ticket médio" value="R$ 4.812" delta={6} hint="vs. mês anterior" icon={TrendingUp} />
          <KpiCard label="Recompra" value="38%" delta={3} hint="clientes com 2+ pedidos" icon={Users} />
          <KpiCard label="Itens / pedido" value="3.8" delta={2} hint="média do mês" icon={Package} />
          <KpiCard label="Top vendedor" value="Carla M." delta={12} hint="218 pedidos" icon={Award} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Top Clientes */}
          <div className="rounded-md border border-border bg-card shadow-sm lg:col-span-2">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Top Clientes</h4>
              <p className="text-[11px] text-muted-foreground">Receita por cliente · em milhares R$</p>
            </div>
            <div className="h-[320px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical" margin={{ left: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={false} />
                  <XAxis type="number" stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#808080" fontSize={11} tickLine={false} axisLine={false} width={140} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                  <Bar dataKey="v" fill="#F5C400" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mix de Canal */}
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Mix por Canal</h4>
              <p className="text-[11px] text-muted-foreground">Distribuição de pedidos</p>
            </div>
            <div className="h-[320px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelMix} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={2}>
                    {channelMix.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Top Produtos tabela */}
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Top Produtos</h4>
              <p className="text-[11px] text-muted-foreground">Mais vendidos no período</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                  <tr>
                    <th className="px-5 py-3 text-left font-bold">SKU</th>
                    <th className="px-5 py-3 text-left font-bold">Descrição</th>
                    <th className="px-5 py-3 text-right font-bold">Qtd</th>
                    <th className="px-5 py-3 text-right font-bold">Receita (k)</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.sku} className="border-t border-border hover:bg-neutral-50/60">
                      <td className="px-5 py-2.5 font-mono text-[11px] font-bold text-foreground">{p.sku}</td>
                      <td className="px-5 py-2.5 text-foreground/80">{p.desc}</td>
                      <td className="px-5 py-2.5 text-right font-semibold">{p.qty}</td>
                      <td className="px-5 py-2.5 text-right font-bold text-[#C99E00]">R$ {p.rev}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendedores */}
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Performance dos Vendedores</h4>
              <p className="text-[11px] text-muted-foreground">Pedidos fechados no mês</p>
            </div>
            <div className="h-[300px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                  <XAxis dataKey="name" stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                  <Bar dataKey="v" fill="#161616" radius={[3, 3, 0, 0]}>
                    {sellersData.map((_, i) => <Cell key={i} fill={i === 0 ? "#F5C400" : "#161616"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h4 className="text-sm font-bold">Sazonalidade · Pedidos por Mês</h4>
              <p className="text-[11px] text-muted-foreground">Evolução de volume nos últimos 12 meses</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-1 text-xs font-bold text-[#C99E00]">
              <TrendingUp className="h-3 w-3" /> Pico em Dez
            </span>
          </div>
          <div className="h-[280px] p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonality}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                <XAxis dataKey="m" stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#808080" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }} />
                <Line type="monotone" dataKey="v" stroke="#F5C400" strokeWidth={2.5} dot={{ r: 3, fill: "#F5C400" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
    </>
  );
}
