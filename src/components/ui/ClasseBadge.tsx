import type { ClasseABC } from "@/data/estoque-mock";
import { cn } from "@/lib/utils";

const styles: Record<ClasseABC, string> = {
  A: "bg-[#FFF6D0] text-[#C99E00] border border-[#F5C400] font-bold",
  B: "bg-gray-100 text-gray-600 font-medium",
  C: "bg-gray-50 text-gray-400 font-normal",
};

export function ClasseBadge({ classe, className }: { classe: ClasseABC; className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px]", styles[classe], className)}>
      {classe}
    </span>
  );
}