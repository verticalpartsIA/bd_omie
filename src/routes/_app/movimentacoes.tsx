import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Search } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { MovimentacoesChart } from "@/components/charts/MovimentacoesChart";
import { ExportMenu } from "@/components/app/ExportMenu";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { useEstoqueDashboard } from "@/hooks/useEstoqueDashboard";
import { useNfeDashboard } from "@/hooks/useNfeDashboard";
import { formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/movimentacoes")({
  head: () => ({ meta: [{ title: "Movimentações — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <MovimentacoesPage />
    </RoleGuard>
  ),
});

type MovSortCol = "data" | "sku" | "nomeProduto" | "quantidade" | "valorTotal";

function MovimentacoesPage() {
  const toggle = useSidebarToggle();
  const { data, isLoading } = useEstoqueDashboard();
  const { custoMap } = useNfeDashboard();
  const [q, setQ] = useState("");
  const [familia, setFamilia] = useState("all");
  const [sortCol, setSortCol] = useState<MovSortCol>("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PER = 50;

  const familias = useMemo(() => {
    const set = new Set(data.movimentacoes.map((m) => m.sku.split("-")[0]).filter(Boolean));
    return Array.from(set).sort();
  }, [data.movimentacoes]);

  const handleSort = (col: MovSortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
    setPage(1);
  };

  const SortTh = ({ col, label, align = "left" }: { col: MovSortCol; label: string; align?: "left" | "right" }) => (
    <th
      onClick={() => handleSort(col)}
      className={`px-4 py-2 cursor-pointer select-none hover:bg-muted/80 text-${align} text-[11px] font-bold uppercase whitespace-nowrap`}
    >
      {label}
      <span className="ml-1 text-[9px] opacity-50">{sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );

  const filtered = useMemo(() => {
    let rows = data.movimentacoes.filter((m) => {
      if (q && !(`${m.sku} ${m.nomeProduto}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (familia !== "all" && !m.sku.startsWith(familia)) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortCol === "quantidade" || sortCol === "valorTotal") return ((a[sortCol] as number) - (b[sortCol] as number)) * dir;
      return String(a[sortCol]).localeCompare(String(b[sortCol])) * dir;
    });
    return rows;
  }, [data.movimentacoes, q, familia, sortCol, sortDir]);

  const totalSaidas = filtered.reduce((s, m) => s + Math.abs(m.quantidade), 0);
  const totalValor = filtered.reduce((s, m) => s + m.valorTotal, 0);

  // Custo e lucro estimado das movimentações filtradas
  const { cmvTotal, lucroTotal } = useMemo(() => {
    let cmv = 0, lucro = 0;
    filtered.forEach((m) => {
      const nfe = custoMap.get(m.sku);
      if (nfe?.custoMedio) {
        const custo = nfe.custoMedio * Math.abs(m.quantidade);
        cmv += custo;
        lucro += m.valorTotal - custo;
      }
    });
    return { cmvTotal: cmv, lucroTotal: lucro };
  }, [filtered, custoMap]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const items = filtered.slice((page - 1) * PER, page * PER);

  return (
    <>
      <Topbar
        crumb="PRODUTOS · MOVIMENTAÇÕES"
        title="Movimentações"
        icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
        extra={<USDCalendarWidget />}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Movimentações de Estoque</h2>
            <p className="mt-1 text-sm text-muted-foreground">Saídas por pedidos de venda do Omie.</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Código ou produto..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={familia} onValueChange={(v) => { setFamilia(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Família (VPEL, VPER…)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as famílias</SelectItem>
              {familias.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="mb-4 text-sm text-muted-foreground animate-pulse">Carregando movimentações…</p>}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Mini label="Total Itens" value={filtered.length.toLocaleString("pt-BR")} />
          <Mini label="Unidades Saídas" value={totalSaidas.toLocaleString("pt-BR")} cls="text-[#C62828]" />
          <Mini label="Receita Saídas" value={formatBRLCompact(totalValor)} />
          <Mini label="CMV Estimado" value={cmvTotal > 0 ? formatBRLCompact(cmvTotal) : "—"} cls="text-[#E65100]" />
          <Mini label="Lucro Estimado" value={lucroTotal > 0 ? formatBRLCompact(lucroTotal) : "—"} cls={lucroTotal > 0 ? "text-[#2E7D32]" : "text-[#C62828]"} />
        </div>

        <div className="mt-4 flex justify-end">
          <ExportMenu
            filename="movimentacoes"
            rows={filtered.slice(0, 500).map((m) => ({
              data: m.data.slice(0, 10),
              tipo: m.tipo,
              codigo: m.sku,
              produto: m.nomeProduto,
              quantidade: m.quantidade,
              valor_total: m.valorTotal,
              origem: m.origem,
            }))}
            label="Exportar auditoria"
          />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h4 className="text-sm font-bold">Pedidos por Dia (últimos 30 dias)</h4>
            <p className="text-[11px] text-muted-foreground">Quantidade de pedidos fechados no Omie por dia</p>
          </div>
          <div className="p-3">
            {data.movimentacoesPorDia.length > 0
              ? <MovimentacoesChart data={data.movimentacoesPorDia.map((d) => ({ dia: d.dia, saidas: d.saidas, entradas: d.entradas }))} />
              : <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Sem dados de movimentação</div>}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <SortTh col="data" label="Data" />
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase">Tipo</th>
                  <SortTh col="sku" label="Código" />
                  <SortTh col="nomeProduto" label="Produto" />
                  <SortTh col="quantidade" label="Qtd" align="right" />
                  <SortTh col="valorTotal" label="Valor" align="right" />
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase">Custo Unit.</th>
                  <th className="px-4 py-2 text-right text-[11px] font-bold uppercase">Margem</th>
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase">Origem</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !isLoading && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada</td></tr>
                )}
                {items.map((m) => {
                  const nfe = custoMap.get(m.sku);
                  const custoUnit = nfe?.custoMedio ?? 0;
                  const lucroMov = custoUnit > 0 ? m.valorTotal - custoUnit * Math.abs(m.quantidade) : null;
                  const margemMov = lucroMov != null && m.valorTotal > 0 ? (lucroMov / m.valorTotal) * 100 : null;
                  return (
                    <tr key={m.id} className="border-t border-border hover:bg-gray-50">
                      <td className="px-4 py-2 text-xs">{m.data.slice(0, 10).split("-").reverse().join("/")}</td>
                      <td className="px-4 py-2">
                        <span className="rounded-full bg-[#FBE9E9] px-2 py-0.5 text-[11px] font-bold text-[#C62828]">▼ Saída</span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{m.sku}</td>
                      <td className="px-4 py-2 text-xs">{m.nomeProduto}</td>
                      <td className="px-4 py-2 text-right font-mono text-[#C62828]">{m.quantidade}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatBRLCompact(m.valorTotal)}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                        {custoUnit > 0 ? formatBRLCompact(custoUnit) : "—"}
                      </td>
                      <td className={`px-4 py-2 text-right font-mono text-xs font-bold ${margemMov == null ? "text-muted-foreground" : margemMov < 0 ? "text-[#C62828]" : margemMov < 25 ? "text-[#E65100]" : "text-[#2E7D32]"}`}>
                        {margemMov != null ? `${margemMov.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{m.origem}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">Página {page} de {totalPages} · {filtered.length} itens</span>
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
