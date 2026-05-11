import { useState } from "react";
import { Download } from "lucide-react";
import { exportCSV, exportPDF, type ExportRow } from "@/lib/export-utils";

interface Props {
  filename: string;
  rows?: ExportRow[];
  className?: string;
  label?: string;
}

export function ExportMenu({ filename, rows = [], className = "", label = "Exportar" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-3 py-2 text-xs font-bold text-foreground/80 hover:border-neutral-400"
        type="button"
      >
        <Download className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-border bg-card shadow-lg">
            <button
              onClick={() => { exportCSV(`${filename}.csv`, rows); setOpen(false); }}
              disabled={!rows.length}
              className="block w-full px-3 py-2 text-left text-xs font-semibold hover:bg-muted disabled:opacity-40"
            >CSV / Excel</button>
            <button
              onClick={() => { exportPDF(); setOpen(false); }}
              className="block w-full border-t border-border px-3 py-2 text-left text-xs font-semibold hover:bg-muted"
            >PDF (imprimir)</button>
          </div>
        </>
      )}
    </div>
  );
}