import type { StatusProduto } from "@/data/estoque-mock";
import { cn } from "@/lib/utils";

const map: Record<StatusProduto, { label: string; cls: string; dot: string }> = {
  ativo: { label: "Ativo", cls: "bg-[#E6F2E7] text-[#2E7D32]", dot: "●" },
  critico: { label: "Crítico", cls: "bg-[#FFF3E0] text-[#E65100]", dot: "⚠" },
  inativo: { label: "Inativo", cls: "bg-gray-100 text-gray-500", dot: "✗" },
};

export function StatusBadge({ status, className }: { status: StatusProduto; className?: string }) {
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", s.cls, className)}>
      <span>{s.dot}</span> {s.label}
    </span>
  );
}