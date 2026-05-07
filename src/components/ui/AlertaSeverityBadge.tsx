import type { SeverityAlerta } from "@/data/estoque-mock";
import { cn } from "@/lib/utils";

const map: Record<SeverityAlerta, { label: string; cls: string }> = {
  alto: { label: "Alto", cls: "bg-[#FBE9E9] text-[#C62828]" },
  medio: { label: "Médio", cls: "bg-[#FFF3E0] text-[#E65100]" },
  baixo: { label: "Baixo", cls: "bg-[#F4F5F7] text-[#808080]" },
};

export function AlertaSeverityBadge({ severity }: { severity: SeverityAlerta }) {
  const s = map[severity];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", s.cls)}>
      ● {s.label}
    </span>
  );
}