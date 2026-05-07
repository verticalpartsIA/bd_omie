import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowUp,
  ArrowUpRight,
  ClockAlert,
  FileCheck2,
  FileClock,
  PackageX,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserX,
} from "lucide-react";
import { RoleGuard } from "@/components/app/RoleGuard";

export const Route = createFileRoute("/_app/operational")({
  head: () => ({ meta: [{ title: "Operational TV — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "vendedor", "estoque", "tv"]}>
      <OperationalTV />
    </RoleGuard>
  ),
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const pad = (n: number) => String(n).padStart(2, "0");
const REFRESH_MIN = 15;

const ALERTS = [
  { tag: "crit", Icon: AlertOctagon, title: "MARGEM NEGATIVA", text: "Cabo Aço 6mm IWRC · −R$ 8,40 / un · 142 unidades vendidas" },
  { tag: "crit", Icon: PackageX, title: "ESTOQUE CRÍTICO", text: "Painel CCM-V2 · 2 unidades · ruptura em 5 dias" },
  { tag: "warn", Icon: ClockAlert, title: "INADIMPLÊNCIA", text: "Predial RJ · R$ 38.420 vencidos há 14 dias" },
  { tag: "crit", Icon: UserX, title: "RISCO DE CHURN", text: "Top Steps Eng. · 0 pedidos em 60 dias · NPS caiu para 4" },
  { tag: "warn", Icon: TrendingDown, title: "QUEDA REGIONAL", text: "Filial PR · −18% vs semana anterior" },
] as const;

const SELLERS = [
  { name: "Fernanda Almeida", value: "R$ 64.820", pct: 92 },
  { name: "Ricardo Carvalho", value: "R$ 52.140", pct: 74 },
  { name: "Júlia Tavares", value: "R$ 47.380", pct: 67 },
  { name: "Pedro Souza", value: "R$ 38.920", pct: 55 },
  { name: "André Martins", value: "R$ 31.240", pct: 44 },
];

const STOCKS = [
  { level: "crit", name: "Cabo de Aço 8mm 6×19 IWRC", sku: "VP-CA-0819-IWRC", qty: 12, min: 50, days: 2 },
  { level: "crit", name: "Polia de Tração 320mm", sku: "VP-PT-320", qty: 4, min: 20, days: 3 },
  { level: "crit", name: "Painel de Controle CCM-V2", sku: "VP-CCM-V2", qty: 2, min: 10, days: 5 },
  { level: "warn", name: "Rolamento SKF 6204-2RS", sku: "VP-RL-6204", qty: 28, min: 60, days: 9 },
  { level: "warn", name: "Degrau Escada Rolante 400mm", sku: "VP-DE-400", qty: 42, min: 80, days: 12 },
] as const;

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function OperationalTV() {
  const now = useClock();
  const clock = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "--:--:--";
  const dateLbl = now ? `${DIAS[now.getDay()]} · ${pad(now.getDate())} ${MESES[now.getMonth()]} ${now.getFullYear()}` : "";
  const nextRefresh = now ? new Date(now.getTime() + REFRESH_MIN * 60 * 1000) : null;
  const refreshLbl = nextRefresh ? `${pad(nextRefresh.getHours())}:${pad(nextRefresh.getMinutes())}` : "--:--";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black font-poppins text-white"
      style={{ fontFamily: "'Poppins', system-ui, sans-serif" }}
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
              Sala de Controle · TV
            </span>
          </div>
        </div>
        <div className="flex items-baseline justify-center gap-4">
          <div className="font-mono text-[28px] font-bold tabular-nums tracking-wider">{clock}</div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#A0A0A0]">
            {dateLbl}
          </div>
        </div>
        <div className="flex items-center justify-end gap-4">
          <div className="inline-flex items-center gap-2 rounded border border-[#2A2A2A] bg-[#1E1E1E] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#C9C9C9]">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#F5C400]" style={{ animationDuration: "6s" }} />
            Auto-refresh em <span className="font-mono text-[#F5C400]">{refreshLbl}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded border border-[#FF6B6B] bg-[#FF3B3B] px-4 py-2 text-[13px] font-extrabold uppercase tracking-[0.18em] text-white animate-pulse">
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
            LIVE
          </div>
        </div>
      </header>

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
            {[...ALERTS, ...ALERTS].map((a, i) => (
              <div key={i} className="inline-flex h-full items-center gap-3 border-r border-white/20 px-7 text-base font-semibold text-white">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.16em] ${
                    a.tag === "crit" ? "bg-black text-[#FF3B3B]" : "bg-[#F5C400] text-black"
                  }`}
                >
                  {a.tag === "crit" ? "Crítico" : "Atenção"}
                </span>
                <a.Icon className="h-4 w-4 text-white/80" />
                <strong className="font-extrabold text-[#F5C400]">{a.title}</strong>
                <span>· {a.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUADRANTS */}
      <main className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-4 p-4">
        {/* Q1 SALES */}
        <Quad num="01" title="Vendas Hoje" sub="Tempo real" subDot>
          <div className="flex flex-1 flex-col justify-center gap-6">
            <div>
              <div className="flex items-baseline gap-3 font-mono text-[110px] font-black leading-none tracking-tight tabular-nums">
                <span className="font-poppins text-5xl font-bold text-[#F5C400]" style={{ fontFamily: "'Poppins',sans-serif" }}>R$</span>
                <span>284.500</span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-xl font-semibold text-[#C9C9C9]">
                <span className="inline-flex items-center gap-2 rounded border border-[#16C16E]/35 bg-[#16C16E]/15 px-3.5 py-1.5 text-2xl font-extrabold text-[#16C16E]">
                  <ArrowUp className="h-5 w-5" /> +12%
                </span>
                <span>vs ontem · R$ 254.020</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-sm font-bold uppercase tracking-[0.16em] text-[#A0A0A0]">Meta do dia</div>
                  <div className="font-mono text-sm font-semibold text-[#808080]">R$ 365.000</div>
                </div>
                <div className="font-mono text-3xl font-extrabold tracking-tight text-[#F5C400]">78%</div>
              </div>
              <div className="relative h-5 overflow-hidden rounded border border-[#2A2A2A] bg-[#1E1E1E]">
                <div
                  className="h-full rounded-sm shadow-[0_0_24px_rgba(245,196,0,0.45)]"
                  style={{
                    width: "78%",
                    background: "linear-gradient(90deg,#C99E00,#F5C400,#FFD400)",
                  }}
                />
              </div>
            </div>
          </div>
        </Quad>

        {/* Q2 SELLERS */}
        <Quad num="02" title="Ranking Vendedores" sub="Atualizado agora" subDot>
          <div className="flex flex-1 flex-col gap-3">
            {SELLERS.map((s, i) => {
              const top = i === 0;
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
                      <span className={`truncate ${top ? "text-[26px] font-extrabold" : "text-[22px] font-bold"}`}>{s.name}</span>
                      <span className={`whitespace-nowrap font-mono font-extrabold text-[#F5C400] ${top ? "text-[26px]" : "text-[22px]"}`}>
                        {s.value}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-[#2A2A2A]">
                      <div
                        className="h-full rounded"
                        style={{ width: `${s.pct}%`, background: top ? "#F5C400" : "#808080" }}
                      />
                    </div>
                  </div>
                  <div
                    className={`min-w-[64px] text-right font-mono font-bold ${
                      top ? "text-[22px] text-[#F5C400]" : "text-lg text-[#A0A0A0]"
                    }`}
                  >
                    {s.pct}%
                  </div>
                </div>
              );
            })}
          </div>
        </Quad>

        {/* Q3 STOCK */}
        <Quad num="03" title="Alertas de Estoque" critical sub="7 itens abaixo do mínimo" subIcon={<AlertCircle className="h-3.5 w-3.5" />} subRed>
          <div className="flex flex-1 flex-col gap-2.5 overflow-hidden">
            {STOCKS.map((s) => (
              <div
                key={s.sku}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 rounded border border-[#1E1E1E] bg-[#131313] p-3.5 ${
                  s.level === "crit" ? "border-l-4 border-l-[#FF3B3B] animate-stock-flash" : "border-l-4 border-l-[#F5C400]"
                }`}
              >
                <span
                  className={`whitespace-nowrap rounded-sm px-2 py-1 font-mono text-[11px] font-extrabold uppercase tracking-[0.14em] ${
                    s.level === "crit" ? "bg-[#FF3B3B] text-white" : "bg-[#F5C400] text-black"
                  }`}
                >
                  {s.level === "crit" ? "Crítico" : "Atenção"}
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-lg font-bold">{s.name}</span>
                  <span className="font-mono text-xs font-semibold tracking-wider text-[#808080]">{s.sku}</span>
                </div>
                <div className="text-right font-mono text-lg font-bold text-[#C9C9C9]">
                  {s.qty}
                  <span className="block text-[11px] font-semibold text-[#808080]">/ mín {s.min}</span>
                </div>
                <div className="flex min-w-[64px] flex-col items-center">
                  <span
                    className={`font-mono text-3xl font-extrabold leading-none ${
                      s.level === "crit" ? "text-[#FF3B3B]" : "text-[#F5C400]"
                    }`}
                  >
                    {s.days}
                  </span>
                  <span className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#808080]">dias</span>
                </div>
              </div>
            ))}
          </div>
        </Quad>

        {/* Q4 FINANCE */}
        <Quad num="04" title="Financeiro Hoje" sub="Sincronizado · 12s" subDot>
          <div className="grid flex-1 grid-rows-[auto_1fr] gap-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] border-l-4 border-l-[#16C16E] bg-[#131313] p-5">
                <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">
                  <TrendingUp className="h-3.5 w-3.5 text-[#16C16E]" />
                  A Receber Hoje
                </span>
                <div className="font-mono text-4xl font-extrabold leading-none tracking-tight text-[#16C16E]">
                  <span className="mr-1.5 text-xl opacity-70">R$</span>45.200
                </div>
                <span className="flex items-center gap-2 text-xs font-semibold text-[#A0A0A0]">
                  <FileCheck2 className="h-3 w-3" />
                  <span className="font-mono text-[#C9C9C9]">14 títulos</span> · 4 vencendo em 24h
                </span>
              </div>
              <div className="flex flex-col gap-2 rounded-md border border-[#1E1E1E] border-l-4 border-l-[#FF3B3B] bg-[#131313] p-5">
                <span className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#808080]">
                  <TrendingDown className="h-3.5 w-3.5 text-[#FF3B3B]" />
                  A Pagar Hoje
                </span>
                <div className="font-mono text-4xl font-extrabold leading-none tracking-tight text-[#FF3B3B]">
                  <span className="mr-1.5 text-xl opacity-70">R$</span>23.100
                </div>
                <span className="flex items-center gap-2 text-xs font-semibold text-[#A0A0A0]">
                  <FileClock className="h-3 w-3" />
                  <span className="font-mono text-[#C9C9C9]">7 títulos</span> · 2 fornecedores
                </span>
              </div>
            </div>
            <div className="flex min-h-0 flex-col gap-3.5 rounded-md border border-[#1E1E1E] bg-[#131313] p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#C9C9C9]">
                  Fluxo de Caixa · 7 dias
                </span>
                <span className="inline-flex items-center gap-2 font-mono text-xl font-extrabold text-[#16C16E]">
                  <ArrowUpRight className="h-4 w-4" /> Saldo +R$ 154.380
                </span>
              </div>
              <div className="min-h-0 flex-1">
                <CashflowChart />
              </div>
              <div className="flex items-center gap-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#808080]">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[3px] w-3.5 rounded-sm bg-[#16C16E]" /> Entradas
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[3px] w-3.5 rounded-sm bg-[#FF3B3B]" /> Saídas
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-[3px] w-3.5 rounded-sm bg-[#F5C400]" /> Saldo acumulado
                </span>
              </div>
            </div>
          </div>
        </Quad>
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

function CashflowChart() {
  return (
    <svg viewBox="0 0 720 200" preserveAspectRatio="none" className="h-full w-full">
      <g stroke="#1E1E1E" strokeWidth="1">
        <line x1="0" y1="40" x2="720" y2="40" />
        <line x1="0" y1="100" x2="720" y2="100" />
        <line x1="0" y1="160" x2="720" y2="160" />
      </g>
      <line x1="0" y1="160" x2="720" y2="160" stroke="#2A2A2A" strokeWidth="1.5" />
      <g>
        <rect x="30" y="80" width="22" height="80" fill="#16C16E" rx="2" />
        <rect x="56" y="120" width="22" height="40" fill="#FF3B3B" rx="2" />
        <rect x="130" y="60" width="22" height="100" fill="#16C16E" rx="2" />
        <rect x="156" y="110" width="22" height="50" fill="#FF3B3B" rx="2" />
        <rect x="230" y="50" width="22" height="110" fill="#16C16E" rx="2" />
        <rect x="256" y="100" width="22" height="60" fill="#FF3B3B" rx="2" />
        <rect x="330" y="44" width="22" height="116" fill="#16C16E" rx="2" />
        <rect x="356" y="100" width="22" height="60" fill="#FF3B3B" rx="2" />
        <rect x="430" y="70" width="22" height="90" fill="rgba(22,193,110,0.55)" rx="2" />
        <rect x="456" y="116" width="22" height="44" fill="rgba(255,59,59,0.55)" rx="2" />
        <rect x="530" y="52" width="22" height="108" fill="rgba(22,193,110,0.55)" rx="2" />
        <rect x="556" y="106" width="22" height="54" fill="rgba(255,59,59,0.55)" rx="2" />
        <rect x="630" y="64" width="22" height="96" fill="rgba(22,193,110,0.55)" rx="2" />
        <rect x="656" y="112" width="22" height="48" fill="rgba(255,59,59,0.55)" rx="2" />
      </g>
      <polyline
        fill="none"
        stroke="#F5C400"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points="42,135 152,118 252,98 352,80 452,90 552,72 652,80"
      />
      <g fill="#F5C400" stroke="#000" strokeWidth="2">
        <circle cx="42" cy="135" r="4" />
        <circle cx="152" cy="118" r="4" />
        <circle cx="252" cy="98" r="4" />
        <circle cx="352" cy="80" r="5" fill="#FFD400" />
        <circle cx="452" cy="90" r="4" opacity="0.7" />
        <circle cx="552" cy="72" r="4" opacity="0.7" />
        <circle cx="652" cy="80" r="4" opacity="0.7" />
      </g>
      <line x1="364" y1="20" x2="364" y2="170" stroke="#F5C400" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
      <text x="364" y="14" textAnchor="middle" fontSize="10" fontWeight="800" fill="#F5C400" letterSpacing="2">HOJE</text>
      <g fontSize="11" fontWeight="700" fill="#808080" textAnchor="middle">
        <text x="52" y="190">Sex</text>
        <text x="152" y="190">Sáb</text>
        <text x="252" y="190">Seg</text>
        <text x="352" y="190" fill="#F5C400">Qua</text>
        <text x="452" y="190">Qui</text>
        <text x="552" y="190">Sex</text>
        <text x="652" y="190">Seg</text>
      </g>
    </svg>
  );
}