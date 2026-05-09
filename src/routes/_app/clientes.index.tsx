import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Search, UserCheck, UserX, AlertTriangle, DollarSign, Receipt, RefreshCw, Crown, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { KpiCard } from "@/components/app/KpiCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConcentracaoChart } from "@/components/charts/ConcentracaoChart";
import { ReativacaoChart } from "@/components/charts/ReativacaoChart";
import {
  clientes, concentracaoPareto, formatBRL, kpisClientes, reativacaoMensal,
  rfmColor, rfmLabel, segmentosLabel, top10Clientes,
  type SegmentoCliente, type StatusCliente,
} from "@/data/clientes-mock";

export const Route = createFileRoute("/_app/clientes/")({
  head: () => ({ meta: [{ title: "Clientes — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor"]}>
      <ClientesPage />
    </RoleGuard>
  ),
});

function ClientesPage() {
  const toggle = useSidebarToggle();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const PER = 15;

  const filtered = useMemo(() => clientes.filter((c) => {
    if (q && !`${c.codigo} ${c.nome} ${c.cidade}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (seg !== "all" && c.segmento !== seg) return false;
    if (status !== "all" && c.status !== status) return false;
    return true;
  }), [q, seg, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const items = filtered.slice((page - 1) * PER, page * PER);

  return (
    <>
      <Topbar crumb="CADASTROS · CLIENTES" title="Clientes" icon={<Users className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Quem são meus clientes?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Base ativa, RFM, concentração e LTV por segmento.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/segmentos" className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-neutral-400">Ver segmentação RFM →</Link>
            <button className="rounded bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">Exportar CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Base Ativa (90d)" value={kpisClientes.baseAtiva.toString()} delta={kpisClientes.baseAtivaDelta} hint="clientes compraram" icon={UserCheck} />
          <KpiCard label="Base Inativa" value={kpisClientes.baseInativa.toString()} delta={kpisClientes.baseInativaDelta} hint="sem compra > 180d" icon={UserX} />
          <KpiCard accent label="Em Risco" value={kpisClientes.emRisco.toString()} delta={kpisClientes.emRiscoDelta} hint="entre 90 e 180d" icon={AlertTriangle} />
          <KpiCard label="Receita Total" value={formatBRL(kpisClientes.receitaTotal)} delta={kpisClientes.receitaTotalDelta} hint="acumulado" icon={DollarSign} />
          <KpiCard label="Ticket Médio" value={formatBRL(kpisClientes.ticketMedio)} delta={kpisClientes.ticketMedioDelta} hint="por pedido" icon={Receipt} />
          <KpiCard label="Taxa de Reativação" value={`${kpisClientes.taxaReativacao}%`} delta={kpisClientes.taxaReativacaoDelta} hint="inativos → ativos" icon={RefreshCw} />
          <KpiCard label="Concentração Top 10" value={`${kpisClientes.concentracaoTop10}%`} hint="da receita total" icon={Crown} />
          <KpiCard label="LTV Médio" value={formatBRL(kpisClientes.ltvMedio)} hint="por cliente" icon={TrendingUp} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card title="Concentração de Receita (Pareto)" subtitle="Top 20 clientes — barras + % acumulado" className="lg:col-span-2">
            <ConcentracaoChart data={concentracaoPareto} />
          </Card>
          <Card title="Top 10 Clientes" subtitle="por receita acumulada">
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-xs">
                <tbody>
                  {top10Clientes.map((c, i) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-2 py-2 font-mono text-muted-foreground">#{i + 1}</td>
                      <td className="px-2 py-2">
                        <Link to="/clientes/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.nome}</Link>
                        <div className="text-[10px] text-muted-foreground">{segmentosLabel[c.segmento]}</div>
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
          <Card title="Reativação de Clientes Inativos" subtitle="Abordagens vs. retornos por mês">
            <ReativacaoChart data={reativacaoMensal} />
          </Card>
          <Card title="Distribuição RFM" subtitle="Clientes por segmento comportamental">
            <div className="grid grid-cols-2 gap-2 p-2">
              {(Object.keys(rfmLabel) as Array<keyof typeof rfmLabel>).map((k) => {
                const count = clientes.filter((c) => c.rfm.segmento === k).length;
                return (
                  <div key={k} className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: rfmColor[k] }} />
                      <span className="text-xs font-semibold">{rfmLabel[k]}</span>
                    </div>
                    <span className="font-mono text-sm font-bold">{count}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">Lista de Clientes</h3>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Código, nome ou cidade..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={seg} onValueChange={(v) => { setSeg(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos segmentos</SelectItem>
              {(Object.keys(segmentosLabel) as SegmentoCliente[]).map((k) => (
                <SelectItem key={k} value={k}>{segmentosLabel[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
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
                  <th className="px-4 py-2 text-left">Segmento</th>
                  <th className="px-4 py-2 text-left">Cidade/UF</th>
                  <th className="px-4 py-2 text-right">Pedidos</th>
                  <th className="px-4 py-2 text-right">Receita</th>
                  <th className="px-4 py-2 text-right">Ticket</th>
                  <th className="px-4 py-2 text-right">Última</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</td></tr>
                )}
                {items.map((c) => (
                  <tr key={c.id} onClick={() => navigate({ to: "/clientes/$id", params: { id: c.id } })}
                    className="cursor-pointer border-t border-border hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{c.codigo}</td>
                    <td className="px-4 py-2 font-medium">{c.nome}</td>
                    <td className="px-4 py-2 text-xs">{segmentosLabel[c.segmento]}</td>
                    <td className="px-4 py-2 text-xs">{c.cidade}/{c.uf}</td>
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

function Card({ title, subtitle, children, className }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
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

const STATUS_STYLE: Record<StatusCliente, string> = {
  ativo: "bg-green-100 text-green-800",
  novo: "bg-blue-100 text-blue-800",
  em_risco: "bg-orange-100 text-orange-800",
  inativo: "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<StatusCliente, string> = { ativo: "Ativo", novo: "Novo", em_risco: "Em Risco", inativo: "Inativo" };

function StatusPill({ s }: { s: StatusCliente }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[s]}`}>{STATUS_LABEL[s]}</span>;
}