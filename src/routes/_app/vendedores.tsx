import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, Target, Filter, TrendingUp, Percent, DollarSign, Receipt, Users } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  Line, LineChart, FunnelChart, Funnel, LabelList, Cell, AreaChart, Area,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { useSidebarToggle } from "../_app";
import {
  vendedores, funil, conversaoEtapas, cacPorCanal, comissaoMensal,
  kpisComercial, formatBRL, etapaLabel, canalLabel, totalMeta, totalRealizado,
} from "@/data/comercial-mock";
import { AlertasRecomendacoes } from "@/components/app/AlertasRecomendacoes";
import { vendedoresAcao } from "@/data/insights-mock";

export const Route = createFileRoute("/_app/vendedores")({
  head: () => ({ meta: [{ title: "Comercial — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor"]}>
      <ComercialPage />
    </RoleGuard>
  ),
});

function ComercialPage() {
  const toggle = useSidebarToggle();
  const ranked = [...vendedores].sort((a, b) => b.realizado / b.meta - a.realizado / a.meta);

  const evolucaoData = Array.from({ length: vendedores[0].diaAtual }, (_, d) => {
    const point: Record<string, number | string> = { dia: `D${d + 1}` };
    vendedores.forEach((v) => { point[v.nome] = v.evolucao[d]; });
    return point;
  });

  const funilData = funil.map((f) => ({ name: etapaLabel[f.etapa], value: f.quantidade, valor: f.valor }));
  const cacData = cacPorCanal.map((c) => ({ canal: canalLabel[c.canal], cac: c.cac, clientes: c.clientes }));

  return (
    <>
      <Topbar crumb="OPERAÇÃO · COMERCIAL" title="Time Comercial" icon={<Briefcase className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5">
          <h2 className="text-[26px] font-extrabold tracking-tight">Meu time está performando?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Atingimento, pipeline, conversão, CAC e comissões.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Atingimento Médio" value={`${kpisComercial.atingimentoMedio}%`} delta={kpisComercial.atingimentoDelta} icon={Target} accent />
          <KpiCard label="Pipeline" value={formatBRL(kpisComercial.pipelineValor)} delta={kpisComercial.pipelineDelta} icon={TrendingUp} />
          <KpiCard label="Conversão Geral" value={`${kpisComercial.conversaoGeral}%`} delta={kpisComercial.conversaoDelta} icon={Percent} />
          <KpiCard label="CAC Médio" value={formatBRL(kpisComercial.cacMedio)} delta={kpisComercial.cacDelta} icon={Users} />
          <KpiCard label="Ticket Médio" value={formatBRL(kpisComercial.ticketMedio)} delta={kpisComercial.ticketDelta} icon={Receipt} />
          <KpiCard label="Comissões do Mês" value={formatBRL(kpisComercial.comissaoMes)} delta={kpisComercial.comissaoDelta} icon={DollarSign} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Atingimento de meta por vendedor</h4>
            <p className="text-[11px] text-muted-foreground">% sobre meta total · barras destacam quem ultrapassou 100% do esperado para o dia atual</p>
            <div className="mt-3 space-y-3">
              {ranked.map((v) => {
                const esperado = v.meta * (v.diaAtual / v.diasUteis);
                const pct = Math.round((v.realizado / esperado) * 100);
                const pctMeta = Math.round((v.realizado / v.meta) * 100);
                const cor = pct >= 100 ? "#2E7D32" : pct >= 80 ? "#F5C400" : "#C62828";
                return (
                  <div key={v.id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{v.nome}</span>
                      <span className="font-mono">
                        {formatBRL(v.realizado)} <span className="text-muted-foreground">/ {formatBRL(v.meta)}</span>
                        <span className="ml-2 font-bold" style={{ color: cor }}>{pctMeta}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pctMeta)}%`, background: cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">Total do time</span>
              <span className="font-mono font-bold">{formatBRL(totalRealizado)} / {formatBRL(totalMeta)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Funil Comercial</h4>
            <p className="text-[11px] text-muted-foreground">Volume por etapa · receita projetada</p>
            <div className="mt-3 space-y-2">
              {funilData.map((f, i) => {
                const pct = (f.value / funilData[0].value) * 100;
                return (
                  <div key={f.name}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{f.name}</span>
                      <span className="font-mono text-muted-foreground">{f.value} · {formatBRL(f.valor)}</span>
                    </div>
                    <div className="h-7 w-full rounded bg-muted">
                      <div className="flex h-full items-center justify-end rounded bg-primary px-2 text-[10px] font-bold text-primary-foreground" style={{ width: `${pct}%` }}>
                        {Math.round(pct)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Evolução diária acumulada</h4>
            <p className="text-[11px] text-muted-foreground">Ritmo de cada vendedor ao longo do mês</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolucaoData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {vendedores.map((v, i) => (
                    <Line key={v.id} type="monotone" dataKey={v.nome} stroke={["#F5C400","#0288D1","#2E7D32","#C62828","#7B1FA2","#E65100","#00838F","#5D4037"][i % 8]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Conversão entre etapas</h4>
            <p className="text-[11px] text-muted-foreground">Onde estamos perdendo oportunidades?</p>
            <ul className="mt-3 space-y-2 text-xs">
              {conversaoEtapas.map((c, i) => (
                <li key={i} className="flex items-center justify-between rounded border border-border bg-background px-3 py-2">
                  <span><span className="text-muted-foreground">{c.de}</span> → <span className="font-semibold">{c.para}</span></span>
                  <span className={`font-mono font-bold ${c.taxa >= 40 ? "text-success" : c.taxa >= 20 ? "text-primary" : "text-destructive"}`}>{c.taxa}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">CAC por canal de aquisição</h4>
            <p className="text-[11px] text-muted-foreground">Investimento ÷ novos clientes adquiridos</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={cacData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="canal" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                  <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                  <Bar dataKey="cac" name="CAC" fill="#F5C400" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Comissões acumuladas (6 meses)</h4>
            <p className="text-[11px] text-muted-foreground">Folha variável projetada do time comercial</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={comissaoMensal} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                  <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                  <Area type="monotone" dataKey="comissao" stroke="#0288D1" fill="#0288D1" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h4 className="text-sm font-bold">Resumo por vendedor</h4>
            <p className="text-[11px] text-muted-foreground">Realizado, ticket, pedidos e comissão</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Vendedor</th>
                  <th className="px-3 py-2 text-right">Meta</th>
                  <th className="px-3 py-2 text-right">Realizado</th>
                  <th className="px-3 py-2 text-right">% Meta</th>
                  <th className="px-3 py-2 text-right">Margem est.</th>
                  <th className="px-3 py-2 text-right">Desconto méd.</th>
                  <th className="px-3 py-2 text-right">Pedidos</th>
                  <th className="px-3 py-2 text-right">Ticket</th>
                  <th className="px-3 py-2 text-right">Comissão</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((v) => {
                  const pct = Math.round((v.realizado / v.meta) * 100);
                  const margem = Math.round(v.realizado * 0.34);
                  const desconto = Math.round(((v.id.charCodeAt(2) % 7) + 4) * 10) / 10;
                  return (
                    <tr key={v.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{v.nome}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(v.meta)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(v.realizado)}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${pct >= 80 ? "text-success" : pct >= 50 ? "text-primary" : "text-destructive"}`}>{pct}%</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(margem)}</td>
                      <td className="px-3 py-2 text-right font-mono">{desconto}%</td>
                      <td className="px-3 py-2 text-right font-mono">{v.pedidos}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(v.ticketMedio)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(v.comissao)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6">
          <AlertasRecomendacoes title="Vendedores que precisam de atenção" items={vendedoresAcao} empty="Time inteiro no ritmo esperado." />
        </div>
      </main>
    </>
  );
}