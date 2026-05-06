import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon: LucideIcon;
  accent?: boolean;
}

export function KpiCard({ label, value, delta, hint, icon: Icon, accent }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 overflow-hidden rounded-md border border-border bg-card p-5 shadow-sm",
        accent && "border-l-4 border-l-primary",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/15 text-primary">
          <Icon className="h-4 w-4" />
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