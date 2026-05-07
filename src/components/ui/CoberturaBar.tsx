export function CoberturaBar({ dias, max = 60 }: { dias: number; max?: number }) {
  const pct = Math.min(100, Math.round((dias / max) * 100));
  const color = dias < 7 ? "#C62828" : dias < 15 ? "#E65100" : dias >= 45 ? "#2E7D32" : "#F5C400";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}