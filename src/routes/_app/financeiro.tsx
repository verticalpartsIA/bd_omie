import { createFileRoute } from "@tanstack/react-router";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Percent, Landmark } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  Area, AreaChart, Line, ComposedChart,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { useSidebarToggle } from "../_app";
import {
  fluxoCaixa, fluxoAcumulado, fluxoFaixas, contasReceber, contasPagar,
  dre, dreMargemPct, dreEbitdaPct, margemCategoria, evolucaoReceitaCusto,
  kpisFinanceiro, formatBRL,
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
        <div className="mb-5">
          <h2 className="text-[26px] font-extrabold tracking-tight">Tem caixa para operar?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fluxo, contas, DRE, margem e inadimplência.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Saldo Hoje" value={formatBRL(fluxoFaixas.hoje)} icon={Landmark} accent />
          <KpiCard label="Projeção 30d" value={formatBRL(fluxoFaixas.d30)} icon={TrendingUp} />
          <KpiCard label="Projeção 90d" value={formatBRL(fluxoFaixas.d90)} icon={TrendingUp} />
          <KpiCard label="A Receber" value={formatBRL(kpisFinanceiro.contasReceber)} delta={kpisFinanceiro.contasReceberDelta} icon={DollarSign} />
          <KpiCard label="A Pagar" value={formatBRL(kpisFinanceiro.contasPagar)} delta={kpisFinanceiro.contasPagarDelta} icon={TrendingDown} />
          <KpiCard label="Inadimplência" value={`${kpisFinanceiro.inadimplencia}%`} delta={kpisFinanceiro.inadimplenciaDelta} icon={AlertTriangle} />
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
      </main>
    </>
  );
}