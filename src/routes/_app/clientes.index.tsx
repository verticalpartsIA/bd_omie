import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Users, Search, UserCheck, UserX, AlertTriangle,
  DollarSign, Receipt, Crown, TrendingUp,
} from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { KpiCard } from "@/components/app/KpiCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportMenu } from "@/components/app/ExportMenu";
import { formatBRL } from "@/lib/format";
import {
  useClientesDashboard, RFM_COLORS, RFM_LABELS,
  type StatusCliente, type RFMSegmento,
} from "@/hooks/useClientesDashboard";
import {
  Bar, CartesianGrid, Cell, Line, ComposedChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  Area, AreaChart,
} from "recharts";

export const Route = createFileRoute("/_app/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor"]}>
      <ClientesPage />
    </RoleGuard>
  ),
});

const STATUS_STYLE: Record<StatusCliente, string> = {
  ativo:    "bg-green-100 text-green-800",
  novo:     "bg-blue-100 text-blue-800",
  em_risco: "bg-orange-100 text-orange-800",
  inativo:  "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<StatusCliente, string> = {
  ativo: "Ativo", novo: "Novo", em_risco: "Em Risco", inativo: "Inativo",
};

function StatusPill({ s }: { s: StatusCliente }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[s]}`}>
      {STATUS_LABEL[s]}
    </span>
  );
}

function Card({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card shadow-sm ${className ?? ""}`}>
      <div className="border-b border-border px-5 py-4">
        <h4 className="text-sm font-bold">{title}</h4>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function ClientesPage() {
  const toggle = useSidebarToggle();
  const navigate = useNavigate();
  const { data, isLoading } = useClientesDashboard();

  const [q, setQ] = useState("");
  const [rfmFilter, setRfmFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PER = 15;

  const { clientes, kpis, rfmDist, concentracaoPareto, top10, mesesNovos } = data;

  const filtered = useMemo(() => clientes.filter((c) => {
    if (q && !`${c.codigo} ${c.nome} ${c.cidade}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (rfmFilter !== "all" && c.rfmSegmento !== rfmFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  }), [clientes, q, rfmFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const items = filtered.slice((page - 1) * PER, page * PER);
  const totalRfm = rfmDist.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <Topbar crumb="CADASTROS · CLIENTES" title="Clientes" icon={<Users className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Quem são meus clientes?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Carregando dados reais…"
                : `${kpis.totalClientes.toLocaleString("pt-BR")} clientes · base ativa, RFM, concentração e LTV`}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/segmentos" className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-neutral-400">
              Ver segmentação RFM →
            </Link>
            <ExportMenu
              filename="clientes"
              rows={filtered.map((c) => ({
                codigo: c.codigo, nome: c.nome, rfm: c.rfmSegmento,
                cidade: c.cidade, uf: c.uf, pedidos: c.totalPedidos,
                receita: c.receitaTotal, ticket: c.ticketMedio,
                diasSemComprar: c.diasSemComprar, status: c.status,
              }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Base Ativa" value={kpis.baseAtiva.toLocaleString("pt-BR")} hint="compras < 90 dias" icon={UserCheck} />
          <KpiCard label="Em Risco" value={kpis.emRisco.toLocaleString("pt-BR")} hint="90 a 180 dias sem compra" icon={AlertTriangle} accent />
          <KpiCard label="Inativos" value={kpis.baseInativa.toLocaleString("pt-BR")} hint="sem compra > 180d" icon={UserX} />
          <KpiCard label="Receita Total" value={formatBRL(kpis.receitaTotal)} hint="todos os pedidos" icon={DollarSign} />
          <KpiCard label="Ticket Médio" value={formatBRL(kpis.ticketMedio)} hint="por pedido" icon={Receipt} />
          <KpiCard label="Concentração Top 10" value={`${kpis.concentracaoTop10}%`} hint="da receita total" icon={Crown} />
          <KpiCard label="LTV Médio" value={formatBRL(kpis.ltvMedio)} hint="receita média por cliente" icon={TrendingUp} />
          <KpiCard label="Total Clientes" value={kpis.totalClientes.toLocaleString("pt-BR")} hint="com pelo menos 1 pedido" icon={Users} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Concentração de Receita (Pareto)" subtitle="Top 20 clientes · barras + % acumulado" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={concentracaoPareto} margin={{ top: 8, right: 24, bottom: 28, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="nome" tick={{ fontSize: 9 }} angle={-35} textAnchor="end" interval={0} height={48} />
                <YAxis yAxisId="bar" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}K`} />
                <YAxis yAxisId="line" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v: unknown, name: unknown) => name === "acumuladoPct" ? [`${v}%`, "Acumulado"] : [formatBRL(Number(v)), "Receita"]} />
                <Bar yAxisId="bar" dataKey="receita" radius={[3, 3, 0, 0]}>
                  {concentracaoPareto.map((_, i) => <Cell key={i} fill={i < 3 ? "#C99E00" : "#F5C400"} />)}
                </Bar>
                <Line yAxisId="line" type="monotone" dataKey="acumuladoPct" stroke="#E65100" strokeWidth={2} dot={false} name="% Acumulado" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Top 10 Clientes" subtitle="por receita acumulada">
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-xs">
                <tbody>
                  {isLoading && <tr><td colSpan={4} className="px-2 py-8 text-center text-muted-foreground">Carregando…</td></tr>}
                  {top10.map((c, i) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-2 py-2 font-mono text-muted-foreground">#{i + 1}</td>
                      <td className="px-2 py-2">
                        <Link to="/clientes/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.nome}</Link>
                      </td>
                      <td className="px-2 py-2 text-right font-mono font-bold">{formatBRL(c.receita)}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{c.pctTotal}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Distribuição RFM" subtitle="Clientes por segmento comportamental">
            <div className="space-y-2 p-1">
              {rfmDist.map((d) => {
                const pct = totalRfm > 0 ? Math.round((d.count / totalRfm) * 100) : 0;
                return (
                  <div key={d.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        {d.segmento}
                      </span>
                      <span className="font-mono">
                        {d.count} <span className="text-muted-foreground">({pct}%) · {formatBRL(d.receitaTotal)}</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card title="Novos Clientes por Mês" subtitle="Primeiros pedidos · últimos 12 meses">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mesesNovos} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="novos" stroke="#0288D1" fill="#0288D1" fillOpacity={0.2} name="Novos clientes" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        <div className="mt-6 mb-3">
          <h3 className="text-lg font-bold">Lista de Clientes</h3>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Código, nome ou cidade…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={rfmFilter} onValueChange={(v) => { setRfmFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Segmento RFM" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {(Object.keys(RFM_LABELS) as RFMSegmento[]).map((k) => (
                <SelectItem key={k} value={k}>{RFM_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em_risco">Em Risco</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Código</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-left">Segmento RFM</th>
                  <th className="px-4 py-2 text-left">Cidade/UF</th>
                  <th className="px-4 py-2 text-right">Pedidos</th>
                  <th className="px-4 py-2 text-right">Receita</th>
                  <th className="px-4 py-2 text-right">Ticket</th>
                  <th className="px-4 py-2 text-right">Dias s/ compra</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Carregando dados reais…</td></tr>
                )}
                {!isLoading && items.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</td></tr>
                )}
                {items.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                    className="cursor-pointer border-t border-border hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 font-mono text-xs">{c.codigo}</td>
                    <td className="px-4 py-2 font-medium">{c.nome}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ background: RFM_COLORS[c.rfmSegmento] }} />
                        {RFM_LABELS[c.rfmSegmento]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">{c.cidade}{c.uf ? `/${c.uf}` : ""}</td>
                    <td className="px-4 py-2 text-right font-mono">{c.totalPedidos}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">{formatBRL(c.receitaTotal)}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatBRL(c.ticketMedio)}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{c.diasSemComprar}d</td>
                    <td className="px-4 py-2"><StatusPill s={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">Exibindo {items.length} de {filtered.length} clientes</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Button>
              <span className="px-2 font-mono">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
