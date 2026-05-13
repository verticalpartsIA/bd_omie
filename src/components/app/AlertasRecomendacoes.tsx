import { useEffect, useState } from "react";
import { AlertOctagon, AlertTriangle, Info, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

export type AlertLevel = "critico" | "atencao" | "info";

export interface AlertItem {
  level: AlertLevel;
  title: string;
  detail?: string;
  acao?: string;
  icon?: LucideIcon;
}

const cfg: Record<AlertLevel, { cls: string; chip: string; Icon: LucideIcon; label: string }> = {
  critico:  { cls: "border-l-destructive bg-destructive/5", chip: "bg-destructive text-destructive-foreground", Icon: AlertOctagon, label: "Crítico" },
  atencao:  { cls: "border-l-warning bg-warning/5",         chip: "bg-warning text-warning-foreground",         Icon: AlertTriangle, label: "Atenção" },
  info:     { cls: "border-l-primary bg-primary/5",         chip: "bg-primary text-primary-foreground",         Icon: Info,          label: "Info" },
};

// Sort order: critico first, then atencao, then info
const LEVEL_ORDER: AlertLevel[] = ["critico", "atencao", "info"];

interface Props {
  title?: string;
  items: AlertItem[];
  empty?: string;
  /** When true, shows one card at a time and auto-rotates every N ms (default 6000) */
  carousel?: boolean;
  carouselInterval?: number;
}

export function AlertasRecomendacoes({
  title = "Alertas e Recomendações",
  items,
  empty = "Nenhum alerta no momento. Operação saudável.",
  carousel = false,
  carouselInterval = 6000,
}: Props) {
  const sorted = [...items].sort(
    (a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level),
  );

  const [active, setActive] = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right">("right");
  const [visible, setVisible] = useState(true);

  // Reset active index when items change
  useEffect(() => {
    setActive(0);
  }, [items.length]);

  // Auto-rotate
  useEffect(() => {
    if (!carousel || sorted.length <= 1) return;
    const id = setInterval(() => {
      navigate("right");
    }, carouselInterval);
    return () => clearInterval(id);
  }, [carousel, sorted.length, carouselInterval, active]);

  function navigate(dir: "left" | "right") {
    setAnimDir(dir);
    setVisible(false);
    setTimeout(() => {
      setActive((prev) => {
        if (dir === "right") return (prev + 1) % sorted.length;
        return (prev - 1 + sorted.length) % sorted.length;
      });
      setVisible(true);
    }, 150);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold">{title}</h4>
          <span className="text-[11px] text-muted-foreground">0 item(s)</span>
        </div>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }

  // ── Carousel mode ────────────────────────────────────────────────────────────
  if (carousel && sorted.length > 0) {
    const idx = Math.min(active, sorted.length - 1);
    const it = sorted[idx];
    const c = cfg[it.level];
    const Ic = it.icon ?? c.Icon;

    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold">{title}</h4>
            {/* Live pulse */}
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              ao vivo
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">
              {idx + 1} / {sorted.length}
            </span>
            <button
              onClick={() => navigate("left")}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => navigate("right")}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted transition-colors"
              title="Próximo"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Card */}
        <div
          className={`flex items-start gap-3 rounded-md border-l-4 p-4 transition-all duration-150 ${c.cls} ${
            visible ? "opacity-100 translate-x-0" : animDir === "right" ? "opacity-0 -translate-x-2" : "opacity-0 translate-x-2"
          }`}
          style={{ minHeight: "96px" }}
        >
          <Ic className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${c.chip}`}>
                {c.label}
              </span>
              <span className="text-sm font-bold">{it.title}</span>
            </div>
            {it.detail && <p className="mt-1.5 text-xs text-muted-foreground">{it.detail}</p>}
            {it.acao && <p className="mt-1.5 text-xs font-semibold text-foreground">→ {it.acao}</p>}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mt-3 flex justify-center gap-1.5">
          {sorted.map((s, i) => (
            <button
              key={i}
              onClick={() => { setAnimDir(i > idx ? "right" : "left"); setVisible(false); setTimeout(() => { setActive(i); setVisible(true); }, 150); }}
              className={`h-1.5 rounded-full transition-all ${
                i === idx
                  ? `w-4 ${cfg[s.level].chip.split(" ")[0]}`
                  : "w-1.5 bg-muted-foreground/30"
              }`}
              title={s.title}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── List mode (default) ──────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold">{title}</h4>
        <span className="text-[11px] text-muted-foreground">{items.length} item(s)</span>
      </div>
      <ul className="space-y-2">
        {sorted.map((it, i) => {
          const c = cfg[it.level];
          const Ic = it.icon ?? c.Icon;
          return (
            <li key={i} className={`flex items-start gap-3 rounded-md border-l-4 p-3 ${c.cls}`}>
              <Ic className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${c.chip}`}>{c.label}</span>
                  <span className="text-sm font-bold">{it.title}</span>
                </div>
                {it.detail && <p className="mt-1 text-xs text-muted-foreground">{it.detail}</p>}
                {it.acao && <p className="mt-1 text-xs font-semibold text-foreground">→ {it.acao}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
