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
} from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { KpiCard } from "@/components/app/KpiCard";
import { RoleGuard } from "@/components/app/RoleGuard";
import { ExportMenu } from "@/components/app/ExportMenu";
import { AlertasRecomendacoes } from "@/components/app/AlertasRecomendacoes";
import { ClaudeChat } from "@/components/app/ClaudeChat";
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
  { name: "Manutenção", value: 62 },
  { name: "Cliente Final", value: 38 },
];

const ordersData = [
  { d: "S1", v: 38 },
  { d: "S2", v: 52 },
  { d: "S3", v: 47 },
  { d: "S4", v: 64 },
  { d: "S5", v: 58 },
  { d: "S6", v: 71 },
  { d: "S7", v: 82 },
];

const COLORS = ["#F5C400", "#161616", "#808080", "#C99E00", "#E5E5E5"];

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
  const { kpis: k, cockpitCEO, concentracao, isLoading, isError } =
    useStrategicDashboard();

  const forecastPctMeta =
    k.forecastMes.meta > 0
      ? Math.round((k.forecastMes.projetado / k.forecastMes.meta) * 100)
      : 0;

  const period = currentPeriodLabel();

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
              <span className="text-[#C99E00]">{period}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O que está acontecendo, o que está em risco e o que decidir hoje.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground/70 hover:border-neutral-400">
              Últimos 30 dias
            </button>
            <ExportMenu
              filename="strategic-dashboard"
              rows={
                k.ebitda12m as unknown as Array<Record<string, string | number>>
              }
            />
          </div>
        </div>

        {/* Camada executiva — EBITDA / Líquido / Recorrente / Caixa */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            accent
            label="EBITDA"
            value={formatBRL(k.ebitda)}
            delta={k.ebitdaDelta}
            hint={`${k.ebitdaPct}% margem`}
            icon={Activity}
          />
          <KpiCard
            label="Resultado Líquido"
            value={formatBRL(k.resultadoLiquido)}
            hint={`${k.margemLiquida}% margem`}
            icon={Percent}
          />
          <KpiCard
            label="Receita Recorrente"
            value={formatBRL(k.receitaRecorrente)}
            hint="Contratos manutenção"
            icon={Repeat}
          />
          <KpiCard
            label="Receita Não Recorrente"
            value={formatBRL(k.receitaNaoRecorrente)}
            hint="Venda avulsa"
            icon={DollarSign}
          />
          <KpiCard
            label="Caixa D+30"
            value={formatBRL(k.caixa30)}
            icon={Wallet}
            accent
          />
          <KpiCard
            label="Caixa D+90"
            value={formatBRL(k.caixa90)}
            icon={Wallet}
          />
        </div>

        {/* Atenção do CEO + Forecast */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AlertasRecomendacoes
              title="Atenção do CEO hoje"
              items={cockpitCEO}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">
              Forecast de Fechamento · {period}
            </h4>
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
          />
          <KpiCard
            label="Margem Bruta"
            value={`${k.margemBruta}%`}
            hint="Após deduções e CPV"
            icon={Percent}
          />
          <KpiCard
            label="Clientes ativos"
            value="—"
            hint="Manutenção + cliente final"
            icon={Users}
          />
          <KpiCard
            label="SKUs em estoque"
            value="4.140"
            hint="Produtos VP ativos"
            icon={Package}
          />
        </div>

        {/* Receita × Margem × EBITDA 12 meses + Concentração */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">
              Receita × Margem × EBITDA · 12 meses
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Riqueza absoluta vs operacional
            </p>
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
            <h4 className="text-sm font-bold">Concentração de Receita</h4>
            <p className="text-[11px] text-muted-foreground">
              Risco de dependência de poucos clientes
            </p>
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
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Mix por Categoria</h4>
              <p className="text-[11px] text-muted-foreground">
                Receita por família de produto
              </p>
            </div>
            <div className="h-[280px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i]} />
                    ))}
                  </Pie>
                  <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 4,
                      border: "1px solid #E5E5E5",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Pedidos por Semana</h4>
              <p className="text-[11px] text-muted-foreground">
                Últimas 7 semanas
              </p>
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
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Tipo de Cliente</h4>
              <p className="text-[11px] text-muted-foreground">
                Manutenção vs Cliente final
              </p>
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
              <span className="inline-flex items-center gap-1 rounded bg-success/15 px-2 py-1 text-xs font-bold text-success">
                <TrendingUp className="h-3 w-3" /> +18%
              </span>
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
      <ClaudeChat kpis={k} alertas={cockpitCEO} concentracao={concentracao} />
    </>
  );
}
