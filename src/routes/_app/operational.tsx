import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  FileCheck2,
  FileClock,
  PackageX,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Maximize2,
  Minimize2,
  Sparkles,
  Target,
} from "lucide-react";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useStrategicDashboard } from "@/hooks/useStrategicDashboard";
import { useAnalyticalDashboard } from "@/hooks/useAnalyticalDashboard";
import { useTVDashboard } from "@/hooks/useTVDashboard";

export const Route = createFileRoute("/_app/operational")({
  head: () => ({ meta: [{ title: "Operational TV — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "vendedor", "estoque", "tv"]}>
      <OperationalTV />
    </RoleGuard>
  ),
});

// ── Constants ─────────────────────────────────────────────────────────────────

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const pad = (n: number) => String(n).padStart(2, "0");
type ViewMode = "geral" | "comercial" | "estoque" | "financeiro" | "logistica";

const REFRESH_OPTIONS: Array<{ label: string; ms: number }> = [
  { label: "30s", ms: 30_000 },
  { label: "1min", ms: 60_000 },
  { label: "5min", ms: 300_000 },
  { label: "Manual", ms: 0 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function fmtBRL(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `R$ ${Math.round(v / 1_000)}K`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function fmtFull(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

// ── Component ─────────────────────────────────────────────────────────────────

function OperationalTV() {
  const now = useClock();
  const [view, setView] = useState<ViewMode>("geral");
  const [refreshIdx, setRefreshIdx] = useState(2);
  const [tick, setTick] = useState(0);
  const [fs, setFs] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Real data hooks
  const { kpis, cockpitCEO: alertas } = useStrategicDashboard();
  const { data: ad } = useAnalyticalDashboard();
  const { live } = useTVDashboard();

  useEffect(() => {
    const ms = REFRESH_OPTIONS[refreshIdx].ms;
    if (!ms) return;
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [refreshIdx]);

  const toggleFullscreen = async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      await rootRef.current?.requestFullscreen?.();
      setFs(true);
    } else {
      await document.exitFullscreen?.();
      setFs(false);
    }
  };

  const viewLabel: Record<ViewMode, string> = {
    geral: "Geral", comercial: "Comercial", estoque: "Estoque", financeiro: "Financeiro", logistica: "Logística",
  };

  const clock = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "--:--:--";
  const dateLbl = now ? `${DIAS[now.getDay()]} · ${pad(now.getDate())} ${MESES[now.getMonth()]} ${now.getFullYear()}` : "";
  const refreshLbl = REFRESH_OPTIONS[refreshIdx].label;

  // ── Derived values ────────────────────────────────────────────────────────

  // Q1 — Forecast do mês (realizado vs meta)
  const realizado = kpis.forecastMes.realizado;
  const meta = kpis.forecastMes.meta;
  const projetado = kpis.forecastMes.projetado;
  const forecastPct = meta > 0 ? Math.round((realizado / meta) * 100) : 0;
  const projPct = meta > 0 ? Math.round((projetado / meta) * 100) : 0;
  const deltaVsProj = projetado > 0 ? Math.round(((realizado / projetado) - 1) * 100) : 0;

  // Q2 — Vendedores (top 5) — normalized to max value for bar width
  const vendedores = ad.vendedores.slice(0, 5);
  const maxVendedor = vendedores[0]?.v ?? 1;

  // Q3 — Estoque crítico
  const criticos = live.criticos.slice(0, 5);

  // Q4 — KPIs financeiros
  const ebitdaPct = kpis.ebitdaPct;
  const margemBruta = kpis.margemBruta;
  const caixa30 = kpis.caixa30;
  const caixa90 = kpis.caixa90;

  // Ticker alerts: combine strategic alerts + critical stock
  const tickerAlerts = [
    ...alertas.filter((a) => a.level === "critico" || a.level === "atencao").map((a) => ({
      tag: a.level === "critico" ? "crit" : "warn",
      title: a.title,
      text: a.detail ?? "",
    })),
    ...criticos.map((c) => ({
      tag: "crit",
      title: "ESTOQUE CRÍTICO",
      text: `${c.descricao} · ${c.familia} · média ${c.media.toFixed(0)}/mês`,
    })),
  ];

  // Fallback for empty ticker
  const tickerItems = tickerAlerts.length > 0 ? tickerAlerts : [
    { tag: "warn", title: "DADOS CARREGANDO", text: "Aguardando sincronização com o Omie ERP..." },
  ];

  // Next action (top critical alert)
  const nextAction = alertas.find((a) => a.level === "critico")?.acao
    ?? alertas.find((a) => a.level === "atencao")?.acao
    ?? "Todos os alertas monitorados";

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black text-white"
      style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
      data-tick={tick}
    >
      {/* TOPBAR */}
      <header className="grid h-20 shrink-0 grid-cols-3 items-center border-b border-[#1E1E1E] bg-[#050505] px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-[#F5C400] font-extrabold text-black">
            VP
          </div>
          <div className="flex flex-col gap-0.5 border-l border-[#2A2A2A] pl-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#F5C400]">
              Operational
            </span>
            <span className="text-sm font-bold tracking-wide text-[#C9C9C9]">
              Sala de Controle · TV · {viewLabel[view]}
            </span>
          </div>
        </div>
        <div className="flex items-baseline justify-center gap-4">
          <div className="font-mono text-[28px] font-bold tabular-nums tracking-wider">{clock}</div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A0A0A0]">
            {dateLbl}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <select
            value={refreshIdx}
            onChange={(e) => setRefreshIdx(Number(e.target.value))}
            className="rounded border border-[#2A2A2A] bg-[#1E1E1E] px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C9C9C9] outline-none"
          >
            {REFRESH_OPTIONS.map((o, i) => <option key={o.label} value={i}>Refresh: {o.label}</option>)}
          </select>
          <span className="inline-flex items-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1E1E1E] px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C9C9C9]">
            <RefreshCw className="h-3 w-3 text-[#F5C400]" />{refreshLbl}
          </span>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 rounded border border-[#2A2A2A] bg-[#1E1E1E] px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#C9C9C9] hover:border-[#F5C400]"
          >
            {fs ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            {fs ? "Sair" : "TV"}
          </button>
          <div className="inline-flex items-center gap-2 rounded border border-[#FF6B6B] bg-[#FF3B3B] px-4 py-2 text-[13px] font-extrabold uppercase tracking-[0.18em] text-white animate-pulse">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            LIVE
          </div>
        </div>
      </header>

      {/* VIEW SWITCHER */}
      <div className="flex shrink-0 items-center gap-1 border-b border-[#1E1E1E] bg-[#0A0A0A] px-6 py-2">
        {(Object.keys(viewLabel) as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-colors ${
              view === v ? "bg-[#F5C400] text-black" : "text-[#808080] hover:bg-[#1E1E1E] hover:text-[#C9C9C9]"
            }`}
          >{viewLabel[v]}</button>
        ))}
        {nextAction && (
          <div className="ml-auto flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#A0A0A0]">
            <Sparkles className="h-3 w-3 text-[#F5C400]" />
            Próxima ação: <span className="text-[#F5C400] max-w-xs truncate">{nextAction}</span>
          </div>
        )}
      </div>

      {/* ALERTS TICKER */}
      <div className="flex h-14 shrink-0 items-center overflow-hidden border-y border-[#FF6B6B] bg-gradient-to-r from-[#C81E1E] to-[#FF3B3B]">
        <div className="flex h-full shrink-0 items-center gap-2.5 border-r-2 border-[#FF3B3B] bg-black px-5 text-xs font-extrabold uppercase tracking-[0.2em] text-[#FF3B3B]">
          <AlertTriangle className="h-4 w-4 animate-pulse" />
          Alertas Críticos
        </div>
        <div
          className="relative h-full flex-1 overflow-hidden"
          style={{ maskImage: "linear-gradient(90deg, transparent, #000 4%, #000 96%, transparent)" }}
        >
          <div className="ticker-rail flex h-full items-center whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((a, i) => (
              <div key={i} className="inline-flex h-full items-center gap-3 border-r border-white/20 px-7 text-base font-semibold text-white">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.16em] ${
                    a.tag === "crit" ? "bg-black text-[#FF3B3B]" : "bg-[#F5C400] text-black"
                  }`}
                >
                  {a.tag === "crit" ? "Crítico" : "Atenção"}
                </span>
                {a.tag === "crit"
                  ? <AlertOctagon className="h-4 w-4 text-white/80" />
                  : <PackageX className="h-4 w-4 text-white/80" />
                }
                <strong className="font-extrabold text-[#F5C400]">{a.title}</strong>
                {a.text && <span>· {a.text}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT — switches by view */}
      <main className="min-h-0 flex-1 p-4">

      {/* ── GERAL ─────────────────────────────────────────────────────────── */}
      {view !== "geral" ? null : <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">

        {/* Q1 — FORECAST DO MÊS */}
        <Quad num="01" title="Forecast do Mês" sub="Tempo real" subDot>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#808080]">
                Realizado
              </div>
              <div className="flex items-baseline gap-3 font-mono text-[88px] font-black leading-none tracking-tight tabular-nums">
                <span className="font-sans text-4xl font-bold text-[#F5C400]">R$</span>
                <span>{fmtFull(Math.round(realizado / 1000))}K</span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xl font-semibold text-[#C9C9C9]">
                <span className={`inline-flex items-center gap-2 rounded border px-3.5 py-1.5 text-2xl font-extrabold ${
                  deltaVsProj >= 0
                    ? "border-[#16C16E]/35 bg-[#16C16E]/15 text-[#16C16E]"
                    : "border-[#FF3B3B]/35 bg-[#FF3B3B]/15 text-[#FF3B3B]"
                }`}>
                  {deltaVsProj >= 0 ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                  {deltaVsProj >= 0 ? "+" : ""}{deltaVsProj}%
                </span>
                <span>vs projetado · {fmtBRL(projetado)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.16em] text-[#A0A0A0]">Meta do mês</div>
                  <div className="font-mono text-sm font-semibold text-[#808080]">{fmtBRL(meta)}</div>
                </div>
                <div className="font-mono text-3xl font-extrabold tracking-tight text-[#F5C400]">{forecastPct}%</div>
              </div>
              {/* Realizado bar */}
              <div className="relative h-5 overflow-hidden rounded border border-[#2A2A2A] bg-[#1E1E1E]">
                <div
                  className="h-full rounded-sm shadow-[0_0_24px_rgba(245,196,0,0.45)]"
                  style={{
                    width: `${Math.min(forecastPct, 100)}%`,
                    background: "linear-gradient(90deg,#C99E00,#F5C400,#FFD400)",
                  }}
                />
              </div>
              {/* Projetado bar (dimmer) */}
              <div className="relative h-2 overflow-hidden rounded bg-[#1E1E1E]">
                <div
                  className="h-full rounded opacity-40"
                  style={{
                    width: `${Math.min(projPct, 100)}%`,
                    background: "#F5C400",
                  }}
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#808080]">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-1.5 w-3 rounded-sm bg-[#F5C400]" /> Realizado
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-1.5 w-3 rounded-sm bg-[#F5C400]/40" /> Projetado
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-[#808080]" /> Meta: {fmtBRL(meta)}
                </span>
              </div>
            </div>
          </div>
        </Quad>

        {/* Q2 — RANKING VENDEDORES */}
        <Quad num="02" title="Ranking Vendedores" sub="Atualizado agora" subDot>
          <div className="flex flex-1 flex-col gap-3">
            {vendedores.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-[#808080]">
                Carregando dados...
              </div>
            ) : vendedores.map((s, i) => {
              const top = i === 0;
              const barPct = maxVendedor > 0 ? Math.round((s.v / maxVendedor) * 100) : 0;
              return (
                <div
                  key={s.name}
                  className={`grid grid-cols-[56px_1fr_auto] items-center gap-4 rounded-md border p-3 ${
                    top
                      ? "border-[#F5C400] bg-gradient-to-r from-[#F5C400]/20 to-[#F5C400]/5 shadow-[0_0_24px_rgba(245,196,0,0.18)]"
                      : "border-[#1E1E1E] bg-[#131313]"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded font-mono font-extrabold ${
                      top ? "bg-[#F5C400] text-2xl text-black" : "bg-[#1E1E1E] text-xl text-[#C9C9C9]"
                    }`}
                  >
                    {pad(i + 1)}
                  </div>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className={`truncate ${top ? "text-[22px] font-extrabold" : "text-[18px] font-bold"}`}>
                        {s.name}
                      </span>
                      <span className={`whitespace-nowrap font-mono font-extrabold text-[#F5C400] ${top ? "text-[22px]" : "text-[18px]"}`}>
                        {s.v} ped.
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-[#2A2A2A]">
                      <div
                        className="h-full rounded"
                        style={{ width: `${barPct}%`, background: top ? "#F5C400" : "#808080" }}
                      />
                    </div>
                  </div>
                  <div
                    className={`min-w-[56px] text-right font-mono font-bold ${
                      top ? "text-[20px] text-[#F5C400]" : "text-base text-[#A0A0A0]"
                    }`}
                  >
                    {barPct}%
                  </div>
                </div>
              );
            })}
          </div>
        </Quad>

        {/* Q3 — ESTOQUE CRÍTICO */}
        <Quad
          num="03"
          title="Estoque Crítico"
          critical={criticos.length > 0}
          sub={criticos.length > 0 ? `${criticos.length} SKUs com ruptura` : "Tudo OK"}
          subIcon={<AlertCircle className="h-3.5 w-3.5" />}
          subRed={criticos.length > 0}
        >
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {criticos.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-3 text-[#16C16E]">
                <span className="text-2xl">✓</span>
                <span className="text-lg font-bold">Nenhum item crítico no momento</span>
              </div>
            ) : criticos.map((c) => (
              <div
                key={c.codigo}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded border border-[#1E1E1E] border-l-4 border-l-[#FF3B3B] bg-[#131313] p-3.5 animate-stock-flash"
              >
                <span className="whitespace-nowrap rounded-sm px-2 py-1 font-mono text-[11px] font-extrabold uppercase tracking-[0.14em] bg-[#FF3B3B] text-white">
                  Crítico
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-bold">{c.descricao}</span>
                  <span className="font-mono text-xs font-semibold tracking-wider text-[#808080]">
                    {c.codigo} · {c.familia}
                  </span>
                </div>
                <div className="flex min-w-[80px] flex-col items-center">
                  <span className="font-mono text-2xl font-extrabold leading-none text-[#FF3B3B]">
                    {c.media.toFixed(0)}
                  </span>
                  <span className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#808080]">
                    /mês
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Quad>

        {/* Q4 — KPIs FINANCEIROS */}
        <Quad num="04" title="KPIs Financeiros" sub="Sincronizado" subDot>
          <div className="grid flex-1 grid-rows-[auto_1fr] gap-4">
            {/* Row 1: EBITDA + Margem Bruta */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] border-l-4 border-l-[#16C16E] bg-[#131313] p-5">
                <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">
                  <TrendingUp className="h-3.5 w-3.5 text-[#16C16E]" />
                  EBITDA 12m
                </span>
                <div className="font-mono text-4xl font-extrabold leading-none tracking-tight text-[#16C16E]">
                  {ebitdaPct.toFixed(1)}<span className="text-xl opacity-70">%</span>
                </div>
                <span className="flex items-center gap-2 text-xs font-semibold text-[#A0A0A0]">
                  <FileCheck2 className="h-3 w-3" />
                  {fmtBRL(kpis.ebitda)} acumulado
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] border-l-4 border-l-[#F5C400] bg-[#131313] p-5">
                <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">
                  <TrendingDown className="h-3.5 w-3.5 text-[#F5C400]" />
                  Margem Bruta
                </span>
                <div className="font-mono text-4xl font-extrabold leading-none tracking-tight text-[#F5C400]">
                  {margemBruta.toFixed(1)}<span className="text-xl opacity-70">%</span>
                </div>
                <span className="flex items-center gap-2 text-xs font-semibold text-[#A0A0A0]">
                  <FileClock className="h-3 w-3" />
                  Receita: {fmtBRL(kpis.receita)}
                </span>
              </div>
            </div>

            {/* Row 2: Caixa projetado + Pedidos recentes */}
            <div className="grid min-h-0 grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-3 rounded-md border border-[#1E1E1E] bg-[#131313] p-5">
                <div className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#C9C9C9]">
                  Caixa Projetado
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#808080]">30 dias</span>
                    <span className={`font-mono text-xl font-extrabold ${caixa30 >= 0 ? "text-[#16C16E]" : "text-[#FF3B3B]"}`}>
                      {fmtBRL(caixa30)}
                    </span>
                  </div>
                  <div className="h-px bg-[#2A2A2A]" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#808080]">90 dias</span>
                    <span className={`font-mono text-xl font-extrabold ${caixa90 >= 0 ? "text-[#16C16E]" : "text-[#FF3B3B]"}`}>
                      {fmtBRL(caixa90)}
                    </span>
                  </div>
                </div>
                <div className="mt-auto flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-[#16C16E]" />
                  <span className="text-xs font-semibold text-[#A0A0A0]">Clientes ativos: {kpis.clientesAtivos}</span>
                </div>
              </div>

              {/* Recent orders */}
              <div className="flex flex-col gap-2 overflow-hidden rounded-md border border-[#1E1E1E] bg-[#131313] p-5">
                <div className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#C9C9C9]">
                  Pedidos Recentes
                </div>
                <div className="flex flex-col gap-1.5 overflow-hidden">
                  {live.recentOrders.slice(0, 4).map((o) => (
                    <div key={o.id} className="flex items-center justify-between gap-2 rounded border border-[#2A2A2A] bg-[#0C0C0C] px-2.5 py-1.5">
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold text-[#C9C9C9]">{o.cliente}</span>
                        <span className="font-mono text-[10px] text-[#808080]">#{o.numero} · {o.hora}</span>
                      </div>
                      <span className="whitespace-nowrap font-mono text-sm font-extrabold text-[#F5C400]">
                        {fmtBRL(o.valor)}
                      </span>
                    </div>
                  ))}
                  {live.recentOrders.length === 0 && (
                    <div className="text-xs text-[#808080]">Carregando pedidos...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Quad>
      </div>} {/* end view=geral */}

      {/* ── COMERCIAL ─────────────────────────────────────────────────────── */}
      {view !== "comercial" ? null : <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
        {/* Top produtos */}
        <Quad num="01" title="Top Produtos" sub="Por receita · 20k itens" subDot>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {ad.topProdutos.slice(0, 6).map((p, i) => {
              const max = ad.topProdutos[0]?.rev ?? 1;
              const pct = max > 0 ? Math.round((p.rev / max) * 100) : 0;
              return (
                <div key={p.sku} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="truncate text-sm font-bold text-[#C9C9C9]">{p.desc || p.sku}</span>
                    <span className="ml-3 whitespace-nowrap font-mono text-sm font-extrabold text-[#F5C400]">R$ {p.rev}K</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-[#2A2A2A]">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: i === 0 ? "#F5C400" : "#4B5563" }} />
                  </div>
                </div>
              );
            })}
            {ad.topProdutos.length === 0 && <div className="flex flex-1 items-center justify-center text-[#808080]">Carregando...</div>}
          </div>
        </Quad>

        {/* Pedidos recentes */}
        <Quad num="02" title="Pedidos Recentes" sub="Tempo real" subDot>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {live.recentOrders.slice(0, 8).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 rounded border border-[#2A2A2A] bg-[#131313] px-3 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-bold text-[#C9C9C9]">{o.cliente}</span>
                  <span className="font-mono text-xs text-[#808080]">#{o.numero} · {o.hora} · {o.etapa}</span>
                </div>
                <span className="whitespace-nowrap font-mono text-base font-extrabold text-[#F5C400]">{fmtBRL(o.valor)}</span>
              </div>
            ))}
            {live.recentOrders.length === 0 && <div className="flex flex-1 items-center justify-center text-[#808080]">Carregando pedidos...</div>}
          </div>
        </Quad>

        {/* Top clientes */}
        <Quad num="03" title="Top Clientes" sub="Por receita total" subDot>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {ad.topClientes.slice(0, 6).map((c, i) => {
              const max = ad.topClientes[0]?.v ?? 1;
              const pct = max > 0 ? Math.round((c.v / max) * 100) : 0;
              return (
                <div key={c.name} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="truncate text-sm font-bold text-[#C9C9C9]">{c.name}</span>
                    <span className="ml-3 whitespace-nowrap font-mono text-sm font-extrabold text-[#F5C400]">R$ {c.v}K</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-[#2A2A2A]">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: i === 0 ? "#F5C400" : "#374151" }} />
                  </div>
                </div>
              );
            })}
            {ad.topClientes.length === 0 && <div className="flex flex-1 items-center justify-center text-[#808080]">Carregando...</div>}
          </div>
        </Quad>

        {/* KPIs comerciais */}
        <Quad num="04" title="KPIs Comerciais" sub="Últimos 12 meses" subDot>
          <div className="grid flex-1 grid-cols-2 gap-4">
            {[
              { label: "Ticket Médio", value: fmtBRL(ad.ticketMedio), color: "#F5C400" },
              { label: "Taxa Recompra", value: `${ad.recompraPct}%`, color: "#16C16E" },
              { label: "Itens/Pedido", value: `${ad.itensPorPedido}`, color: "#3B82F6" },
              { label: "Pedidos 12m", value: ad.totalPedidos12m.toLocaleString("pt-BR"), color: "#8B5CF6" },
            ].map((k) => (
              <div key={k.label} className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] bg-[#131313] p-5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">{k.label}</span>
                <div className="font-mono text-4xl font-extrabold leading-none" style={{ color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        </Quad>
      </div>}

      {/* ── ESTOQUE ───────────────────────────────────────────────────────── */}
      {view !== "estoque" ? null : <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
        {/* Críticos full list */}
        <Quad num="01" title="Estoque Crítico" critical={criticos.length > 0} sub={`${criticos.length} SKUs — ruptura`} subRed={criticos.length > 0} subIcon={<AlertCircle className="h-3.5 w-3.5" />}>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {criticos.length === 0 ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-[#16C16E] text-lg font-bold">✓ Nenhum item crítico</div>
            ) : criticos.map((c) => (
              <div key={c.codigo} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded border border-l-4 border-[#1E1E1E] border-l-[#FF3B3B] bg-[#131313] p-3 animate-stock-flash">
                <span className="rounded-sm bg-[#FF3B3B] px-2 py-0.5 text-[11px] font-extrabold uppercase text-white">Crítico</span>
                <div>
                  <div className="truncate font-bold text-[#C9C9C9]">{c.descricao}</div>
                  <div className="font-mono text-xs text-[#808080]">{c.codigo} · {c.familia}</div>
                </div>
                <div className="text-center">
                  <div className="font-mono text-2xl font-extrabold text-[#FF3B3B]">{c.media.toFixed(0)}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-[#808080]">/mês</div>
                </div>
              </div>
            ))}
          </div>
        </Quad>

        {/* Alertas de estoque do CEO */}
        <Quad num="02" title="Alertas de Estoque" sub="vw_alertas_ceo" subDot>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {alertas.filter((a) => a.title.toLowerCase().includes("estoque") || a.title.toLowerCase().includes("stock") || a.title.toLowerCase().includes("ruptura")).slice(0, 6).map((a, i) => (
              <div key={i} className={`rounded border border-l-4 bg-[#131313] p-3 ${a.level === "critico" ? "border-[#1E1E1E] border-l-[#FF3B3B]" : "border-[#1E1E1E] border-l-[#F5C400]"}`}>
                <div className="font-bold text-[#C9C9C9]">{a.title}</div>
                {a.detail && <div className="mt-1 text-xs text-[#808080]">{a.detail}</div>}
              </div>
            ))}
            {alertas.filter((a) => a.title.toLowerCase().includes("estoque") || a.title.toLowerCase().includes("ruptura")).length === 0 && (
              <div className="flex flex-1 flex-col gap-2.5">
                {alertas.slice(0, 5).map((a, i) => (
                  <div key={i} className={`rounded border border-l-4 bg-[#131313] p-3 ${a.level === "critico" ? "border-[#1E1E1E] border-l-[#FF3B3B]" : "border-[#1E1E1E] border-l-[#F5C400]"}`}>
                    <div className="font-bold text-[#C9C9C9]">{a.title}</div>
                    {a.detail && <div className="mt-1 text-xs text-[#808080]">{a.detail}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Quad>

        {/* Top produtos por quantidade */}
        <Quad num="03" title="Top Produtos · Volume" sub="Últimos 12m" subDot>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {ad.topProdutos.slice(0, 6).map((p, i) => {
              const max = ad.topProdutos.reduce((m, x) => Math.max(m, x.qty), 1);
              const pct = max > 0 ? Math.round((p.qty / max) * 100) : 0;
              return (
                <div key={p.sku} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between">
                    <span className="truncate text-sm font-bold text-[#C9C9C9]">{p.desc || p.sku}</span>
                    <span className="ml-3 font-mono text-sm font-extrabold text-[#3B82F6]">{p.qty.toLocaleString("pt-BR")} un</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-[#2A2A2A]">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: i === 0 ? "#3B82F6" : "#1D4ED8" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Quad>

        {/* Resumo estoque */}
        <Quad num="04" title="Resumo Geral" sub="Dados em tempo real" subDot>
          <div className="grid flex-1 grid-cols-2 gap-4">
            {[
              { label: "Itens Críticos", value: criticos.length.toString(), color: "#FF3B3B", sub: "ruptura de estoque" },
              { label: "SKUs Ativos", value: ad.topProdutos.length > 0 ? "20K+" : "—", color: "#16C16E", sub: "produtos cadastrados" },
              { label: "Pedidos 12m", value: ad.totalPedidos12m.toLocaleString("pt-BR"), color: "#F5C400", sub: "pedidos realizados" },
              { label: "Alertas CEO", value: alertas.length.toString(), color: "#8B5CF6", sub: "alertas ativos" },
            ].map((k) => (
              <div key={k.label} className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] bg-[#131313] p-5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">{k.label}</span>
                <div className="font-mono text-4xl font-extrabold leading-none" style={{ color: k.color }}>{k.value}</div>
                <span className="text-xs text-[#808080]">{k.sub}</span>
              </div>
            ))}
          </div>
        </Quad>
      </div>}

      {/* ── FINANCEIRO ────────────────────────────────────────────────────── */}
      {view !== "financeiro" ? null : <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
        {/* EBITDA + Margem */}
        <Quad num="01" title="EBITDA & Margens" sub="Últimos 12 meses" subDot>
          <div className="grid flex-1 grid-cols-2 gap-4">
            {[
              { label: "EBITDA %", value: `${ebitdaPct.toFixed(1)}%`, sub: fmtBRL(kpis.ebitda), color: "#16C16E" },
              { label: "Margem Bruta", value: `${margemBruta.toFixed(1)}%`, sub: fmtBRL(kpis.receita), color: "#F5C400" },
              { label: "Margem Líquida", value: `${kpis.margemLiquida.toFixed(1)}%`, sub: fmtBRL(kpis.resultadoLiquido), color: "#3B82F6" },
              { label: "Receita 12m", value: fmtBRL(kpis.receita), sub: `${ad.totalPedidos12m} pedidos`, color: "#8B5CF6" },
            ].map((k) => (
              <div key={k.label} className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] bg-[#131313] p-5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">{k.label}</span>
                <div className="font-mono text-4xl font-extrabold leading-none" style={{ color: k.color }}>{k.value}</div>
                <span className="text-xs text-[#808080]">{k.sub}</span>
              </div>
            ))}
          </div>
        </Quad>

        {/* Forecast */}
        <Quad num="02" title="Forecast do Mês" sub="Meta vs Projetado" subDot>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div className="flex items-baseline gap-2 font-mono text-[72px] font-black leading-none tabular-nums">
              <span className="text-3xl font-bold text-[#F5C400]">R$</span>
              <span>{fmtFull(Math.round(realizado / 1000))}K</span>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label: "Realizado", v: realizado, total: meta, color: "#F5C400" },
                { label: "Projetado", v: projetado, total: meta, color: "#F5C400", dim: true },
                { label: "Meta", v: meta, total: meta, color: "#4B5563" },
              ].map((row) => (
                <div key={row.label} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-[#808080]">
                    <span>{row.label}</span>
                    <span style={{ color: row.color }}>{fmtBRL(row.v)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-[#1E1E1E]">
                    <div className="h-full rounded" style={{
                      width: `${Math.min(row.total > 0 ? Math.round((row.v / row.total) * 100) : 0, 100)}%`,
                      background: row.color,
                      opacity: row.dim ? 0.4 : 1,
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="font-mono text-5xl font-extrabold text-[#F5C400]">{forecastPct}% <span className="text-xl text-[#808080]">da meta</span></div>
          </div>
        </Quad>

        {/* Caixa projetado */}
        <Quad num="03" title="Fluxo de Caixa Projetado" sub="Recebíveis e pagamentos" subDot>
          <div className="flex flex-1 flex-col gap-4">
            {[
              { label: "30 dias", v: caixa30, icon: TrendingUp },
              { label: "60 dias", v: kpis.caixa60, icon: TrendingUp },
              { label: "90 dias", v: caixa90, icon: TrendingUp },
            ].map((row) => {
              const Icon = row.icon;
              const pos = row.v >= 0;
              return (
                <div key={row.label} className={`flex items-center justify-between rounded border border-l-4 bg-[#131313] p-4 ${pos ? "border-[#1E1E1E] border-l-[#16C16E]" : "border-[#1E1E1E] border-l-[#FF3B3B]"}`}>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${pos ? "text-[#16C16E]" : "text-[#FF3B3B]"}`} />
                    <span className="text-base font-bold uppercase tracking-wider text-[#808080]">{row.label}</span>
                  </div>
                  <span className={`font-mono text-3xl font-extrabold ${pos ? "text-[#16C16E]" : "text-[#FF3B3B]"}`}>{fmtBRL(row.v)}</span>
                </div>
              );
            })}
          </div>
        </Quad>

        {/* Alertas financeiros */}
        <Quad num="04" title="Alertas Financeiros" sub="vw_alertas_ceo" subDot>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {alertas.filter((a) =>
              a.title.toLowerCase().includes("inadim") ||
              a.title.toLowerCase().includes("caixa") ||
              a.title.toLowerCase().includes("margem") ||
              a.title.toLowerCase().includes("financ") ||
              a.title.toLowerCase().includes("receita")
            ).slice(0, 5).map((a, i) => (
              <div key={i} className={`rounded border border-l-4 bg-[#131313] p-3 ${a.level === "critico" ? "border-[#1E1E1E] border-l-[#FF3B3B]" : "border-[#1E1E1E] border-l-[#F5C400]"}`}>
                <div className="font-bold text-[#C9C9C9]">{a.title}</div>
                {a.detail && <div className="mt-1 text-xs text-[#808080]">{a.detail}</div>}
              </div>
            ))}
            {alertas.length === 0 && (
              <div className="flex flex-1 items-center justify-center text-[#16C16E] font-bold">✓ Nenhum alerta financeiro</div>
            )}
          </div>
        </Quad>
      </div>}

      {/* ── LOGÍSTICA ─────────────────────────────────────────────────────── */}
      {view !== "logistica" ? null : <div className="grid h-full grid-cols-2 grid-rows-2 gap-4">
        {/* Últimos pedidos */}
        <Quad num="01" title="Últimos Pedidos" sub="Tempo real" subDot>
          <div className="flex flex-1 flex-col gap-2 overflow-hidden">
            {live.recentOrders.map((o) => (
              <div key={o.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded border border-[#2A2A2A] bg-[#131313] px-3 py-2">
                <div>
                  <div className="truncate font-bold text-[#C9C9C9]">{o.cliente}</div>
                  <div className="font-mono text-xs text-[#808080]">#{o.numero} · {o.hora}</div>
                </div>
                <span className="rounded bg-[#1E1E1E] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#808080]">
                  {o.etapa || "—"}
                </span>
                <span className="whitespace-nowrap font-mono text-base font-extrabold text-[#F5C400]">
                  {fmtBRL(o.valor)}
                </span>
              </div>
            ))}
            {live.recentOrders.length === 0 && <div className="flex flex-1 items-center justify-center text-[#808080]">Carregando pedidos...</div>}
          </div>
        </Quad>

        {/* NFs emitidas */}
        <Quad num="02" title="NFs Emitidas Hoje" sub="Faturamento" subDot>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {live.nfRecentes.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-[#808080]">Nenhuma NF emitida hoje</div>
            ) : live.nfRecentes.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-3 rounded border border-[#2A2A2A] bg-[#131313] px-3 py-3">
                <div>
                  <div className="font-bold text-[#C9C9C9]">NF #{n.numero}</div>
                  <div className="font-mono text-xs text-[#808080]">{n.hora}</div>
                </div>
                <span className="font-mono text-xl font-extrabold text-[#16C16E]">{fmtBRL(n.valor)}</span>
              </div>
            ))}
          </div>
        </Quad>

        {/* Sazonalidade */}
        <Quad num="03" title="Sazonalidade · 12 meses" sub={`Pico: ${ad.peakMonth}`} subDot>
          <div className="flex flex-1 items-end gap-1 pb-2">
            {ad.seasonality.map((s) => {
              const max = Math.max(...ad.seasonality.map((x) => x.v), 1);
              const h = max > 0 ? Math.round((s.v / max) * 100) : 0;
              return (
                <div key={s.m} className="flex flex-1 flex-col items-center gap-1">
                  <div className="w-full rounded-t" style={{ height: `${Math.max(h, 4)}%`, background: h === 100 ? "#F5C400" : "#374151", minHeight: 4 }} />
                  <span className="text-[9px] font-bold text-[#808080]">{s.m}</span>
                </div>
              );
            })}
          </div>
        </Quad>

        {/* KPIs logísticos */}
        <Quad num="04" title="KPIs de Operação" sub="Dados consolidados" subDot>
          <div className="grid flex-1 grid-cols-2 gap-4">
            {[
              { label: "Pedidos 12m", value: ad.totalPedidos12m.toLocaleString("pt-BR"), color: "#F5C400" },
              { label: "NFs Hoje", value: live.nfRecentes.length.toString(), color: "#16C16E" },
              { label: "Pedidos Abertos", value: live.recentOrders.length.toString(), color: "#3B82F6" },
              { label: "Clientes Ativos", value: kpis.clientesAtivos.toLocaleString("pt-BR"), color: "#8B5CF6" },
            ].map((k) => (
              <div key={k.label} className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] bg-[#131313] p-5">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">{k.label}</span>
                <div className="font-mono text-4xl font-extrabold leading-none" style={{ color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
        </Quad>
      </div>}

      </main>

      <style>{`
        @keyframes vp-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ticker-rail { animation: vp-ticker 75s linear infinite; }
        @keyframes vp-stock-flash { 0%,100% { background-color: #131313; } 50% { background-color: rgba(255,59,59,0.10); } }
        .animate-stock-flash { animation: vp-stock-flash 1.8s ease-in-out infinite; }
        @keyframes vp-crit-border { 0%,100% { border-color: #1E1E1E; } 50% { border-color: #FF3B3B; } }
        .animate-crit-border { animation: vp-crit-border 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

// ── Quad ──────────────────────────────────────────────────────────────────────

function Quad({
  num,
  title,
  sub,
  subDot,
  subIcon,
  subRed,
  critical,
  children,
}: {
  num: string;
  title: string;
  sub?: string;
  subDot?: boolean;
  subIcon?: React.ReactNode;
  subRed?: boolean;
  critical?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`relative flex flex-col overflow-hidden rounded-lg border border-[#1E1E1E] p-7 ${
        critical ? "animate-crit-border" : ""
      }`}
      style={{ background: "linear-gradient(180deg,#0C0C0C 0%, #050505 100%)" }}
    >
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: critical ? "#FF3B3B" : "#F5C400" }}
      />
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <span className="rounded-sm border border-[#F5C400]/35 bg-[#F5C400]/10 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-[#F5C400]">
            {num}
          </span>
          <h2 className="text-[22px] font-extrabold uppercase tracking-wider">{title}</h2>
        </div>
        {sub && (
          <span
            className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] ${
              subRed ? "text-[#FF3B3B]" : "text-[#808080]"
            }`}
          >
            {subDot && <span className="h-2 w-2 animate-pulse rounded-full bg-[#16C16E]" />}
            {subIcon}
            {sub}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
