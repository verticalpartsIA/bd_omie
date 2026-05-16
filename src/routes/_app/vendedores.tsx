import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, TrendingUp, DollarSign, Receipt, Users, ShoppingCart } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  Line, LineChart, Area, AreaChart,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { useSidebarToggle } from "../_app";
import { formatBRL } from "@/lib/format";
import { useVendedoresDashboard } from "@/hooks/useVendedoresDashboard";

export const Route = createFileRoute("/_app/vendedores")({
  head: () => ({ meta: [{ title: "Vendedores — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor"]}>
      <VendedoresPage />
    </RoleGuard>
  ),
});

const LINE_COLORS = ["#F5C400", "#0288D1", "#2E7D32", "#C62828", "#7B1FA2", "#E65100"];

function VendedoresPage() {
  const toggle = useSidebarToggle();
  const { data, isLoading } = useVendedoresDashboard();
  const { vendedores, kpis, etapas, evolucaoMensal, topVendedoresNomes } = data;

  const maxReceita = vendedores[0]?.receita12m ?? 1;

  return (
    <>
      <Topbar crumb="CADASTROS · VENDEDORES" title="Time de Vendas" icon={<Briefcase className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5">
          <h2 className="text-[26px] font-extrabold tracking-tight">Como está meu time de vendas?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading
              ? "Carregando dados reais…"
              : `${kpis.totalVendedores} vendedores · ${kpis.totalPedidos12m.toLocaleString("pt-BR")} pedidos em 12 meses`}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard label="Vendedores Ativos" value={kpis.totalVendedores.toString()} hint="com pedidos 12m" icon={Users} />
          <KpiCard label="Pedidos 12m" value={kpis.totalPedidos12m.toLocaleString("pt-BR")} hint="total do time" icon={ShoppingCart} />
          <KpiCard label="Receita 12m" value={formatBRL(kpis.totalReceita12m)} hint="total vendido" icon={DollarSign} accent />
          <KpiCard label="Ticket Médio" value={formatBRL(kpis.ticketMedio)} hint="por pedido" icon={Receipt} />
          <KpiCard label="Top Vendedor" value={kpis.topVendedor.split(" ")[0] ?? "—"} hint="por receita 12m" icon={TrendingUp} />
        </div>

        {/* Ranking + Funil */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Ranking de Vendedores</h4>
            <p className="text-[11px] text-muted-foreground">Receita acumulada · últimos 12 meses</p>
            <div className="mt-3 space-y-3">
              {isLoading && <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>}
              {vendedores.map((v, i) => {
                const pct = maxReceita > 0 ? Math.round((v.receita12m / maxReceita) * 100) : 0;
                const cor = i === 0 ? "#F5C400" : i < 3 ? "#2E7D32" : "#6B7280";
                return (
                  <div key={v.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground w-5">#{i + 1}</span>
                        <span className="font-semibold">{v.nome}</span>
                      </span>
                      <span className="font-mono">
                        <span className="font-bold" style={{ color: cor }}>{formatBRL(v.receita12m)}</span>
                        <span className="ml-2 text-muted-foreground">{v.pedidos12m} ped · {v.clientes} cli</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Funil por etapa */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Pedidos por Etapa</h4>
            <p className="text-[11px] text-muted-foreground">Distribuição das etapas no Omie</p>
            <div className="mt-3 space-y-2">
              {etapas.map((e, i) => {
                const maxQty = etapas[0]?.quantidade ?? 1;
                const pct = maxQty > 0 ? Math.round((e.quantidade / maxQty) * 100) : 0;
                return (
                  <div key={e.etapa}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold truncate max-w-[140px]">{e.etapa}</span>
                      <span className="font-mono text-muted-foreground">{e.quantidade} · {formatBRL(e.valor)}</span>
                    </div>
                    <div className="h-6 w-full rounded bg-muted">
                      <div
                        className="flex h-full items-center justify-end rounded px-2 text-[10px] font-bold text-white"
                        style={{ width: `${Math.max(pct, 8)}%`, background: i === 0 ? "#F5C400" : "#374151", color: i === 0 ? "#000" : "#fff" }}
                      >
                        {pct}%
                      </div>
                    </div>
                  </div>
                );
              })}
              {etapas.length === 0 && <div className="py-4 text-center text-xs text-muted-foreground">Carregando…</div>}
            </div>
          </div>
        </div>

        {/* Evolução mensal */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Receita Mensal · Top 5 Vendedores</h4>
            <p className="text-[11px] text-muted-foreground">Últimos 6 meses</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolucaoMensal} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => [formatBRL(Number(v)), ""]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {topVendedoresNomes.map((nome, i) => (
                    <Line
                      key={nome}
                      type="monotone"
                      dataKey={nome}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ticket médio por vendedor */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Ticket Médio por Vendedor</h4>
            <p className="text-[11px] text-muted-foreground">Valor médio por pedido · últimos 12 meses</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={vendedores.slice(0, 10).map((v) => ({ nome: v.nome.split(" ")[0], ticket: v.ticketMedio }))}
                  layout="vertical"
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip formatter={(v: unknown) => [formatBRL(Number(v)), "Ticket"]} />
                  <Bar dataKey="ticket" radius={[0, 4, 4, 0]}>
                    {vendedores.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "#F5C400" : "#0288D1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tabela resumo */}
        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h4 className="text-sm font-bold">Resumo por Vendedor</h4>
            <p className="text-[11px] text-muted-foreground">Pedidos, receita, ticket e clientes únicos · últimos 12 meses</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Vendedor</th>
                  <th className="px-3 py-2 text-right">Pedidos</th>
                  <th className="px-3 py-2 text-right">Receita 12m</th>
                  <th className="px-3 py-2 text-right">Ticket Médio</th>
                  <th className="px-3 py-2 text-right">Clientes Únicos</th>
                  <th className="px-3 py-2 text-right">Último Pedido</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Carregando dados reais…</td></tr>
                )}
                {vendedores.map((v, i) => (
                  <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{v.nome}</td>
                    <td className="px-3 py-2 text-right font-mono">{v.pedidos12m.toLocaleString("pt-BR")}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{formatBRL(v.receita12m)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatBRL(v.ticketMedio)}</td>
                    <td className="px-3 py-2 text-right font-mono">{v.clientes}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{v.ultimoPedido}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
