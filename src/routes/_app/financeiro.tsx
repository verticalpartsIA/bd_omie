import { createFileRoute } from "@tanstack/react-router";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent, Landmark, Activity, Repeat, Banknote } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  Area, AreaChart, Line, ComposedChart,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { ExportMenu } from "@/components/app/ExportMenu";
import { AlertasRecomendacoes, type AlertItem } from "@/components/app/AlertasRecomendacoes";
import { useSidebarToggle } from "../_app";
import {
  fluxoCaixa, fluxoAcumulado, fluxoFaixas, contasReceber, contasPagar,
  dre, dreMargemPct, dreEbitdaPct, margemCategoria, evolucaoReceitaCusto,
  kpisFinanceiro, formatBRL,
  margemEbitdaPct, margemLiquidaPct, resultadoLiquido, capitalGiro, necessidadeCapitalGiro,
  receitaRecorrenteSerie, cenariosCaixa, rentabilidadeClientes,
} from "@/data/financeiro-mock";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <FinanceiroPage />
    </RoleGuard>
  ),
});

function Linha({ label, valor, bold, negative }: { label: string; valor: number; bold?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-border py-2 ${bold ? "font-bold text-base" : "text-sm"}`}>
      <span>{label}</span>
      <span className={`font-mono ${negative ? "text-destructive" : valor < 0 ? "text-destructive" : ""}`}>{formatBRL(valor)}</span>
    </div>
  );
}

function FinanceiroPage() {
  const toggle = useSidebarToggle();

  const alertasFin: AlertItem[] = [
    ...(fluxoFaixas.d30 < 200_000 ? [{ level: "critico", title: "Caixa projetado D+30 abaixo do mínimo", detail: `Saldo previsto: ${formatBRL(fluxoFaixas.d30)}`, acao: "Antecipar recebíveis ou renegociar prazo de fornecedores." } as AlertItem] : []),
    ...(kpisFinanceiro.inadimplencia > 3 ? [{ level: "atencao", title: `Inadimplência em ${kpisFinanceiro.inadimplencia}%`, detail: "Acima da meta de 3%.", acao: "Acionar régua de cobrança." } as AlertItem] : []),
    ...(necessidadeCapitalGiro > 0 ? [{ level: "atencao", title: "Necessidade de capital de giro", detail: `Gap estimado: ${formatBRL(necessidadeCapitalGiro)}`, acao: "Avaliar antecipação de recebíveis." } as AlertItem] : []),
    { level: "info", title: `EBITDA do mês em ${margemEbitdaPct}%`, detail: "Acima da média setorial (18%)." },
  ];

  const fluxoChart = fluxoCaixa.slice(0, 30).map((f, i) => ({
    dia: f.dia,
    entrada: f.entrada,
    saida: -f.saida,
    saldo: fluxoAcumulado[i].saldo,
  }));

  return (
    <>
      <Topbar crumb="OPERAÇÃO · FINANCEIRO" title="Financeiro" icon={<Wallet className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Tem caixa para operar?</h2>
            <p className="mt-1 text-sm text-muted-foreground">EBITDA, resultado, cenários, fluxo, DRE, margens e rentabilidade.</p>
          </div>
          <ExportMenu filename="financeiro" rows={rentabilidadeClientes as unknown as Array<Record<string, string | number>>} />
        </div>

        {/* Camada de resultado */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard accent label="EBITDA" value={formatBRL(dre.ebitda)} delta={kpisFinanceiro.ebitdaDelta} hint={`${margemEbitdaPct}% margem`} icon={Activity} />
          <KpiCard label="Resultado Líquido" value={formatBRL(resultadoLiquido)} hint={`${margemLiquidaPct}% margem`} icon={Percent} />
          <KpiCard label="Capital de Giro" value={formatBRL(capitalGiro)} icon={Banknote} />
          <KpiCard label="Necessidade Cap. Giro" value={formatBRL(necessidadeCapitalGiro)} hint="Gap projetado" icon={AlertTriangle} />
          <KpiCard label="Receita Recorrente" value={formatBRL(receitaRecorrenteSerie[receitaRecorrenteSerie.length - 1].recorrente)} icon={Repeat} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Saldo Hoje" value={formatBRL(fluxoFaixas.hoje)} icon={Landmark} accent />
          <KpiCard label="Projeção 30d" value={formatBRL(fluxoFaixas.d30)} icon={TrendingUp} />
          <KpiCard label="Projeção 90d" value={formatBRL(fluxoFaixas.d90)} icon={TrendingUp} />
          <KpiCard label="A Receber" value={formatBRL(kpisFinanceiro.contasReceber)} delta={kpisFinanceiro.contasReceberDelta} icon={DollarSign} />
          <KpiCard label="A Pagar" value={formatBRL(kpisFinanceiro.contasPagar)} delta={kpisFinanceiro.contasPagarDelta} icon={TrendingDown} />
          <KpiCard label="Inadimplência" value={`${kpisFinanceiro.inadimplencia}%`} delta={kpisFinanceiro.inadimplenciaDelta} icon={AlertTriangle} />
        </div>

        {/* Cenários + Alertas */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Cenários de Caixa · D+90</h4>
            <p className="text-[11px] text-muted-foreground">Simulação para tomada de decisão</p>
            <div className="mt-3 space-y-2">
              {[
                { label: "Conservador", v: cenariosCaixa.conservador, c: "border-l-destructive bg-destructive/5", txt: "text-destructive" },
                { label: "Provável",    v: cenariosCaixa.provavel,    c: "border-l-primary bg-primary/5",         txt: "text-foreground" },
                { label: "Agressivo",   v: cenariosCaixa.agressivo,   c: "border-l-success bg-success/5",         txt: "text-success" },
              ].map((s) => (
                <div key={s.label} className={`flex items-center justify-between rounded-md border-l-4 px-4 py-3 ${s.c}`}>
                  <span className="text-sm font-bold">{s.label}</span>
                  <span className={`font-mono text-lg font-extrabold ${s.txt}`}>{formatBRL(s.v)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-2">
            <AlertasRecomendacoes title="Alertas Financeiros" items={alertasFin} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Fluxo de Caixa Projetado · 30 dias</h4>
            <p className="text-[11px] text-muted-foreground">Entradas, saídas e saldo acumulado</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={fluxoChart} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="dia" tick={{ fontSize: 9 }} interval={2} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                  <Tooltip formatter={(v: unknown) => formatBRL(Math.abs(Number(v)))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="entrada" name="Entradas" fill="#2E7D32" />
                  <Bar dataKey="saida" name="Saídas" fill="#C62828" />
                  <Line type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="#F5C400" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Projeção de saldo</h4>
            <p className="text-[11px] text-muted-foreground">Caixa disponível ao longo de 90 dias</p>
            <div className="mt-3 space-y-3">
              {[
                { label: "Hoje", v: fluxoFaixas.hoje },
                { label: "Em 30 dias", v: fluxoFaixas.d30 },
                { label: "Em 60 dias", v: fluxoFaixas.d60 },
                { label: "Em 90 dias", v: fluxoFaixas.d90 },
              ].map((p) => (
                <div key={p.label} className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className={`font-mono font-bold ${p.v >= 0 ? "text-success" : "text-destructive"}`}>{formatBRL(p.v)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={fluxoAcumulado} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Area type="monotone" dataKey="saldo" stroke="#F5C400" fill="#F5C400" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Contas a Receber por aging</h4>
            <p className="text-[11px] text-muted-foreground">Total: {formatBRL(kpisFinanceiro.contasReceber)}</p>
            <div className="mt-3 space-y-2">
              {contasReceber.map((c) => {
                const pct = (c.valor / kpisFinanceiro.contasReceber) * 100;
                return (
                  <div key={c.faixa}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{c.faixa} <span className="text-muted-foreground">({c.count})</span></span>
                      <span className="font-mono">{formatBRL(c.valor)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Contas a Pagar por aging</h4>
            <p className="text-[11px] text-muted-foreground">Total: {formatBRL(kpisFinanceiro.contasPagar)}</p>
            <div className="mt-3 space-y-2">
              {contasPagar.map((c) => {
                const pct = (c.valor / kpisFinanceiro.contasPagar) * 100;
                return (
                  <div key={c.faixa}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold">{c.faixa} <span className="text-muted-foreground">({c.count})</span></span>
                      <span className="font-mono">{formatBRL(c.valor)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">DRE Simplificado · Mai/25</h4>
            <p className="text-[11px] text-muted-foreground">Margem bruta {dreMargemPct}% · EBITDA {dreEbitdaPct}%</p>
            <div className="mt-3">
              <Linha label="Receita Bruta" valor={dre.receitaBruta} />
              <Linha label="(-) Deduções" valor={dre.deducoes} />
              <Linha label="= Receita Líquida" valor={dre.receitaLiquida} bold />
              <Linha label="(-) CPV" valor={dre.cpv} />
              <Linha label="= Margem Bruta" valor={dre.margemBruta} bold />
              <Linha label="(-) Despesas Op." valor={dre.despesasOperacionais} />
              <Linha label="= EBITDA" valor={dre.ebitda} bold />
              <Linha label="= Resultado Líquido" valor={dre.resultadoLiquido} bold />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Margem bruta por categoria</h4>
            <p className="text-[11px] text-muted-foreground">Onde está a riqueza real</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={margemCategoria} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip formatter={(v: unknown, n: unknown) => n === "margemPct" ? `${v}%` : formatBRL(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="l" dataKey="receita" name="Receita" fill="#0288D1" />
                  <Bar yAxisId="l" dataKey="custo" name="Custo" fill="#C62828" />
                  <Line yAxisId="r" type="monotone" dataKey="margemPct" name="Margem %" stroke="#F5C400" strokeWidth={3} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h4 className="text-sm font-bold">Receita vs Custo · 6 meses</h4>
          <p className="text-[11px] text-muted-foreground">Evolução de margem absoluta</p>
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={evolucaoReceitaCusto} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="receita" name="Receita" fill="#2E7D32" radius={[4,4,0,0]} />
                <Bar dataKey="custo" name="Custo" fill="#C62828" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Receita recorrente vs não recorrente */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Receita Recorrente × Não Recorrente</h4>
            <p className="text-[11px] text-muted-foreground">Previsibilidade do faturamento</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={receitaRecorrenteSerie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="recorrente" name="Recorrente" stackId="a" fill="#F5C400" />
                <Bar dataKey="naoRecorrente" name="Não recorrente" stackId="a" fill="#808080" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Rentabilidade por Cliente</h4>
            <p className="text-[11px] text-muted-foreground">Top 5 mais lucrativos · Top 3 deficitários</p>
            <table className="mt-3 w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-1 text-left">Cliente</th><th className="py-1 text-right">Receita</th><th className="py-1 text-right">Margem%</th><th className="py-1 text-right">Lucro</th></tr>
              </thead>
              <tbody>
                {rentabilidadeClientes.slice(0, 5).map((c) => (
                  <tr key={c.nome} className="border-t border-border">
                    <td className="py-1.5 font-semibold">{c.nome}</td>
                    <td className="py-1.5 text-right font-mono">{formatBRL(c.receita)}</td>
                    <td className="py-1.5 text-right font-mono text-success font-bold">{c.margemPct}%</td>
                    <td className="py-1.5 text-right font-mono">{formatBRL(c.lucro)}</td>
                  </tr>
                ))}
                <tr><td colSpan={4} className="border-t border-border pt-2 text-[10px] uppercase tracking-wider text-destructive">Deficitários</td></tr>
                {rentabilidadeClientes.slice(-3).map((c) => (
                  <tr key={c.nome} className="border-t border-border">
                    <td className="py-1.5 font-semibold">{c.nome}</td>
                    <td className="py-1.5 text-right font-mono">{formatBRL(c.receita)}</td>
                    <td className="py-1.5 text-right font-mono text-destructive font-bold">{c.margemPct}%</td>
                    <td className="py-1.5 text-right font-mono text-destructive">{formatBRL(c.lucro)}</td>
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