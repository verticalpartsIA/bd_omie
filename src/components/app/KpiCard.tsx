import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Sparkles, type LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: LucideIcon;
  accent?: boolean;
  onAskClaude?: () => void;
  /** Small transaction / document count shown as a chip above the icon */
  badge?: number;
}

export function KpiCard({ label, value, delta, hint, icon: Icon, accent, onAskClaude, badge }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "group/kpi relative flex flex-col gap-3 overflow-hidden rounded-md border border-border bg-card p-5 shadow-sm",
        accent && "border-l-4 border-l-primary",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="flex items-center gap-1.5">
          {onAskClaude && (
            <button
              onClick={onAskClaude}
              title="Perguntar ao Analista IA"
              className="flex h-6 w-6 items-center justify-center rounded opacity-0 transition-opacity group-hover/kpi:opacity-100 hover:bg-primary/15 text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex flex-col items-center gap-1">
            {badge !== undefined && badge > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold leading-none text-muted-foreground">
                {badge.toLocaleString("pt-BR")} títulos
              </span>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/15 text-primary">
              <Icon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
      <div className="font-mono text-3xl font-extrabold tracking-tight">{value}</div>
      <div className="flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-0.5 font-bold",
              positive
                ? "bg-success/15 text-success"
                : "bg-destructive/15 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-muted-foreground">{hint}</span>}
      </div>
    </div>
  );
}