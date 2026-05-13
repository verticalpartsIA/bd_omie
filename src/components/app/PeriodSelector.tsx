import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function isoMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function isoStartOfYear(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function formatDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ── Presets ───────────────────────────────────────────────────────────────────

interface Preset {
  key: string;
  label: string;
  range: () => DateRange;
}

const PRESETS: Preset[] = [
  { key: "30d",   label: "30 dias",    range: () => ({ from: isoDaysAgo(30),    to: isoToday() }) },
  { key: "90d",   label: "90 dias",    range: () => ({ from: isoDaysAgo(90),    to: isoToday() }) },
  { key: "6m",    label: "6 meses",    range: () => ({ from: isoMonthsAgo(6),   to: isoToday() }) },
  { key: "ytd",   label: "Este ano",   range: () => ({ from: isoStartOfYear(),  to: isoToday() }) },
  { key: "12m",   label: "12 meses",   range: () => ({ from: isoMonthsAgo(12),  to: isoToday() }) },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function PeriodSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from);
  const [to, setTo]     = useState(value.to);

  const activePreset = PRESETS.find((p) => {
    const r = p.range();
    // Match within ±1 day to account for render timing
    return Math.abs(new Date(r.from).getTime() - new Date(value.from).getTime()) < 86_400_000 * 2
      && Math.abs(new Date(r.to).getTime() - new Date(value.to).getTime()) < 86_400_000 * 2;
  });

  function applyCustom() {
    if (from && to && from <= to) {
      onChange({ from, to });
      setOpen(false);
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5">
      {/* Preset chips */}
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => { onChange(p.range()); setOpen(false); }}
          className={`rounded border px-3 py-2 text-xs font-semibold transition-colors ${
            activePreset?.key === p.key
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-foreground/70 hover:border-neutral-400"
          }`}
        >
          {p.label}
        </button>
      ))}

      {/* Custom range trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded border px-3 py-2 text-xs font-semibold transition-colors ${
          open || !activePreset
            ? "border-primary bg-primary/10 text-primary"
            : "border-border bg-card text-foreground/70 hover:border-neutral-400"
        }`}
      >
        <Calendar className="h-3.5 w-3.5" />
        {!activePreset
          ? `${formatDisplay(value.from)} → ${formatDisplay(value.to)}`
          : "Personalizado"}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Custom date panel */}
      {open && (
        <div className="absolute top-10 left-0 z-50 flex items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-xl">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              De
            </label>
            <input
              type="date"
              value={from}
              max={to || isoToday()}
              onChange={(e) => setFrom(e.target.value)}
              className="block rounded border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Até
            </label>
            <input
              type="date"
              value={to}
              min={from}
              max={isoToday()}
              onChange={(e) => setTo(e.target.value)}
              className="block rounded border border-border bg-background px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
            />
          </div>
          <button
            onClick={applyCustom}
            disabled={!from || !to || from > to}
            className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-40"
          >
            Aplicar
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
