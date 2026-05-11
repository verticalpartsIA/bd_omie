import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ShoppingCart, Truck, Clock, AlertTriangle, Package, FileWarning, DollarSign, ShieldCheck, Crown } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  Line, LineChart, Cell, PieChart, Pie, ComposedChart,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { ExportMenu } from "@/components/app/ExportMenu";
import { AlertasRecomendacoes, type AlertItem } from "@/components/app/AlertasRecomendacoes";
import { useSidebarToggle } from "../_app";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  pedidos, kpisPedidos, slaHistorico, cicloEtapas, ageingDistribuicao, distribuicaoStatus,
  formatBRL, statusLabel, statusColor, type StatusPedido,
  kpisExt, slaPorEtapa, rankingAtrasosClientes, rankingMotivos,
} from "@/data/pedidos-mock";

export const Route = createFileRoute("/_app/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos & Logística — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor", "estoque"]}>
      <PedidosPage />
    </RoleGuard>
  ),
});

function PedidosPage() {
  const toggle = useSidebarToggle();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => pedidos.filter((p) => {
    if (q && !`${p.numero} ${p.cliente} ${p.vendedor}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (status !== "all" && p.status !== status) return false;
    return true;
  }), [q, status]);

  const alertas: AlertItem[] = [
    ...pedidos.filter((p) => p.vipCliente && p.ageingHoras > 48 && p.status !== "entregue").slice(0, 2).map((p) => ({
      level: "critico" as const,
      title: `Cliente VIP atrasado · ${p.cliente}`,
      detail: `${p.numero} · ${p.ageingHoras}h em aberto · ${formatBRL(p.valor)}`,
      acao: "Acionar coordenador de logística agora.",
    })),
    ...(kpisExt.bloqueadosFinanceiro > 0 ? [{
      level: "atencao" as const,
      title: `${kpisExt.bloqueadosFinanceiro} pedidos bloqueados pelo financeiro`,
      acao: "Revisar limite de crédito junto ao Financeiro.",
    }] : []),
    ...(kpisPedidos.faturasAtraso > 0 ? [{
      level: "atencao" as const,
      title: `${kpisPedidos.faturasAtraso} faturas vencidas vinculadas a pedidos`,
      acao: "Régua de cobrança automática.",
    }] : []),
  ];

  return (
    <>
      <Topbar crumb="OPERAÇÃO · PEDIDOS" title="Pedidos & Logística" icon={<ShoppingCart className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Atendendo com qualidade e no prazo?</h2>
            <p className="mt-1 text-sm text-muted-foreground">OTIF, SLA, prioridades, motivos e ações imediatas.</p>
          </div>
          <ExportMenu filename="pedidos" rows={pedidos as unknown as Array<Record<string, string | number>>} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <KpiCard accent label="OTIF" value={`${kpisExt.otif}%`} delta={kpisExt.otifDelta} hint="On time + In full" icon={ShieldCheck} />
          <KpiCard label="Pedidos Críticos" value={String(kpisExt.criticos)} hint="Ação imediata" icon={AlertTriangle} />
          <KpiCard label="SLA Entrega" value={`${kpisPedidos.slaEntrega}%`} delta={kpisPedidos.slaDelta} icon={Truck} accent />
          <KpiCard label="Ciclo Médio" value={`${kpisPedidos.cicloMedio}h`} delta={kpisPedidos.cicloDelta} icon={Clock} />
          <KpiCard label="Taxa de Problema" value={`${kpisPedidos.taxaProblema}%`} delta={kpisPedidos.problemaDelta} icon={AlertTriangle} />
          <KpiCard label="Em Aberto" value={String(kpisPedidos.emAberto)} delta={kpisPedidos.emAbertoDelta} icon={Package} />
          <KpiCard label="Carteira" value={formatBRL(kpisPedidos.carteira)} icon={DollarSign} />
          <KpiCard label="Faturas em Atraso" value={String(kpisPedidos.faturasAtraso)} delta={kpisPedidos.atrasoDelta} icon={FileWarning} />
        </div>

        {/* SLA por etapa + Alertas */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">SLA por Etapa</h4>
            <p className="text-[11px] text-muted-foreground">Realizado vs meta</p>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={slaPorEtapa} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="etapa" tick={{ fontSize: 10 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip formatter={(v: unknown) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="sla" name="Realizado" fill="#F5C400" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#161616" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="lg:col-span-2">
            <AlertasRecomendacoes title="Alertas Logísticos" items={alertas} />
          </div>
        </div>

        {/* Rankings: clientes com mais atrasos + motivos */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Clientes com mais atrasos</h4>
            <p className="text-[11px] text-muted-foreground">Onde concentrar ação comercial</p>
            <ul className="mt-3 space-y-1">
              {rankingAtrasosClientes.map((r, i) => (
                <li key={r.cliente} className="flex items-center justify-between border-b border-border py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    <span className="font-semibold">{r.cliente}</span>
                    {r.vip && <span className="inline-flex items-center gap-1 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-extrabold text-primary"><Crown className="h-2.5 w-2.5" />VIP</span>}
                  </span>
                  <span className="font-mono font-bold text-destructive">{r.qtd} atrasos</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Motivos de problema/atraso</h4>
            <p className="text-[11px] text-muted-foreground">Ranking causa-raiz</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rankingMotivos} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="motivo" type="category" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="qtd" fill="#C62828" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">SLA de entrega — últimos 6 meses</h4>
            <p className="text-[11px] text-muted-foreground">Meta: 95% no prazo</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={slaHistorico} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(v: unknown) => `${v}%`} />
                  <Line type="monotone" dataKey="sla" stroke="#2E7D32" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Distribuição por status</h4>
            <p className="text-[11px] text-muted-foreground">Onde está o backlog</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={distribuicaoStatus} dataKey="count" nameKey="status" innerRadius={42} outerRadius={78} paddingAngle={2}>
                    {distribuicaoStatus.map((d) => <Cell key={d.key} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
              {distribuicaoStatus.map((d) => (
                <li key={d.key} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  <span className="truncate">{d.status}</span>
                  <span className="ml-auto font-mono font-bold">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Tempo médio por etapa</h4>
            <p className="text-[11px] text-muted-foreground">Onde está o gargalo do ciclo do pedido</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cicloEtapas} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="etapa" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}h`} />
                  <Tooltip formatter={(v: unknown) => `${v}h`} />
                  <Bar dataKey="horas" fill="#F5C400" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Aging de pedidos em aberto</h4>
            <p className="text-[11px] text-muted-foreground">Vermelho exige ação imediata</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={ageingDistribuicao} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4,4,0,0]}>
                    {ageingDistribuicao.map((a, i) => <Cell key={i} fill={a.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
            <div className="flex-1">
              <h4 className="text-sm font-bold">Pedidos</h4>
              <p className="text-[11px] text-muted-foreground">{filtered.length} resultados</p>
            </div>
            <Input placeholder="Buscar por número, cliente, vendedor…" value={q} onChange={(e) => setQ(e.target.value)} className="w-[260px]" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(statusLabel) as StatusPedido[]).map((s) => <SelectItem key={s} value={s}>{statusLabel[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Número</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Vendedor</th>
                  <th className="px-3 py-2 text-right">Itens</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                  <th className="px-3 py-2 text-right">Aging</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Fatura</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 30).map((p) => {
                  const vencida = !p.faturaPaga && new Date(p.faturaVencimento).getTime() < Date.now();
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{p.numero}</td>
                      <td className="px-3 py-2">{p.cliente}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.vendedor}</td>
                      <td className="px-3 py-2 text-right font-mono">{p.itens}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(p.valor)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${p.ageingHoras > 48 ? "text-destructive font-bold" : ""}`}>{p.ageingHoras}h</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[10px] font-bold" style={{ background: `${statusColor[p.status]}20`, color: statusColor[p.status] }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor[p.status] }} />
                          {statusLabel[p.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {p.faturaPaga ? <span className="text-success">Paga</span> : vencida ? <span className="font-bold text-destructive">Vencida</span> : <span className="text-muted-foreground">A vencer</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}