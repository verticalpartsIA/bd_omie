import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  AlertTriangle, ArrowUpRight, ArrowDownRight, CheckCircle2,
  Package, TrendingUp, Users, Zap, Radio,
} from "lucide-react";
import { useAuth } from "@/lib/auth-mock";
import { useStrategicDashboard } from "@/hooks/useStrategicDashboard";
import { useAnalyticalDashboard } from "@/hooks/useAnalyticalDashboard";
import { useTVDashboard } from "@/hooks/useTVDashboard";
import { useNfeDashboard } from "@/hooks/useNfeDashboard";
import { formatBRL } from "@/data/executive-mock";

export const Route = createFileRoute("/tv")({
  head: () => ({ meta: [{ title: "Sala de Controle · TV · Geral — VerticalParts" }] }),
  component: TVScreen,
});

// ── Palette ───────────────────────────────────────────────────────────────────

const C = {
  yellow: "#F5C400",
  yellowDim: "#C99E00",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  orange: "#F97316",
  bg: "#070B11",
  card: "#0D1117",
  border: "#161D2A",
  text: "#F0F2F5",
  muted: "#6B7280",
  dim: "#374151",
};

const PIE_COLORS = [C.yellow, C.blue, C.green, C.orange, C.purple, "#06B6D4", "#EC4899"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCompact(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const PT_WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PT_MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TVCard({
  children,
  className = "",
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: "yellow" | "green" | "red";
}) {
  const glowClass = glow === "yellow"
    ? "shadow-[0_0_24px_rgba(245,196,0,0.08)]"
    : glow === "green"
    ? "shadow-[0_0_24px_rgba(34,197,94,0.08)]"
    : glow === "red"
    ? "shadow-[0_0_24px_rgba(239,68,68,0.08)]"
    : "";
  return (
    <div
      className={`rounded-2xl border p-5 ${glowClass} ${className}`}
      style={{ background: C.card, borderColor: C.border }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[9px] font-black uppercase tracking-[0.2em]"
      style={{ color: C.muted }}
    >
      {children}
    </div>
  );
}

function BigNumber({
  value,
  color,
  size = "lg",
}: {
  value: string;
  color?: string;
  size?: "sm" | "lg" | "xl";
}) {
  const cls =
    size === "xl"
      ? "text-5xl"
      : size === "lg"
      ? "text-3xl"
      : "text-xl";
  return (
    <div
      className={`font-mono font-black ${cls} leading-none tracking-tight`}
      style={{ color: color ?? C.text }}
    >
      {value}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const up = delta >= 0;
  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-bold"
      style={{
        background: up ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: up ? C.green : C.red,
      }}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(delta)}%
    </span>
  );
}

// ── Rotating card content ─────────────────────────────────────────────────────

const SLOT_LABELS = ["Top Vendedores", "Mix por Canal", "Tendência 12M"];

function SlotVendedores({ vendedores }: { vendedores: { name: string; v: number }[] }) {
  if (!vendedores.length)
    return <p style={{ color: C.muted }} className="text-sm">Carregando…</p>;
  const max = vendedores[0]?.v ?? 1;
  return (
    <div className="mt-3 space-y-2.5">
      {vendedores.slice(0, 5).map((v, i) => (
        <div key={v.name}>
          <div className="mb-0.5 flex items-center justify-between">
            <span className="truncate text-[11px] font-semibold" style={{ color: C.text, maxWidth: 140 }}>
              {i === 0 && <span className="mr-1" style={{ color: C.yellow }}>★</span>}
              {v.name.split(" ")[0]}
            </span>
            <span className="font-mono text-[11px] font-bold" style={{ color: C.yellow }}>
              {v.v} pedidos
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.border }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(v.v / max) * 100}%`,
                background: i === 0 ? C.yellow : C.blue,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotCanal({ mixCanal }: { mixCanal: { name: string; value: number }[] }) {
  if (!mixCanal.length)
    return <p style={{ color: C.muted }} className="text-sm">Carregando…</p>;
  return (
    <div className="mt-2 flex items-center gap-4">
      <div className="h-[120px] w-[120px] flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={mixCanal}
              dataKey="value"
              innerRadius={35}
              outerRadius={55}
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
            >
              {mixCanal.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-2">
        {mixCanal.map((seg, i) => (
          <div key={seg.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 flex-shrink-0 rounded-sm"
                style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
              />
              <span className="text-[11px]" style={{ color: C.text }}>
                {seg.name}
              </span>
            </div>
            <span className="font-mono text-[12px] font-bold" style={{ color: PIE_COLORS[i % PIE_COLORS.length] }}>
              {seg.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotEvolucao({ ebitda12m }: { ebitda12m: { mes: string; receita: number; ebitda: number }[] }) {
  if (!ebitda12m.length)
    return <p style={{ color: C.muted }} className="text-sm">Carregando…</p>;
  const data = ebitda12m.map((m) => ({
    mes: m.mes,
    receita: Math.round(m.receita / 1000),
    ebitda: Math.round(m.ebitda / 1000),
  }));
  return (
    <div className="mt-2 h-[120px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="tvGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.yellow} stopOpacity={0.3} />
              <stop offset="100%" stopColor={C.yellow} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="tvGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
              <stop offset="100%" stopColor={C.green} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="receita" stroke={C.yellow} strokeWidth={2} fill="url(#tvGrad1)" dot={false} />
          <Area type="monotone" dataKey="ebitda" stroke={C.green} strokeWidth={1.5} fill="url(#tvGrad2)" dot={false} />
          <Tooltip
            contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10, borderRadius: 6 }}
            formatter={(v: number, name: string) => [`R$ ${v}K`, name === "receita" ? "Receita" : "EBITDA"]}
            labelFormatter={(l) => l}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Live Events Ticker ────────────────────────────────────────────────────────

function LiveTicker({ events }: { events: { id: string; type: string; label: string; valor: number }[] }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const items =
    events.length > 0
      ? events
      : [{ id: "idle", type: "info", label: "Sistema em monitoramento ativo", valor: 0 }];

  const text = items
    .map((e) =>
      e.valor > 0
        ? `${e.type === "order" ? "🟡" : "🟢"} ${e.label} · ${fmtCompact(e.valor)}`
        : `◈ ${e.label}`,
    )
    .join("     ·     ");

  return (
    <div
      className="overflow-hidden"
      style={{ background: C.yellow, height: 36 }}
    >
      <div className="flex h-full items-center">
        <div
          className="flex-shrink-0 flex h-full items-center px-4 font-black text-xs uppercase tracking-widest"
          style={{ background: "#000", color: C.yellow, whiteSpace: "nowrap", minWidth: 140 }}
        >
          <Radio className="mr-2 h-3 w-3 animate-pulse" />
          AO VIVO
        </div>
        <div className="flex-1 overflow-hidden">
          <div
            ref={contentRef}
            className="inline-block whitespace-nowrap font-bold text-[12px] text-black"
            style={{
              animation: "tv-ticker 40s linear infinite",
              paddingLeft: "100%",
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── New Event Toast ───────────────────────────────────────────────────────────

function NewEventToast({ event }: { event: { label: string; valor: number; type: string } | null }) {
  if (!event) return null;
  return (
    <div
      className="fixed top-24 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-3 shadow-2xl"
      style={{
        background: event.type === "nf" ? "rgba(34,197,94,0.15)" : "rgba(245,196,0,0.12)",
        borderColor: event.type === "nf" ? C.green : C.yellow,
        backdropFilter: "blur(12px)",
        animation: "tv-toast-in 0.4s cubic-bezier(.34,1.56,.64,1) forwards",
      }}
    >
      <Zap
        className="h-5 w-5 flex-shrink-0 animate-pulse"
        style={{ color: event.type === "nf" ? C.green : C.yellow }}
      />
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
          {event.type === "nf" ? "NF Emitida" : "Novo Pedido"}
        </div>
        <div className="text-sm font-bold" style={{ color: C.text }}>{event.label}</div>
        {event.valor > 0 && (
          <div className="font-mono text-base font-black" style={{ color: event.type === "nf" ? C.green : C.yellow }}>
            {fmtCompact(event.valor)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

function TVScreen() {
  const { isAuthenticated, hydrated } = useAuth();
  const navigate = useNavigate();
  const now = useClock();

  const { kpis, cockpitCEO: alertas, mixCanal } = useStrategicDashboard();
  const { data: ad } = useAnalyticalDashboard();
  const { live, events, rotateSlot } = useTVDashboard();
  const { custoMap } = useNfeDashboard();
  const lucroBrutoNfe = useMemo(() => { let t = 0; custoMap.forEach((n) => { t += n.lucroBrutoBrl ?? 0; }); return t; }, [custoMap]);
  const margemNfe = useMemo(() => { let r = 0, l = 0; custoMap.forEach((n) => { r += n.receitaNfeBrl; l += n.lucroBrutoBrl ?? 0; }); return r > 0 ? (l / r) * 100 : null; }, [custoMap]);

  const [toast, setToast] = useState<typeof events[0] | null>(null);
  const latestEventId = useRef<string>("");

  // Auth guard — wait for hydration before redirecting (localStorage loads async)
  useEffect(() => {
    if (hydrated && !isAuthenticated) navigate({ to: "/login" });
  }, [hydrated, isAuthenticated, navigate]);

  // Show toast on new events
  useEffect(() => {
    if (events.length > 0 && events[0].id !== latestEventId.current) {
      latestEventId.current = events[0].id;
      setToast(events[0]);
      const t = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(t);
    }
  }, [events]);

  const forecast = kpis.forecastMes;
  const forecastPct = forecast.meta > 0
    ? Math.round((forecast.projetado / forecast.meta) * 100)
    : 0;
  const criticos = alertas.filter((a) => a.level === "critico");

  const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = `${PT_WEEKDAYS[now.getDay()]}, ${now.getDate()} de ${PT_MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`;

  // While localStorage is being read, show black screen (no flash to login)
  if (!hydrated) return <div style={{ background: "#070B11", minHeight: "100vh" }} />;
  if (!isAuthenticated) return null;

  return (
    <>
      {/* Keyframe injections */}
      <style>{`
        @keyframes tv-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes tv-toast-in {
          0%   { opacity: 0; transform: translateX(60px) scale(0.9); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes tv-pulse-border {
          0%, 100% { border-color: rgba(245,196,0,0.15); }
          50%       { border-color: rgba(245,196,0,0.45); }
        }
        .tv-live-card { animation: tv-pulse-border 3s ease-in-out infinite; }
      `}</style>

      <NewEventToast event={toast} />

      <div
        className="flex min-h-screen flex-col select-none"
        style={{ background: C.bg, color: C.text, fontFamily: "'Poppins', sans-serif" }}
      >
        {/* ── Header ──────────────────────────────────────────────── */}
        <header
          className="flex flex-shrink-0 items-center justify-between px-8 py-4"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          {/* Logo + Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg font-black text-lg"
                style={{ background: C.yellow, color: "#000" }}
              >
                VP
              </div>
              <span className="font-black text-lg tracking-tight" style={{ color: C.text }}>
                VERTICAL<span style={{ color: C.yellow }}>PARTS</span>
              </span>
            </div>
            <span style={{ color: C.border, fontSize: 20 }}>|</span>
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: C.muted }}>
                Sala de Controle
              </div>
              <div className="text-sm font-bold" style={{ color: C.text }}>
                TV · Geral
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 rounded-full border px-3 py-1" style={{ borderColor: C.green, background: "rgba(34,197,94,0.08)" }}>
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: C.green }} />
            <span className="text-[11px] font-bold" style={{ color: C.green }}>AO VIVO</span>
          </div>

          {/* Clock + Date */}
          <div className="text-right">
            <div className="font-mono text-4xl font-black tabular-nums leading-none" style={{ color: C.yellow }}>
              {timeStr}
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: C.muted }}>{dateStr}</div>
          </div>
        </header>

        {/* ── Main grid ───────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden p-5">
          <div className="grid h-full gap-4" style={{ gridTemplateRows: "auto 1fr 1fr", gridTemplateColumns: "1fr" }}>

            {/* Row 1 — 4 KPI cards */}
            <div className="grid grid-cols-4 gap-4">
              {/* Receita */}
              <TVCard glow="yellow">
                <Label>Receita do mês</Label>
                <BigNumber value={fmtCompact(kpis.receita)} color={C.yellow} size="xl" />
                <div className="mt-2 flex items-center gap-2">
                  <DeltaBadge delta={kpis.ebitdaDelta} />
                  <span className="text-[11px]" style={{ color: C.muted }}>MoM</span>
                </div>
              </TVCard>

              {/* EBITDA */}
              <TVCard>
                <Label>EBITDA</Label>
                <BigNumber value={fmtCompact(kpis.ebitda)} size="xl" />
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className="rounded px-2 py-0.5 font-mono text-sm font-black"
                    style={{ background: "rgba(34,197,94,0.12)", color: C.green }}
                  >
                    {kpis.ebitdaPct}%
                  </span>
                  <span className="text-[11px]" style={{ color: C.muted }}>margem</span>
                </div>
              </TVCard>

              {/* Forecast */}
              <TVCard glow={forecastPct >= 80 ? "green" : forecastPct >= 60 ? "yellow" : "red"}>
                <Label>Forecast do mês</Label>
                <BigNumber
                  value={`${forecastPct}%`}
                  color={forecastPct >= 80 ? C.green : forecastPct >= 60 ? C.yellow : C.red}
                  size="xl"
                />
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: C.border }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(forecastPct, 100)}%`,
                        background: forecastPct >= 80 ? C.green : forecastPct >= 60 ? C.yellow : C.red,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px]" style={{ color: C.muted }}>
                    <span>{fmtCompact(forecast.realizado)} realiz.</span>
                    <span>meta {fmtCompact(forecast.meta)}</span>
                  </div>
                </div>
              </TVCard>

              {/* Caixa */}
              <TVCard glow={kpis.caixa30 < 0 ? "red" : undefined}>
                <Label>Caixa projetado</Label>
                <BigNumber
                  value={fmtCompact(kpis.caixa30)}
                  color={kpis.caixa30 < 0 ? C.red : C.text}
                  size="xl"
                />
                <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: C.muted }}>
                  <span>D+30</span>
                  <span
                    className="font-mono font-bold"
                    style={{ color: kpis.caixa90 < 0 ? C.red : C.green }}
                  >
                    {fmtCompact(kpis.caixa90)} D+90
                  </span>
                </div>
              </TVCard>
            </div>

            {/* Row 2 — 3 cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Pedidos Recentes */}
              <TVCard className="tv-live-card flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <Label>Pedidos Recentes</Label>
                  <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: C.green }}>
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: C.green }} />
                    live · 15s
                  </span>
                </div>
                <div className="flex-1 space-y-1.5 overflow-hidden">
                  {live.recentOrders.length === 0 ? (
                    <p className="text-sm" style={{ color: C.muted }}>Carregando pedidos…</p>
                  ) : (
                    live.recentOrders.slice(0, 8).map((o, i) => (
                      <div
                        key={o.id}
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
                        style={{
                          background: i === 0 ? "rgba(245,196,0,0.06)" : "transparent",
                          borderLeft: i === 0 ? `3px solid ${C.yellow}` : "3px solid transparent",
                        }}
                      >
                        <span className="font-mono text-[10px] w-12 flex-shrink-0" style={{ color: C.muted }}>
                          {o.hora}
                        </span>
                        <span className="flex-1 truncate text-[11px] font-semibold" style={{ color: C.text }}>
                          {o.cliente}
                        </span>
                        <span className="font-mono text-[11px] font-black flex-shrink-0" style={{ color: C.yellow }}>
                          {fmtCompact(o.valor)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </TVCard>

              {/* Alertas + Estoque Crítico */}
              <TVCard className="flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <Label>Alertas & Estoque</Label>
                  {criticos.length > 0 && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black"
                      style={{ background: "rgba(239,68,68,0.12)", color: C.red }}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {criticos.length} crítico{criticos.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {/* Top alerts */}
                <div className="space-y-1.5 mb-3">
                  {alertas.slice(0, 2).map((a) => (
                    <div
                      key={a.title}
                      className="flex items-start gap-2 rounded-lg px-2.5 py-1.5"
                      style={{
                        background:
                          a.level === "critico"
                            ? "rgba(239,68,68,0.08)"
                            : "rgba(245,196,0,0.06)",
                      }}
                    >
                      <span
                        className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                        style={{ background: a.level === "critico" ? C.red : C.yellow, marginTop: 4 }}
                      />
                      <span className="text-[10px] leading-relaxed" style={{ color: C.text }}>
                        {a.title}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Estoque crítico divider */}
                <div className="border-t pt-3" style={{ borderColor: C.border }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: C.muted }}>
                      Estoque Crítico
                    </span>
                    <span className="font-mono text-lg font-black" style={{ color: C.red }}>
                      {live.criticos.length === 6 ? "357+" : live.criticos.length}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {live.criticos.slice(0, 3).map((c) => (
                      <div key={c.codigo} className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold flex-shrink-0" style={{ color: C.yellow }}>
                          {c.codigo}
                        </span>
                        <span className="truncate text-[10px]" style={{ color: C.muted }}>
                          {c.descricao}
                        </span>
                        <span className="text-[10px] font-bold flex-shrink-0" style={{ color: C.orange }}>
                          {c.media.toFixed(0)}/m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TVCard>

              {/* Top Clientes */}
              <TVCard className="flex flex-col">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" style={{ color: C.blue }} />
                  <Label>Top Clientes · 12m</Label>
                </div>
                <div className="flex-1 space-y-2">
                  {kpis.ebitda12m.length === 0 ? (
                    <p className="text-sm" style={{ color: C.muted }}>Carregando…</p>
                  ) : (
                    // Use a mini bar chart with ebitda data as proxy
                    <div className="h-[140px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kpis.ebitda12m.slice(-6)} layout="horizontal">
                          <Bar dataKey="receita" radius={[3, 3, 0, 0]}>
                            {kpis.ebitda12m.slice(-6).map((_, i) => (
                              <Cell key={i} fill={i === kpis.ebitda12m.slice(-6).length - 1 ? C.yellow : C.blue} />
                            ))}
                          </Bar>
                          <Tooltip
                            contentStyle={{ background: C.card, border: `1px solid ${C.border}`, fontSize: 10 }}
                            formatter={(v: number) => [fmtCompact(v), "Receita"]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </TVCard>
            </div>

            {/* Row 3 — 3 cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Métricas Comerciais */}
              <TVCard className="flex flex-col">
                <Label>Métricas Comerciais · 12m</Label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(245,196,0,0.06)", border: `1px solid rgba(245,196,0,0.12)` }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
                      Ticket Médio
                    </div>
                    <div className="mt-1 font-mono text-xl font-black" style={{ color: C.yellow }}>
                      {ad.ticketMedio > 0 ? fmtCompact(ad.ticketMedio) : "…"}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(34,197,94,0.06)", border: `1px solid rgba(34,197,94,0.12)` }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
                      Recompra
                    </div>
                    <div className="mt-1 font-mono text-xl font-black" style={{ color: C.green }}>
                      {ad.recompraPct > 0 ? `${ad.recompraPct}%` : "…"}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(59,130,246,0.06)", border: `1px solid rgba(59,130,246,0.12)` }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
                      Pedidos 12m
                    </div>
                    <div className="mt-1 font-mono text-xl font-black" style={{ color: C.blue }}>
                      {ad.totalPedidos12m > 0 ? ad.totalPedidos12m.toLocaleString("pt-BR") : "…"}
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: "rgba(139,92,246,0.06)", border: `1px solid rgba(139,92,246,0.12)` }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
                      Clientes Ativos
                    </div>
                    <div className="mt-1 font-mono text-xl font-black" style={{ color: C.purple }}>
                      {kpis.clientesAtivos > 0 ? kpis.clientesAtivos.toLocaleString("pt-BR") : "…"}
                    </div>
                  </div>
                  <div
                    className="col-span-2 rounded-xl p-3"
                    style={{ background: "rgba(34,197,94,0.06)", border: `1px solid rgba(34,197,94,0.12)` }}
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: C.muted }}>
                      Lucro Bruto NF-e
                    </div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="font-mono text-xl font-black" style={{ color: C.green }}>
                        {lucroBrutoNfe > 0 ? fmtCompact(lucroBrutoNfe) : "…"}
                      </span>
                      {margemNfe != null && (
                        <span className="font-mono text-sm font-bold" style={{ color: C.muted }}>
                          {margemNfe.toFixed(1)}% margem
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </TVCard>

              {/* NFs do dia */}
              <TVCard className="flex flex-col">
                <div className="mb-3 flex items-center justify-between">
                  <Label>NFs Emitidas Hoje</Label>
                  {live.nfRecentes.length > 0 && (
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[11px] font-black"
                      style={{ background: "rgba(34,197,94,0.12)", color: C.green }}
                    >
                      {live.nfRecentes.length}
                    </span>
                  )}
                </div>
                {live.nfRecentes.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8" style={{ color: C.dim }} />
                    <p className="text-[11px]" style={{ color: C.muted }}>
                      Nenhuma NF emitida hoje ainda
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {live.nfRecentes.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-center justify-between rounded-lg px-2.5 py-1.5"
                        style={{ background: "rgba(34,197,94,0.06)" }}
                      >
                        <span className="font-mono text-[11px] font-bold" style={{ color: C.green }}>
                          NF {n.numero}
                        </span>
                        <span className="font-mono text-[11px] font-black" style={{ color: C.text }}>
                          {fmtCompact(n.valor)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 text-center font-mono text-2xl font-black" style={{ color: C.green }}>
                      {fmtCompact(live.nfRecentes.reduce((s, n) => s + n.valor, 0))}
                    </div>
                  </div>
                )}
              </TVCard>

              {/* ROTATING card */}
              <TVCard className="flex flex-col">
                <div className="mb-2 flex items-center justify-between">
                  <Label>{SLOT_LABELS[rotateSlot]}</Label>
                  <div className="flex gap-1">
                    {SLOT_LABELS.map((_, i) => (
                      <span
                        key={i}
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: i === rotateSlot ? 14 : 6,
                          background: i === rotateSlot ? C.yellow : C.dim,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  {rotateSlot === 0 && <SlotVendedores vendedores={ad.vendedores} />}
                  {rotateSlot === 1 && <SlotCanal mixCanal={mixCanal} />}
                  {rotateSlot === 2 && <SlotEvolucao ebitda12m={kpis.ebitda12m} />}
                </div>
                <div className="mt-2 text-right text-[9px]" style={{ color: C.dim }}>
                  Muda em 30 min
                </div>
              </TVCard>
            </div>
          </div>
        </div>

        {/* ── Bottom Ticker ────────────────────────────────────────── */}
        <div className="flex-shrink-0">
          <LiveTicker events={events} />
        </div>
      </div>
    </>
  );
}
