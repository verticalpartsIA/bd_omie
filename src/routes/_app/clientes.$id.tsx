import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Users, Mail, Phone, MapPin, Calendar, Briefcase } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  formatBRL, getClienteById, historicoComprasCliente, pedidosCliente,
  rfmColor, rfmLabel, segmentosLabel,
} from "@/data/clientes-mock";

export const Route = createFileRoute("/_app/clientes/$id")({
  head: () => ({ meta: [{ title: "Cliente — VerticalParts" }] }),
  loader: ({ params }) => {
    const c = getClienteById(params.id);
    if (!c) throw notFound();
    return { cliente: c };
  },
  notFoundComponent: () => (
    <div className="flex h-full items-center justify-center p-12 text-sm text-muted-foreground">
      Cliente não encontrado. <Link to="/clientes" className="ml-2 text-primary underline">Voltar</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor"]}>
      <ClienteDetail />
    </RoleGuard>
  ),
});

function ClienteDetail() {
  const toggle = useSidebarToggle();
  const { cliente: c } = Route.useLoaderData();
  const historico = historicoComprasCliente(c.id);
  const pedidos = pedidosCliente(c.id);
  const rfmSeg = c.rfm.segmento;

  return (
    <>
      <Topbar crumb="CADASTROS · CLIENTES · DETALHE" title={c.nome} icon={<Users className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <Link to="/clientes" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Voltar para clientes
        </Link>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[28px] font-extrabold tracking-tight">{c.nome}</h2>
              <span className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: rfmColor[rfmSeg] }}>
                {rfmLabel[rfmSeg]}
              </span>
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{c.codigo} · CNPJ {c.cnpj}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-1">
            <h4 className="mb-4 text-sm font-bold">Informações</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> {segmentosLabel[c.segmento]}</li>
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> {c.cidade} / {c.uf}</li>
              <li className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Cliente desde {new Date(c.primeiraCompra).toLocaleDateString("pt-BR")}</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> contato@{c.nome.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16)}.com.br</li>
              <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> (11) 9{String(1000 + parseInt(c.id.slice(2)) * 7).slice(-4)}-{String(2000 + parseInt(c.id.slice(2)) * 13).slice(-4)}</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> Vendedor: {c.vendedor}</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            <Stat label="Receita Total" value={formatBRL(c.receitaTotal)} />
            <Stat label="LTV Estimado" value={formatBRL(c.ltv)} accent />
            <Stat label="Pedidos" value={c.totalPedidos.toString()} />
            <Stat label="Ticket Médio" value={formatBRL(c.ticketMedio)} />
            <Stat label="Última Compra" value={`${c.diasSemComprar} dias`} />
            <Stat label="RFM" value={`R${c.rfm.r} F${c.rfm.f} M${c.rfm.m}`} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Histórico de Compras (12 meses)</h4>
              <p className="text-[11px] text-muted-foreground">Receita gerada por mês</p>
            </div>
            <div className="p-3">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={historico} margin={{ top: 10, right: 16, bottom: 8, left: 8 }}>
                  <defs>
                    <linearGradient id="cli-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5C400" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="#F5C400" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                  <Area type="monotone" dataKey="valor" stroke="#F5C400" strokeWidth={2} fill="url(#cli-area)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Últimos Pedidos</h4>
              <p className="text-[11px] text-muted-foreground">Histórico recente</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Pedido</th>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-right">Itens</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pedidos.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum pedido</td></tr>
                  )}
                  {pedidos.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">{p.id}</td>
                      <td className="px-3 py-2 text-xs">{new Date(p.data).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{p.itens}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{formatBRL(p.valor)}</td>
                      <td className="px-3 py-2 text-xs">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm ${accent ? "border-l-4 border-l-primary" : "border-border"}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-mono text-2xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}