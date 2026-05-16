import { createFileRoute } from "@tanstack/react-router";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { BarChart3, TrendingUp, Users, Package, Award, Filter, Loader2 } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { KpiCard } from "@/components/app/KpiCard";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { AlertasRecomendacoes } from "@/components/app/AlertasRecomendacoes";
import { ExportMenu } from "@/components/app/ExportMenu";
import { useAnalyticalDashboard } from "@/hooks/useAnalyticalDashboard";
import { useStrategicDashboard } from "@/hooks/useStrategicDashboard";
import { formatBRL } from "@/data/executive-mock";

export const Route = createFileRoute("/_app/analytical")({
  head: () => ({ meta: [{ title: "Analytical Dashboard — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <AnalyticalDashboard />
    </RoleGuard>
  ),
});

// ── Color palette ─────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#F5C400", "#3B82F6", "#10B981", "#F97316",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtK(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000).toLocaleString("pt-BR")}K`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

function AnalyticalDashboard() {
  const toggle = useSidebarToggle();
  const { data: ad, isLoading, isError } = useAnalyticalDashboard();
  const { kpis, cockpitCEO: alertas, mixCanal } = useStrategicDashboard();

  const forecast = kpis.forecastMes;
  const forecastPct = Math.round((forecast.projetado / forecast.meta) * 100);

  return (
    <>
      <Topbar
        crumb="DASHBOARDS · ANALYTICAL"
        title="Analytical Dashboard"
        icon={<BarChart3 className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
        extra={<USDCalendarWidget />}
      />
      <main className="flex-1 px-7 pb-16 pt-6">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">
              Análise comercial ·{" "}
              <span className="text-[#C99E00]">
                {isLoading ? "…" : ad.mesAtual}
              </span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Carregando dados…"
                : isError
                  ? "Erro ao carregar dados — verifique o console do servidor."
                  : `${ad.totalPedidos12m.toLocaleString("pt-BR")} pedidos nos últimos 12 meses — clientes, produtos, vendedores e sazonalidade.`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground/70 hover:border-neutral-400">
              <Filter className="h-3.5 w-3.5" /> Filtros
            </button>
            <ExportMenu filename="analytical" rows={ad.topProdutos} />
          </div>
        </div>

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            accent
            label="Ticket médio"
            value={isLoading ? "…" : fmtK(ad.ticketMedio)}
            hint="por pedido · últimos 12m"
            icon={TrendingUp}
          />
          <KpiCard
            label="Recompra"
            value={isLoading ? "…" : `${ad.recompraPct}%`}
            hint="clientes com 2+ pedidos"
            icon={Users}
          />
          <KpiCard
            label="Itens / pedido"
            value={isLoading ? "…" : String(ad.itensPorPedido)}
            hint="média do período"
            icon={Package}
          />
          <KpiCard
            label="Top vendedor"
            value={isLoading ? "…" : ad.topVendedor.nome.split(" ")[0]}
            hint={isLoading ? "" : `${ad.topVendedor.pedidos.toLocaleString("pt-BR")} pedidos`}
            icon={Award}
          />
        </div>

        {/* ── Forecast + Alertas ────────────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Forecast do mês
            </div>
            <div className="mt-2 font-mono text-3xl font-extrabold">
              {formatBRL(forecast.projetado)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Meta {formatBRL(forecast.meta)} · {forecastPct}% projetado
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(forecastPct, 100)}%` }}
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <AlertasRecomendacoes
              title="Oportunidades detectadas"
              items={alertas.slice(0, 4)}
            />
          </div>
        </div>

        {/* ── Top Clientes + Mix por Canal ──────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Top Clientes */}
          <div className="rounded-md border border-border bg-card shadow-sm lg:col-span-2">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Top Clientes</h4>
              <p className="text-[11px] text-muted-foreground">
                Receita por cliente · em R$ mil · últimos 12m
              </p>
            </div>
            <div className="h-[320px] p-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ad.topClientes} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#808080"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}`}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#808080"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={150}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }}
                      formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}K`, "Receita"]}
                    />
                    <Bar dataKey="v" fill="#F5C400" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Mix por Canal */}
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Mix por Canal</h4>
              <p className="text-[11px] text-muted-foreground">
                Fonte: tags PN_Omie · receita 12m
              </p>
            </div>
            <div className="flex h-[320px] items-center gap-0 p-4">
              {mixCanal.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Donut */}
                  <div className="h-[148px] w-[148px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mixCanal}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={2}
                          startAngle={90}
                          endAngle={-270}
                        >
                          {mixCanal.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 11 }}
                          formatter={(v: number) => [`${v}%`, ""]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex flex-1 flex-col gap-2 pl-3">
                    {mixCanal.map((seg, i) => (
                      <div key={seg.name} className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="truncate text-[11px] text-foreground/80" title={seg.name}>
                            {seg.name.length > 18 ? seg.name.slice(0, 17) + "…" : seg.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold tabular-nums">
                          {seg.value}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Top Produtos + Vendedores ─────────────────────────────────── */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* Top Produtos */}
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Top Produtos</h4>
              <p className="text-[11px] text-muted-foreground">
                Mais vendidos por receita · R$ mil acumulado
              </p>
            </div>
            {isLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead className="bg-neutral-50 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                    <tr>
                      <th className="px-5 py-3 text-left font-bold">SKU</th>
                      <th className="px-5 py-3 text-left font-bold">Descrição</th>
                      <th className="px-5 py-3 text-right font-bold">Qtd</th>
                      <th className="px-5 py-3 text-right font-bold">Rec. (k)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ad.topProdutos.map((p) => (
                      <tr key={p.sku} className="border-t border-border hover:bg-neutral-50/60">
                        <td className="px-5 py-2.5 font-mono text-[11px] font-bold text-foreground">
                          {p.sku}
                        </td>
                        <td
                          className="max-w-[160px] truncate px-5 py-2.5 text-foreground/80"
                          title={p.desc}
                        >
                          {p.desc}
                        </td>
                        <td className="px-5 py-2.5 text-right font-semibold">
                          {p.qty.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-5 py-2.5 text-right font-bold text-[#C99E00]">
                          R$ {p.rev.toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Vendedores */}
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Performance dos Vendedores</h4>
              <p className="text-[11px] text-muted-foreground">
                Pedidos fechados · últimos 12m
              </p>
            </div>
            <div className="h-[300px] p-4">
              {isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ad.vendedores} margin={{ bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#808080"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      tickFormatter={(v: string) =>
                        v.length > 10 ? v.split(" ")[0] : v
                      }
                    />
                    <YAxis
                      stroke="#808080"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }}
                      formatter={(v: number) => [v.toLocaleString("pt-BR"), "Pedidos"]}
                    />
                    <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                      {ad.vendedores.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#F5C400" : "#3B82F6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Sazonalidade ──────────────────────────────────────────────── */}
        <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h4 className="text-sm font-bold">Sazonalidade · Pedidos por Mês</h4>
              <p className="text-[11px] text-muted-foreground">
                Volume de pedidos nos últimos 12 meses
              </p>
            </div>
            {!isLoading && (
              <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-2 py-1 text-xs font-bold text-[#C99E00]">
                <TrendingUp className="h-3 w-3" /> Pico em {ad.peakMonth}
              </span>
            )}
          </div>
          <div className="h-[280px] p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ad.seasonality}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" vertical={false} />
                  <XAxis
                    dataKey="m"
                    stroke="#808080"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#808080"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 4, border: "1px solid #E5E5E5", fontSize: 12 }}
                    formatter={(v: number) => [v.toLocaleString("pt-BR"), "Pedidos"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="v"
                    stroke="#F5C400"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#F5C400" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Cohort ────────────────────────────────────────────────────── */}
        <div className="mt-6 rounded-md border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h4 className="text-sm font-bold">Cohort de Clientes — retenção mensal</h4>
            <p className="text-[11px] text-muted-foreground">
              Novos clientes por mês e percentual que voltou a comprar
            </p>
          </div>
          <div className="overflow-x-auto p-3">
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 text-left">Coorte</th>
                    <th className="px-2 py-2 text-center">Novos</th>
                    <th className="px-2 py-2 text-center">M+1</th>
                    <th className="px-2 py-2 text-center">M+2</th>
                    <th className="px-2 py-2 text-center">M+3</th>
                    <th className="px-2 py-2 text-center">M+4</th>
                    <th className="px-2 py-2 text-center">M+5</th>
                  </tr>
                </thead>
                <tbody>
                  {ad.cohort.map((c) => (
                    <tr key={c.mes} className="border-t border-border">
                      <td className="px-2 py-2 text-left font-semibold">{c.mes}</td>
                      <td className="px-2 py-2 text-center font-mono">{c.novos}</td>
                      {([c.m1, c.m2, c.m3, c.m4, c.m5] as Array<number | undefined>).map(
                        (v, i) => (
                          <td key={i} className="px-2 py-2 text-center font-mono">
                            {v == null ? (
                              <span className="text-muted-foreground">—</span>
                            ) : c.novos === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={
                                  v / c.novos < 0.3
                                    ? "text-destructive"
                                    : v / c.novos < 0.6
                                      ? "text-warning"
                                      : "text-success"
                                }
                              >
                                {v} ({Math.round((v / c.novos) * 100)}%)
                              </span>
                            )}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
