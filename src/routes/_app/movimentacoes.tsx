import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MovimentacoesChart } from "@/components/charts/MovimentacoesChart";
import { movimentacoes, movimentacoesPorDia } from "@/data/estoque-mock";

export const Route = createFileRoute("/_app/movimentacoes")({
  head: () => ({ meta: [{ title: "Movimentações — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <MovimentacoesPage />
    </RoleGuard>
  ),
});

function MovimentacoesPage() {
  const toggle = useSidebarToggle();
  const [tipo, setTipo] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const PER = 50;

  const filtered = useMemo(() => movimentacoes.filter((m) => {
    if (tipo !== "all" && m.tipo !== tipo) return false;
    if (q && !(`${m.sku} ${m.nomeProduto}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [tipo, q]);

  const totalEntradas = filtered.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.quantidade, 0);
  const totalSaidas = filtered.filter((m) => m.tipo === "saida").reduce((s, m) => s + Math.abs(m.quantidade), 0);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const items = filtered.slice((page - 1) * PER, page * PER);

  const tipoBadge = (t: string) => {
    if (t === "entrada") return <span className="rounded-full bg-[#E6F2E7] px-2 py-0.5 text-[11px] font-bold text-[#2E7D32]">▲ Entrada</span>;
    if (t === "saida") return <span className="rounded-full bg-[#FBE9E9] px-2 py-0.5 text-[11px] font-bold text-[#C62828]">▼ Saída</span>;
    return <span className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[11px] font-bold text-[#E65100]">↺ Ajuste</span>;
  };

  return (
    <>
      <Topbar crumb="PRODUTOS · MOVIMENTAÇÕES" title="Movimentações" icon={<ArrowLeftRight className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="SKU ou produto..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={tipo} onValueChange={(v) => { setTipo(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Mini label="Total Movimentações" value={filtered.length.toLocaleString("pt-BR")} />
          <Mini label="Entradas" value={`+${totalEntradas.toLocaleString("pt-BR")}`} cls="text-[#2E7D32]" />
          <Mini label="Saídas" value={`-${totalSaidas.toLocaleString("pt-BR")}`} cls="text-[#C62828]" />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h4 className="text-sm font-bold">Entradas vs Saídas (30 dias)</h4>
          </div>
          <div className="p-3"><MovimentacoesChart data={movimentacoesPorDia} /></div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Data/Hora</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-right">Qtd</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                  <th className="px-4 py-2 text-left">Origem</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada</td></tr>}
                {items.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-2 text-xs">{new Date(m.data).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2">{tipoBadge(m.tipo)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{m.sku}</td>
                    <td className="px-4 py-2 text-xs">{m.nomeProduto}</td>
                    <td className={`px-4 py-2 text-right font-mono ${m.quantidade > 0 ? "text-[#2E7D32]" : "text-[#C62828]"}`}>{m.quantidade > 0 ? "+" : ""}{m.quantidade}</td>
                    <td className="px-4 py-2 text-right font-mono">{m.saldoApos}</td>
                    <td className="px-4 py-2 text-xs">{m.origem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button className="rounded border border-border px-3 py-1 disabled:opacity-50" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
              <button className="rounded border border-border px-3 py-1 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Mini({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-extrabold ${cls ?? ""}`}>{value}</div>
    </div>
  );
}