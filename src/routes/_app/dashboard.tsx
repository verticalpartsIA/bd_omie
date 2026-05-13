import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  LayoutDashboard,
  TrendingUp,
  Wallet,
  Percent,
  Activity,
  Repeat,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { KpiCard } from "@/components/app/KpiCard";
import { RoleGuard } from "@/components/app/RoleGuard";
import { ExportMenu } from "@/components/app/ExportMenu";
import { AlertasRecomendacoes } from "@/components/app/AlertasRecomendacoes";
import { ClaudeChat, type ClaudeChatHandle } from "@/components/app/ClaudeChat";
import { PeriodSelector, type DateRange } from "@/components/app/PeriodSelector";
import { formatBRL } from "@/data/executive-mock";
import { useStrategicDashboard } from "@/hooks/useStrategicDashboard";
import { useSidebarToggle } from "../_app";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Strategic Dashboard — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor"]}>
      <StrategicDashboard />
    </RoleGuard>
  ),
});

// ── Static mock data for charts without real-time source yet ──────────────────
const revenueData = [
  { m: "Jan", r: 520, ly: 460 },
  { m: "Fev", r: 610, ly: 510 },
  { m: "Mar", r: 680, ly: 540 },
  { m: "Abr", r: 720, ly: 580 },
  { m: "Mai", r: 690, ly: 600 },
  { m: "Jun", r: 760, ly: 640 },
  { m: "Jul", r: 810, ly: 660 },
  { m: "Ago", r: 790, ly: 700 },
  { m: "Set", r: 860, ly: 720 },
  { m: "Out", r: 940, ly: 780 },
];

const categoryData = [
  { name: "Polias", value: 280 },
  { name: "Cabos", value: 220 },
  { name: "Painéis", value: 190 },
  { name: "Motores", value: 160 },
  { name: "Degraus", value: 130 },
];

const channelData = [
  { name: "Revenda", value: 62 },
  { name: "Cliente Final", value: 38 },
];

// helper – keep in sync with PeriodSelector defaults
function isoToday() { return new Date().toISOString().split("T")[0]; }
function isoMonthsAgo(n: number) {
  const d = new Date(); d.setMonth(d.getMonth() - n); d.setDate(1);
  return d.toISOString().split("T")[0];
}

const ordersData = [
  { d: "S1", v: 38 },
  { d: "S2", v: 52 },
  { d: "S3", v: 47 },
  { d: "S4", v: 64 },
  { d: "S5", v: 58 },
  { d: "S6", v: 71 },
  { d: "S7", v: 82 },
];

const PIE_COLORS = [
  "#F5C400", "#3B82F6", "#10B981", "#F97316",
  "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
];

// ── Current period label ───────────────────────────────────────────────────────
function currentPeriodLabel() {
  const now = new Date();
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function StrategicDashboard() {
  const toggle = useSidebarToggle();
  const claudeRef = useRef<ClaudeChatHandle>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: isoMonthsAgo(1),
    to: isoToday(),
  });
  const { kpis: rawK, cockpitCEO, concentracao, tituloCounts, mixFamilias, isLoading, isError } =
    useStrategicDashboard();

  // ── Derive filtered KPIs based on selected date range ───────────────────────
  const k = (() => {
    const months = rawK.ebitda12m;
    if (!months.length) return rawK;

    // Filter months whose mes_dt (YYYY-MM) falls within the selected range
    const fromYM = dateRange.from.substring(0, 7);
    const toYM   = dateRange.to.substring(0, 7);
    let slice = months.filter((m) => m.mes_dt >= fromYM && m.mes_dt <= toYM);

    // Exclude the most recent (possibly partial) month unless explicitly chosen
    if (slice.length > 1 && slice[slice.length - 1].mes_dt === months[months.length - 1].mes_dt) {
      slice = slice.slice(0, -1);
    }
    if (!slice.length) {
      // Fallback to last complete month
      slice = [months.length >= 2 ? months[months.length - 2] : months[months.length - 1]].filter(Boolean) as typeof months;
    }

    const n = slice.length;
    const totalReceita = slice.reduce((s, m) => s + m.receita, 0);
    const totalEbitda  = slice.reduce((s, m) => s + m.ebitda, 0);
    const totalMargem  = slice.reduce((s, m) => s + m.margem, 0);
    const avgReceita   = totalReceita / n;
    const avgEbitda    = totalEbitda  / n;
    const ebitdaPct    = avgReceita > 0 ? Math.round((avgEbitda / avgReceita) * 1000) / 10 : 0;
    const margemBruta  = avgReceita > 0 ? Math.round((totalMargem / n / avgReceita) * 1000) / 10 : 0;
    const resLiquido   = Math.round(avgEbitda * 0.87);
    const margemLiqPct = avgReceita > 0 ? Math.round((resLiquido / avgReceita) * 1000) / 10 : 0;
    const prevEbitda   = slice.length > 1 ? slice[0].ebitda : (months[months.length - 3]?.ebitda ?? 0);
    const ebitdaDelta  = prevEbitda > 0 ? Math.round(((avgEbitda - prevEbitda) / prevEbitda) * 1000) / 10 : 0;
    // Multi-month: show totals; single month: show monthly values
    const isMulti = n > 1;
    return {
      ...rawK,
      receita:          isMulti ? totalReceita : avgReceita,
      ebitda:           isMulti ? totalEbitda  : avgEbitda,
      ebitdaPct,
      ebitdaDelta,
      margemBruta,
      resultadoLiquido: isMulti ? Math.round(totalEbitda * 0.87) : resLiquido,
      margemLiquida:    margemLiqPct,
    };
  })();

  const forecastPctMeta =
    rawK.forecastMes.meta > 0
      ? Math.round((rawK.forecastMes.projetado / rawK.forecastMes.meta) * 100)
      : 0;

  const periodLabel = currentPeriodLabel();

  if (isLoading) {
    return (
      <>
        <Topbar
          crumb="DASHBOARDS · STRATEGIC"
          title="Strategic Dashboard"
          icon={<LayoutDashboard className="h-3.5 w-3.5" />}
          onToggleSidebar={toggle}
        />
        <main className="flex flex-1 items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Topbar
          crumb="DASHBOARDS · STRATEGIC"
          title="Strategic Dashboard"
          icon={<LayoutDashboard className="h-3.5 w-3.5" />}
          onToggleSidebar={toggle}
        />
        <main className="flex flex-1 items-center justify-center py-24">
          <p className="text-sm text-destructive">
            Erro ao carregar dados. Verifique a conexão com o Supabase.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar
        crumb="DASHBOARDS · STRATEGIC"
        title="Strategic Dashboard"
        icon={<LayoutDashboard className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">
              Visão executiva ·{" "}
              <span className="text-[#C99E00]">{periodLabel}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O que está acontecendo, o que está em risco e o que decidir hoje.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PeriodSelector value={dateRange} onChange={setDateRange} />
            <ExportMenu
              filename="strategic-dashboard"
              rows={
                k.ebitda12m as unknown as Array<Record<string, string | number>>
              }
            />
          </div>
        </div>

        {/* Camada executiva — EBITDA / Líquido / Parceladas / Caixa */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            accent
            label="EBITDA"
            value={formatBRL(k.ebitda)}
            delta={k.ebitdaDelta}
            hint={`${k.ebitdaPct}% margem`}
            icon={Activity}
            onAskClaude={() => claudeRef.current?.ask(`O EBITDA está em ${formatBRL(k.ebitda)} com margem de ${k.ebitdaPct}% e variação MoM de ${k.ebitdaDelta > 0 ? "+" : ""}${k.ebitdaDelta}%. O que está impactando e como melhorar?`)}
          />
          <KpiCard
            label="Resultado Líquido"
            value={formatBRL(k.resultadoLiquido)}
            hint={`${k.margemLiquida}% margem`}
            icon={Percent}
            onAskClaude={() => claudeRef.current?.ask(`O resultado líquido é ${formatBRL(k.resultadoLiquido)} com margem de ${k.margemLiquida}%. O que está comprimindo a margem líquida e quais ações tomar?`)}
          />
          <KpiCard
            label="Vendas Parceladas"
            value={formatBRL(k.receitaRecorrente)}
            hint="Saldo de parcelas a receber"
            icon={Repeat}
            badge={tituloCounts.parceladas || undefined}
            onAskClaude={() => claudeRef.current?.ask(`As vendas parceladas totalizam ${formatBRL(k.receitaRecorrente)} em ${tituloCounts.parceladas} clientes. Quais clientes têm mais parcelas pendentes e qual o risco de inadimplência nessa carteira?`)}
          />
          <KpiCard
            label="Caixa D+30"
            value={formatBRL(k.caixa30)}
            icon={Wallet}
            accent
            badge={tituloCounts.caixa30 || undefined}
            onAskClaude={() => claudeRef.current?.ask(`O caixa projetado D+30 está em ${formatBRL(k.caixa30)}${k.caixa30 < 0 ? " (NEGATIVO)" : ""} com ${tituloCounts.caixa30} títulos vencendo. Quais são os principais riscos de liquidez nos próximos 30 dias e o que fazer?`)}
          />
          <KpiCard
            label="Caixa D+90"
            value={formatBRL(k.caixa90)}
            icon={Wallet}
            badge={tituloCounts.caixa90 || undefined}
            onAskClaude={() => claudeRef.current?.ask(`O caixa projetado D+90 está em ${formatBRL(k.caixa90)}${k.caixa90 < 0 ? " (NEGATIVO)" : ""} com ${tituloCounts.caixa90} títulos no horizonte. Quais são os riscos de caixa e quais ações priorizar?`)}
          />
        </div>

        {/* Atenção do CEO + Forecast */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertasRecomendacoes
              title="Atenção do CEO hoje"
              items={cockpitCEO}
              carousel
              carouselInterval={7000}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-1 flex items-start justify-between">
              <h4 className="text-sm font-bold">
                Forecast de Fechamento · {periodLabel}
              </h4>
              <button
                onClick={() => claudeRef.current?.ask(`O forecast de fechamento do mês está em ${formatBRL(rawK.forecastMes.projetado)} (${forecastPctMeta}% da meta de ${formatBRL(rawK.forecastMes.meta)}). O realizado até agora é ${formatBRL(rawK.forecastMes.realizado)}. Qual a probabilidade de bater a meta e quais ações aceleram o fechamento?`)}
                title="Perguntar ao Analista IA"
                className="flex h-7 w-7 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Projeção até o fim do mês vs meta
            </p>
            <div className="mt-4 space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Realizado
                </span>
                <span className="font-mono text-lg font-bold">
                  {formatBRL(k.forecastMes.realizado)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Projetado (mês)
                </span>
                <span className="font-mono text-2xl font-extrabold text-primary">
                  {formatBRL(k.forecastMes.projetado)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Meta
                </span>
                <span className="font-mono text-sm">
                  {formatBRL(k.forecastMes.meta)}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, forecastPctMeta)}%` }}
                />
              </div>
              <div className="text-xs">
                <span
                  className={`font-bold ${
                    forecastPctMeta >= 100
                      ? "text-success"
                      : forecastPctMeta >= 90
                        ? "text-warning"
                        : "text-destructive"
                  }`}
                >
                  {forecastPctMeta}% da meta
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · gap{" "}
                  {formatBRL(
                    Math.max(0, k.forecastMes.meta - k.forecastMes.projetado),
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            accent
            label="Receita do mês"
            value={formatBRL(k.receita)}
            hint="Receita bruta acumulada"
            icon={DollarSign}
            onAskClaude={() => claudeRef.current?.ask(`A receita do mês está em ${formatBRL(k.receita)}. Como está o ritmo de vendas em relação à meta e o que fazer para acelerar o fechamento?`)}
          />
          <KpiCard
            label="Margem Bruta"
            value={`${k.margemBruta}%`}
            hint="Após deduções e CPV"
            icon={Percent}
            onAskClaude={() => claudeRef.current?.ask(`A margem bruta está em ${k.margemBruta}%. O que está impactando o custo dos produtos vendidos e como melhorar essa margem?`)}
          />
          <KpiCard
            label="Clientes ativos"
            value={k.clientesAtivos > 0 ? k.clientesAtivos.toLocaleString("pt-BR") : "—"}
            hint="Revenda + Cliente Final"
            icon={Users}
            onAskClaude={() => claudeRef.current?.ask(`Temos ${k.clientesAtivos} clientes ativos (entre Revenda e Cliente Final). Quais são os top clientes por receita nos últimos 12 meses e como está a concentração de risco?`)}
          />
          <KpiCard
            label="SKUs em estoque"
            value="4.140"
            hint="Produtos VP ativos"
            icon={Package}
            onAskClaude={() => claudeRef.current?.ask(`Quais produtos estão com estoque zerado e têm demanda ativa? Liste os mais críticos para reposição imediata.`)}
          />
        </div>

        {/* Receita × Margem × EBITDA 12 meses + Concentração */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold">Receita × Margem × EBITDA · 12 meses</h4>
                <p className="text-[11px] text-muted-foreground">Riqueza absoluta vs operacional</p>
              </div>
              <button
                onClick={() => claudeRef.current?.ask(`Analisando a tendência dos últimos 12 meses de Receita, Margem Bruta e EBITDA: quais são os meses de melhor e pior desempenho e o que explica as variações? Qual é a tendência para os próximos meses?`)}
                title="Perguntar ao Analista IA"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart
                data={k.ebitda12m}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => formatBRL(v)}
                />
                <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="receita"
                  name="Receita"
                  fill="#161616"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="margem"
                  name="Margem Bruta"
                  fill="#808080"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="ebitda"
                  name="EBITDA"
                  stroke="#F5C400"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-1 flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold">Concentração de Receita</h4>
                <p className="text-[11px] text-muted-foreground">Risco de dependência de poucos clientes</p>
              </div>
              <button
                onClick={() => claudeRef.current?.ask(`Os top 5 clientes respondem por ${concentracao.top5Pct}% da receita e os top 10 por ${concentracao.top10Pct}%. Qual o risco real dessa concentração e quais estratégias de diversificação priorizar?`)}
                title="Perguntar ao Analista IA"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-semibold">Top 5 clientes</span>
                  <span
                    className={`font-mono text-lg font-extrabold ${
                      concentracao.top5Pct > 50
                        ? "text-destructive"
                        : "text-warning"
                    }`}
                  >
                    {concentracao.top5Pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-destructive"
                    style={{ width: `${concentracao.top5Pct}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-xs font-semibold">Top 10 clientes</span>
                  <span
                    className={`font-mono text-lg font-extrabold ${
                      concentracao.top10Pct > 70
                        ? "text-destructive"
                        : "text-warning"
                    }`}
                  >
                    {concentracao.top10Pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-warning"
                    style={{ width: `${concentracao.top10Pct}%` }}
                  />
                </div>
              </div>
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs">
                {concentracao.top5.map((c, i) => (
                  <li
                    key={c.nome}
                    className="flex items-center justify-between"
                  >
                    <span className="truncate">
                      <span className="mr-1.5 font-mono text-muted-foreground">
                        #{i + 1}
                      </span>
                      {c.nome}
                    </span>
                    <span className="font-mono font-bold">
                      {formatBRL(c.receita)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-card shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-sm font-bold">Evolução de Receita</h4>
                <p className="text-[11px] text-muted-foreground">
                  2025 vs 2024 · em milhares R$
                </p>
              </div>
              <div className="flex items-center gap-3">
              <button
                onClick={() => claudeRef.current?.ask(`Comparando a evolução de receita de 2025 vs 2024 mês a mês: em quais meses o crescimento foi maior? Qual o crescimento acumulado e o que pode explicar as variações?`)}
                title="Perguntar ao Analista IA"
                className="flex h-7 w-7 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-foreground/70">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                  2025
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-neutral-400" />
                  2024
                </span>
              </div>
              </div>
            </div>
            <div className="h-[280px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5C400" stopOpacity={0.5} />
                      <stop
                        offset="100%"
                        stopColor="#F5C400"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E5E5"
                    vertical={false}
                  />
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
                    contentStyle={{
                      borderRadius: 4,
                      border: "1px solid #E5E5E5",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ly"
                    stroke="#A0A0A0"
                    strokeDasharray="4 4"
                    fill="transparent"
                  />
                  <Area
                    type="monotone"
                    dataKey="r"
                    stroke="#F5C400"
                    strokeWidth={2.5}
                    fill="url(#g1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-sm font-bold">Mix por Categoria</h4>
                <p className="text-[11px] text-muted-foreground">Volume 12 meses por família</p>
              </div>
              <button
                onClick={() => claudeRef.current?.ask(`Use a ferramenta buscar_mix_familias para analisar o mix de vendas por família de produto: qual família tem maior participação, quais têm SKUs zerados e o que fazer para melhorar o mix?`)}
                title="Perguntar ao Analista IA"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
            {(() => {
              const raw = mixFamilias.length ? mixFamilias : categoryData;
              const total = raw.reduce((s, r) => s + r.value, 0);
              const items = raw.map((r) => ({
                ...r,
                pct: "pct" in r ? (r as { pct: number }).pct : total > 0 ? Math.round((r.value / total) * 1000) / 10 : 0,
                shortName: r.name.length > 22 ? r.name.substring(0, 21) + "…" : r.name,
              }));
              return (
                <div className="flex items-center gap-3 px-4 py-3" style={{ height: 262 }}>
                  {/* Donut */}
                  <div className="h-full w-[148px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={items}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={42}
                          outerRadius={68}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {items.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            value.toLocaleString("pt-BR"),
                            name,
                          ]}
                          contentStyle={{
                            borderRadius: 6,
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                            fontSize: 11,
                            padding: "4px 10px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Custom legend */}
                  <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px]">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span
                          className="flex-1 truncate text-foreground leading-none"
                          title={item.name}
                        >
                          {item.shortName}
                        </span>
                        <span className="font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
                          {item.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-sm font-bold">Pedidos por Semana</h4>
                <p className="text-[11px] text-muted-foreground">Últimas 7 semanas</p>
              </div>
              <button
                onClick={() => claudeRef.current?.ask(`Analisando o volume de pedidos por semana nas últimas 7 semanas: há uma tendência de aceleração ou queda? Quais semanas foram atípicas e o que pode ter causado variações?`)}
                title="Perguntar ao Analista IA"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-[220px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E5E5"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="d"
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
                    contentStyle={{
                      borderRadius: 4,
                      border: "1px solid #E5E5E5",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="v" fill="#F5C400" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-sm font-bold">Tipo de Cliente</h4>
                <p className="text-[11px] text-muted-foreground">Revenda vs Cliente Final</p>
              </div>
              <button
                onClick={() => claudeRef.current?.ask(`A VerticalParts vende para dois segmentos: "Revenda" (empresas de manutenção que revendem/usam as peças) e "Cliente Final" (usuários diretos). O mix atual é ~62% Revenda e 38% Cliente Final. Qual o impacto dessa distribuição na margem e no risco do negócio?`)}
                title="Perguntar ao Analista IA"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="h-[220px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={80}
                  >
                    <Cell fill="#F5C400" />
                    <Cell fill="#161616" />
                  </Pie>
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h4 className="text-sm font-bold">Crescimento YoY</h4>
                <p className="text-[11px] text-muted-foreground">
                  Receita acumulada
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => claudeRef.current?.ask(`O crescimento de receita YoY (ano sobre ano) está em +18%. Quais os principais drivers desse crescimento e como sustentar ou acelerar essa taxa nos próximos meses?`)}
                  title="Perguntar ao Analista IA"
                  className="flex h-7 w-7 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-1 text-xs font-bold text-success">
                <TrendingUp className="h-3 w-3" /> +18%
              </span>
              </div>
            </div>
            <div className="h-[220px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#E5E5E5"
                    vertical={false}
                  />
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
                    contentStyle={{
                      borderRadius: 4,
                      border: "1px solid #E5E5E5",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="r"
                    stroke="#F5C400"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ly"
                    stroke="#808080"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
      <ClaudeChat ref={claudeRef} kpis={k} alertas={cockpitCEO} concentracao={concentracao} />
    </>
  );
}
