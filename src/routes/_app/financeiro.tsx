import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Activity, Percent, DollarSign, Repeat, Users,
  TrendingUp, BarChart3, Crosshair, Flag,
} from "lucide-react";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { ExportMenu } from "@/components/app/ExportMenu";
import { AlertasRecomendacoes } from "@/components/app/AlertasRecomendacoes";
import { useSidebarToggle } from "../_app";
import { useStrategicDashboard } from "@/hooks/useStrategicDashboard";
import { useClientesDashboard } from "@/hooks/useClientesDashboard";
import { formatBRL, formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <FinanceiroPage />
    </RoleGuard>
  ),
});

function Linha({
  label,
  valor,
  bold,
}: {
  label: string;
  valor: number;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-border py-2 ${
        bold ? "font-bold text-base" : "text-sm"
      }`}
    >
      <span>{label}</span>
      <span
        className={`font-mono ${valor < 0 ? "text-destructive" : ""}`}
      >
        {formatBRL(valor)}
      </span>
    </div>
  );
}

function FinanceiroPage() {
  const toggle = useSidebarToggle();
  const { kpis, cockpitCEO, concentracao, isLoading } = useStrategicDashboard();
  const cliData = useClientesDashboard();

  const [cliSort, setCliSort] = useState<"receita" | "pctTotal">("receita");
  const [cliDir, setCliDir] = useState<"asc" | "desc">("desc");

  const CliSortTh = ({
    col,
    label,
    align = "left",
  }: {
    col: "receita" | "pctTotal";
    label: string;
    align?: string;
  }) => (
    <th
      onClick={() => {
        if (cliSort === col) setCliDir((d) => (d === "asc" ? "desc" : "asc"));
        else {
          setCliSort(col);
          setCliDir("desc");
        }
      }}
      className={`px-3 py-2 cursor-pointer select-none hover:bg-muted/80 text-${align} text-[10px] font-bold uppercase tracking-wider`}
    >
      {label}
      <span className="ml-1 opacity-50">
        {cliSort === col ? (cliDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );

  const sortedClientes = [...(cliData.data?.top10 ?? [])].sort(
    (a, b) => (cliDir === "asc" ? 1 : -1) * (a[cliSort] - b[cliSort])
  );

  const realizadoPct = (
    (kpis.forecastMes.realizado / Math.max(1, kpis.forecastMes.meta)) *
    100
  ).toFixed(1);
  const projetadoPct = (
    (kpis.forecastMes.projetado / Math.max(1, kpis.forecastMes.meta)) *
    100
  ).toFixed(1);

  return (
    <>
      <Topbar
        crumb="OPERAÇÃO · FINANCEIRO"
        title="Financeiro"
        icon={<Activity className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">
              Tem caixa para operar?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              EBITDA, resultado, caixa projetado, forecast e concentração.
            </p>
          </div>
          <ExportMenu
            filename="financeiro"
            rows={concentracao.top10.map((r) => ({
              nome: r.nome,
              receita: r.receita,
            }))}
          />
        </div>

        {isLoading && (
          <p className="text-sm text-muted-foreground animate-pulse mb-4">
            Carregando...
          </p>
        )}

        {/* Row 1 — 5 KPI cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            accent
            label="EBITDA"
            value={formatBRLCompact(kpis.ebitda)}
            delta={kpis.ebitdaDelta}
            hint={`${kpis.ebitdaPct}% margem`}
            icon={Activity}
          />
          <KpiCard
            label="Resultado Líquido"
            value={formatBRLCompact(kpis.resultadoLiquido)}
            hint={`${kpis.margemLiquida}% margem`}
            icon={Percent}
          />
          <KpiCard
            label="Receita Mensal"
            value={formatBRLCompact(kpis.receita)}
            hint={`Margem bruta ${kpis.margemBruta}%`}
            icon={DollarSign}
          />
          <KpiCard
            label="Rec. Recorrente"
            value={formatBRLCompact(kpis.receitaRecorrente)}
            icon={Repeat}
          />
          <KpiCard
            label="Clientes Ativos"
            value={kpis.clientesAtivos.toLocaleString("pt-BR")}
            icon={Users}
          />
        </div>

        {/* Row 2 — 6 KPI cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            accent
            label="Projeção 30d"
            value={formatBRLCompact(kpis.caixa30)}
            icon={TrendingUp}
          />
          <KpiCard
            label="Projeção 60d"
            value={formatBRLCompact(kpis.caixa60)}
            icon={TrendingUp}
          />
          <KpiCard
            label="Projeção 90d"
            value={formatBRLCompact(kpis.caixa90)}
            icon={TrendingUp}
          />
          <KpiCard
            label="Realizado Mês"
            value={formatBRLCompact(kpis.forecastMes.realizado)}
            hint="mês corrente"
            icon={BarChart3}
          />
          <KpiCard
            label="Projetado Mês"
            value={formatBRLCompact(kpis.forecastMes.projetado)}
            icon={Crosshair}
          />
          <KpiCard
            label="Meta Mensal"
            value={formatBRLCompact(kpis.forecastMes.meta)}
            icon={Flag}
          />
        </div>

        {/* Row 3 — DRE + Alertas */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* DRE Simplificado */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">DRE Simplificado</h4>
            <p className="text-[11px] text-muted-foreground">
              Margem bruta {kpis.margemBruta}% · EBITDA {kpis.ebitdaPct}%
            </p>
            <div className="mt-3">
              <Linha label="Receita Bruta" valor={kpis.receita} />
              <Linha
                label={`Margem Bruta (${kpis.margemBruta}%)`}
                valor={(kpis.receita * kpis.margemBruta) / 100}
                bold
              />
              <Linha
                label={`EBITDA (${kpis.ebitdaPct}%)`}
                valor={kpis.ebitda}
                bold
              />
              <Linha
                label={`Resultado Líquido (${kpis.margemLiquida}%)`}
                valor={kpis.resultadoLiquido}
                bold
              />
            </div>
          </div>

          {/* Alertas */}
          <div className="lg:col-span-2">
            <AlertasRecomendacoes
              title="Alertas Financeiros"
              items={cockpitCEO}
            />
          </div>
        </div>

        {/* Row 4 — EBITDA 12m chart */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h4 className="text-sm font-bold">
            Receita · Margem Bruta · EBITDA — 12 meses
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Evolução dos últimos 12 meses
          </p>
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={kpis.ebitda12m}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="l"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => formatBRLCompact(v)}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: number) => formatBRLCompact(v)}
                />
                <Tooltip
                  formatter={(v: unknown, n: unknown) =>
                    n === "ebitda"
                      ? formatBRLCompact(Number(v))
                      : formatBRLCompact(Number(v))
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  yAxisId="l"
                  dataKey="receita"
                  name="Receita"
                  fill="#0288D1"
                />
                <Bar
                  yAxisId="l"
                  dataKey="margem"
                  name="Margem Bruta"
                  fill="#2E7D32"
                />
                <Line
                  yAxisId="r"
                  type="monotone"
                  dataKey="ebitda"
                  name="EBITDA"
                  stroke="#F5C400"
                  strokeWidth={3}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 5 — Forecast gauge + Projeção Caixa */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Forecast gauge */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Forecast · Mês Corrente</h4>
            <p className="text-[11px] text-muted-foreground">
              Realizado e projetado vs meta
            </p>
            <div className="mt-4 space-y-4">
              {/* Realizado */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#2E7D32]">
                    Realizado
                  </span>
                  <span className="font-mono">
                    {formatBRLCompact(kpis.forecastMes.realizado)}{" "}
                    <span className="text-muted-foreground">
                      ({realizadoPct}%)
                    </span>
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Number(realizadoPct))}%`,
                      background: "#2E7D32",
                    }}
                  />
                </div>
              </div>
              {/* Projetado */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#F5C400]">
                    Projetado
                  </span>
                  <span className="font-mono">
                    {formatBRLCompact(kpis.forecastMes.projetado)}{" "}
                    <span className="text-muted-foreground">
                      ({projetadoPct}%)
                    </span>
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Number(projetadoPct))}%`,
                      background: "#F5C400",
                    }}
                  />
                </div>
              </div>
              {/* Meta */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">
                    Meta
                  </span>
                  <span className="font-mono">
                    {formatBRLCompact(kpis.forecastMes.meta)}{" "}
                    <span className="text-muted-foreground">(100%)</span>
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full border border-dashed border-border bg-transparent" />
              </div>
            </div>
          </div>

          {/* Projeção Caixa */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Projeção de Caixa</h4>
            <p className="text-[11px] text-muted-foreground">
              Saldo disponível ao longo de 90 dias
            </p>
            <div className="mt-4 space-y-3">
              {[
                { label: "D+30", v: kpis.caixa30 },
                { label: "D+60", v: kpis.caixa60 },
                { label: "D+90", v: kpis.caixa90 },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{p.label}</span>
                  <span
                    className={`font-mono font-bold ${
                      p.v >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatBRL(p.v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 6 — Top 10 clientes sortável */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h4 className="text-sm font-bold">Top 10 Clientes por Receita</h4>
          <p className="text-[11px] text-muted-foreground">
            Concentração de faturamento
          </p>
          {cliData.isLoading && (
            <p className="text-sm text-muted-foreground animate-pulse mt-2">
              Carregando...
            </p>
          )}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">
                    Cliente
                  </th>
                  <CliSortTh col="receita" label="Receita" align="right" />
                  <CliSortTh col="pctTotal" label="% do Total" align="right" />
                </tr>
              </thead>
              <tbody>
                {sortedClientes.map((c, i) => (
                  <tr
                    key={c.id}
                    className="border-t border-border hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-semibold">{c.nome}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {formatBRL(c.receita)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {c.pctTotal.toFixed(1)}%
                    </td>
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
