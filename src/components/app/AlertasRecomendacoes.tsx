import { AlertOctagon, AlertTriangle, Info, type LucideIcon } from "lucide-react";

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

export function AlertasRecomendacoes({ title = "Alertas e Recomendações", items, empty = "Nenhum alerta no momento. Operação saudável." }: { title?: string; items: AlertItem[]; empty?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-bold">{title}</h4>
        <span className="text-[11px] text-muted-foreground">{items.length} item(s)</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => {
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
      )}
    </div>
  );
}