import { createFileRoute } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { formatBRL } from "@/lib/format";
import { useClientesDashboard, RFM_COLORS, RFM_LABELS, type RFMSegmento } from "@/hooks/useClientesDashboard";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  Scatter, ScatterChart, ZAxis,
} from "recharts";

export const Route = createFileRoute("/_app/segmentos")({
  head: () => ({ meta: [{ title: "Segmentação RFM — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor"]}>
      <SegmentosPage />
    </RoleGuard>
  ),
});

const CHART_COLORS = ["#F5C400", "#2E7D32", "#0288D1", "#E65100", "#7B1FA2", "#9E9E9E"];

function SegmentosPage() {
  const toggle = useSidebarToggle();
  const { data, isLoading } = useClientesDashboard();
  const { clientes, rfmDist, kpis } = data;

  // Scatter plot data — one point per client (capped at 500 for perf)
  const scatterData = clientes.slice(0, 500).map((c) => ({
    x: c.rfmR,
    y: c.rfmF,
    z: c.rfmM * 30,
    nome: c.nome,
    seg: c.rfmSegmento,
    receita: c.receitaTotal,
  }));

  // Per-segment summary (receita + ticket médio + count)
  const segSummary = (Object.keys(RFM_LABELS) as RFMSegmento[]).map((seg) => {
    const group = clientes.filter((c) => c.rfmSegmento === seg);
    const receita = group.reduce((s, c) => s + c.receitaTotal, 0);
    const ticket = group.length > 0 ? Math.round(receita / group.length) : 0;
    return { seg, label: RFM_LABELS[seg], color: RFM_COLORS[seg], count: group.length, receita, ticket };
  }).sort((a, b) => b.receita - a.receita);

  // Receita recuperável (em_risco + inativo)
  const receitaRecuperavel = clientes
    .filter((c) => c.status === "em_risco" || c.status === "inativo")
    .reduce((s, c) => s + c.receitaTotal, 0);

  const totalRfm = rfmDist.reduce((s, d) => s + d.count, 0);

  return (
    <>
      <Topbar crumb="CADASTROS · SEGMENTAÇÃO" title="Segmentação RFM" icon={<Tag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} extra={<USDCalendarWidget />} />
      <main className="flex-1 px-7 pb-16 pt-6">

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Segmentação Comportamental</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              RFM (Recência, Frequência, Monetário) · {isLoading ? "carregando…" : `${kpis.totalClientes.toLocaleString("pt-BR")} clientes analisados`}
            </p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Receita recuperável estimada</div>
            <div className="font-mono text-2xl font-extrabold text-primary">{formatBRL(receitaRecuperavel)}</div>
            <div className="text-[10px] text-muted-foreground">se 100% dos em risco / inativos reativados em 6m</div>
          </div>
        </div>

        {/* RFM Scatter + Distribution */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Mapa RFM</h4>
            <p className="text-[11px] text-muted-foreground">Eixo X: Recência · Eixo Y: Frequência · Tamanho: Monetário</p>
            <div className="mt-2">
              <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" dataKey="x" name="Recência" domain={[0, 4]} tick={{ fontSize: 10 }} label={{ value: "Recência →", position: "insideBottom", offset: -4, fontSize: 10 }} />
                  <YAxis type="number" dataKey="y" name="Frequência" domain={[0, 4]} tick={{ fontSize: 10 }} label={{ value: "Frequência →", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <ZAxis type="number" dataKey="z" range={[40, 400]} name="Monetário" />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(v: unknown, name: unknown) => [String(v), String(name)]}
                    labelFormatter={(_l: unknown, payload: unknown) => {
                      const arr = payload as Array<{ payload?: { nome?: string; seg?: string } }> | undefined;
                      const p = arr?.[0]?.payload;
                      return p?.nome ? `${p.nome} · ${p.seg ?? ""}` : "";
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((p, i) => (
                      <Cell key={i} fill={RFM_COLORS[p.seg as RFMSegmento]} fillOpacity={0.75} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Distribuição por Segmento</h4>
            <p className="text-[11px] text-muted-foreground">Quantidade de clientes</p>
            <div className="mt-3 space-y-2">
              {rfmDist.map((d) => {
                const pct = totalRfm > 0 ? Math.round((d.count / totalRfm) * 1000) / 10 : 0;
                return (
                  <div key={d.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        {d.segmento}
                      </span>
                      <span className="font-mono">{d.count} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Receita por segmento (bar) + Resumo tabela */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Receita por Segmento RFM</h4>
            <p className="text-[11px] text-muted-foreground">Receita acumulada · últimos 18 meses</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={segSummary} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: unknown) => [formatBRL(Number(v)), "Receita"]} />
                  <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                    {segSummary.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Resumo por Segmento RFM</h4>
              <p className="text-[11px] text-muted-foreground">Clientes, ticket médio e receita acumulada</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Segmento</th>
                    <th className="px-3 py-2 text-right">Clientes</th>
                    <th className="px-3 py-2 text-right">Ticket Médio</th>
                    <th className="px-3 py-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {segSummary.map((s) => (
                    <tr key={s.seg} className="border-t border-border">
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2 font-medium">
                          <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{s.count}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(s.ticket)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{formatBRL(s.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Cards por segmento */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(RFM_LABELS) as RFMSegmento[]).map((seg) => {
            const list = clientes.filter((c) => c.rfmSegmento === seg).slice(0, 5);
            const playbooks: Record<RFMSegmento, { acao: string; canal: string; meta: string }> = {
              champion:  { acao: "Programa de fidelidade VIP", canal: "WhatsApp + ligação", meta: "Aumentar LTV em 20%" },
              loyal:     { acao: "Oferta exclusiva de renovação", canal: "E-mail + WhatsApp", meta: "Manter frequência" },
              potential: { acao: "Incentivo segunda compra", canal: "E-mail", meta: "Converter para Fiel" },
              em_risco:  { acao: "Campanha de reativação urgente", canal: "Ligação + WhatsApp", meta: "Recuperar em 30d" },
              novo:      { acao: "Onboarding + catálogo completo", canal: "E-mail + WhatsApp", meta: "Segunda compra em 45d" },
              inativo:   { acao: "Oferta especial de retorno", canal: "E-mail + SMS", meta: "Reativar 15% da base" },
            };
            const pb = playbooks[seg];
            return (
              <div key={seg} className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: RFM_COLORS[seg] }} />
                  <h4 className="text-xs font-bold">{RFM_LABELS[seg]}</h4>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    {clientes.filter((c) => c.rfmSegmento === seg).length}
                  </span>
                </div>
                <div className="border-b border-border bg-muted/30 px-4 py-2 text-[11px]">
                  <div><span className="font-bold">Ação:</span> {pb.acao}</div>
                  <div className="text-muted-foreground">{pb.canal}</div>
                  <div className="text-[10px] text-primary">→ {pb.meta}</div>
                </div>
                <ul className="divide-y divide-border text-xs">
                  {list.length === 0 && <li className="px-4 py-4 text-muted-foreground">Sem clientes</li>}
                  {list.map((c) => (
                    <li key={c.id} className="px-4 py-2">
                      <span className="font-medium">{c.nome}</span>
                      <div className="text-[10px] text-muted-foreground">{formatBRL(c.receitaTotal)} · {c.diasSemComprar}d sem comprar</div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
