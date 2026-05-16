import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ShoppingCart, Package, DollarSign, Clock, TrendingUp, AlertTriangle, Calendar, BarChart2,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  Cell, PieChart, Pie, ComposedChart, Line,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { ExportMenu } from "@/components/app/ExportMenu";
import { useSidebarToggle } from "../_app";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePedidosDashboard } from "@/hooks/usePedidosDashboard";
import { formatBRL, formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor", "estoque"]}>
      <PedidosPage />
    </RoleGuard>
  ),
});

type SortCol = "numeroPedido" | "cliente" | "vendedor" | "valor" | "dataInclusao" | "ageingDias" | "etapa";

function PedidosPage() {
  const toggle = useSidebarToggle();
  const { data, isLoading, isError } = usePedidosDashboard();

  const [sortCol, setSortCol] = useState<SortCol>("dataInclusao");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [q, setQ] = useState("");
  const [etapaFilter, setEtapaFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PER = 30;

  const SortTh = ({
    col,
    label,
    align = "left",
  }: {
    col: SortCol;
    label: string;
    align?: "left" | "right";
  }) => (
    <th
      onClick={() => {
        if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
          setSortCol(col);
          setSortDir("desc");
        }
      }}
      className={`px-3 py-2 cursor-pointer select-none hover:bg-muted/80 text-${align} text-[10px] font-bold uppercase tracking-wider whitespace-nowrap`}
    >
      {label}
      <span className="ml-1 opacity-50">
        {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );

  const etapaOptions = useMemo(
    () =>
      data?.pedidos
        ? [...new Set(data.pedidos.map((p) => p.etapa))].sort()
        : [],
    [data?.pedidos]
  );

  const filtered = useMemo(() => {
    if (!data?.pedidos) return [];
    let rows = data.pedidos.filter((p) => {
      if (
        q &&
        !`${p.numeroPedido} ${p.cliente} ${p.vendedor}`
          .toLowerCase()
          .includes(q.toLowerCase())
      )
        return false;
      if (etapaFilter !== "all" && p.etapa !== etapaFilter) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortCol === "valor" || sortCol === "ageingDias")
        return (a[sortCol] - b[sortCol]) * dir;
      return String(a[sortCol]).localeCompare(String(b[sortCol])) * dir;
    });
    return rows;
  }, [data?.pedidos, q, etapaFilter, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const pageItems = filtered.slice((page - 1) * PER, page * PER);

  if (isLoading) {
    return (
      <>
        <Topbar
          crumb="OPERAÇÃO · PEDIDOS"
          title="Pedidos"
          icon={<ShoppingCart className="h-3.5 w-3.5" />}
          onToggleSidebar={toggle}
        />
        <main className="flex-1 px-7 pb-16 pt-6">
          <div className="animate-pulse text-muted-foreground">Carregando…</div>
        </main>
      </>
    );
  }

  if (isError || !data) {
    return (
      <>
        <Topbar
          crumb="OPERAÇÃO · PEDIDOS"
          title="Pedidos"
          icon={<ShoppingCart className="h-3.5 w-3.5" />}
          onToggleSidebar={toggle}
        />
        <main className="flex-1 px-7 pb-16 pt-6">
          <div className="text-destructive">Erro ao carregar dados de pedidos.</div>
        </main>
      </>
    );
  }

  const { kpis, statusDist, agingDist, evolucaoMensal, etapasCiclo } = data;

  const pctEmAberto =
    kpis.total > 0 ? ((kpis.emAberto / kpis.total) * 100).toFixed(1) : "0.0";

  const avgAging =
    data.pedidos.length > 0
      ? Math.round(
          data.pedidos.reduce((s, p) => s + p.ageingDias, 0) / data.pedidos.length
        )
      : 0;

  const exportRows = data.pedidos.map((p) => ({
    numeroPedido: p.numeroPedido,
    cliente: p.cliente,
    vendedor: p.vendedor,
    valor: p.valor,
    dataInclusao: p.dataInclusao,
    etapa: p.etapa,
    ageingDias: p.ageingDias,
  }));

  return (
    <>
      <Topbar
        crumb="OPERAÇÃO · PEDIDOS"
        title="Pedidos"
        icon={<ShoppingCart className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Pedidos & Vendas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompanhamento de pedidos, etapas, aging e evolução mensal.
            </p>
          </div>
          <ExportMenu
            filename="pedidos"
            rows={exportRows as unknown as Array<Record<string, string | number>>}
          />
        </div>

        {/* KPI Row 1 */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Total 6m"
            value={String(kpis.total)}
            icon={ShoppingCart}
          />
          <KpiCard
            label="Em Aberto"
            value={String(kpis.emAberto)}
            icon={Package}
          />
          <KpiCard
            label="Carteira"
            value={formatBRLCompact(kpis.carteira)}
            icon={DollarSign}
            accent
          />
          <KpiCard
            label="Ticket Médio"
            value={formatBRLCompact(kpis.ticketMedio)}
            icon={TrendingUp}
          />
        </div>

        {/* KPI Row 2 */}
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            label="Pedidos Hoje"
            value={String(kpis.pedidosHoje)}
            icon={Calendar}
          />
          <KpiCard
            label="Pedidos 30d"
            value={String(kpis.pedidos30d)}
            icon={BarChart2}
          />
          <KpiCard
            label="% Em Aberto"
            value={`${pctEmAberto}%`}
            icon={AlertTriangle}
          />
          <KpiCard
            label="Aging Médio"
            value={`${avgAging}d`}
            icon={Clock}
          />
        </div>

        {/* Charts Row 1 — 3 cols */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Evolução Mensal — col-span-2 */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Evolução Mensal — Pedidos &amp; Valor</h4>
            <p className="text-[11px] text-muted-foreground">Barras: quantidade · Linha: valor em R$</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart
                  data={evolucaoMensal}
                  margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: number) => String(v)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v: number) => formatBRLCompact(v)}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: string) =>
                      name === "Valor (R$)"
                        ? formatBRL(value as number)
                        : String(value)
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="pedidos"
                    name="Pedidos"
                    fill="#F5C400"
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="valor"
                    name="Valor (R$)"
                    stroke="#0288D1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição por Etapa — 1 col */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Distribuição por Etapa</h4>
            <p className="text-[11px] text-muted-foreground">Quantidade de pedidos por etapa</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="etapa"
                    innerRadius={40}
                    outerRadius={72}
                    paddingAngle={2}
                  >
                    {statusDist.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1 text-[10px]">
              {statusDist.map((d) => (
                <li key={d.key} className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 flex-shrink-0 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="truncate">{d.etapa}</span>
                  <span className="ml-auto font-mono font-bold">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Charts Row 2 — 2 cols */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Aging */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Aging de pedidos em aberto</h4>
            <p className="text-[11px] text-muted-foreground">Vermelho exige ação imediata</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={agingDist}
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Pedidos" radius={[4, 4, 0, 0]}>
                    {agingDist.map((a, i) => (
                      <Cell key={i} fill={a.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pedidos por Etapa — horizontal */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Pedidos por Etapa</h4>
            <p className="text-[11px] text-muted-foreground">Top 8 etapas por volume</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={etapasCiclo.slice(0, 8)}
                  layout="vertical"
                  margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    dataKey="etapa"
                    type="category"
                    tick={{ fontSize: 10 }}
                    width={140}
                  />
                  <Tooltip />
                  <Bar dataKey="count" name="Pedidos" fill="#F5C400" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex-1">
              <h4 className="text-sm font-bold">Pedidos</h4>
              <p className="text-[11px] text-muted-foreground">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Input
              placeholder="Buscar por número, cliente, vendedor…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="w-[260px]"
            />
            <Select
              value={etapaFilter}
              onValueChange={(v) => {
                setEtapaFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as etapas</SelectItem>
                {etapaOptions.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <SortTh col="numeroPedido" label="Número" />
                  <SortTh col="cliente" label="Cliente" />
                  <SortTh col="vendedor" label="Vendedor" />
                  <SortTh col="valor" label="Valor" align="right" />
                  <SortTh col="dataInclusao" label="Data" />
                  <SortTh col="ageingDias" label="Aging" align="right" />
                  <SortTh col="etapa" label="Etapa" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => {
                  const etapaColor =
                    statusDist.find((s) => s.etapa === p.etapa)?.color ?? "#888";
                  const agingClass =
                    p.ageingDias > 30
                      ? "text-destructive font-bold"
                      : p.ageingDias > 15
                      ? "text-orange-500 font-semibold"
                      : "";
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-xs">{p.numeroPedido}</td>
                      <td className="px-3 py-2">{p.cliente}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.vendedor}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatBRL(p.valor)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {p.dataInclusao.split("-").reverse().join("/")}
                      </td>
                      <td className={`px-3 py-2 text-right font-mono text-xs ${agingClass}`}>
                        {p.ageingDias}d
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="rounded px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background: etapaColor + "22",
                            color: etapaColor,
                          }}
                        >
                          {p.etapa}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {pageItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-6 text-center text-sm text-muted-foreground"
                    >
                      Nenhum pedido encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <span className="text-[11px] text-muted-foreground">
                Página {page} de {totalPages} · {filtered.length} registros
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted"
                >
                  ← Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-border px-3 py-1 text-xs disabled:opacity-40 hover:bg-muted"
                >
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
