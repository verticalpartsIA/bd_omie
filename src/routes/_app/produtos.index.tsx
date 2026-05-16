import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ShoppingBag, RefreshCw, AlertCircle } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useEstoqueDashboard } from "@/hooks/useEstoqueDashboard";
import { useNfeDashboard } from "@/hooks/useNfeDashboard";
import { formatBRLCompact } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/produtos/")({
  head: () => ({ meta: [{ title: "Produtos — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <ProdutosList />
    </RoleGuard>
  ),
});

type ProdSortCol =
  | "sku" | "nome" | "categoria" | "estoqueAtual"
  | "diasCobertura" | "receita12m" | "mediaMensal"
  | "custoMedio" | "margemRealPct" | "estoqueOmie"
  | "receitaNfeBrl" | "lucroBrutoBrl" | "margemLiquidaPct";

function ProdutosList() {
  const toggle = useSidebarToggle();
  const { data, isLoading } = useEstoqueDashboard();
  const { custoMap, tabelaExiste, isLoading: nfeLoading, triggerSync } = useNfeDashboard();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [classe, setClasse] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [familia, setFamilia] = useState<string>("all");
  const [sortCol, setSortCol] = useState<ProdSortCol>("receita12m");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [deducaoPct, setDeducaoPct] = useState(17); // % dedução (ICMS+PIS/COFINS+comissão)
  const PER_PAGE = 20;

  const categorias = useMemo(() => {
    const set = new Set(data.produtos.map((p) => p.categoria));
    return Array.from(set).sort();
  }, [data.produtos]);

  const familias = useMemo(() => {
    const set = new Set(data.produtos.map((p) => p.sku.split("-")[0]).filter(Boolean));
    return Array.from(set).sort();
  }, [data.produtos]);

  const handleSort = (col: ProdSortCol) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("desc"); }
    setPage(1);
  };

  const SortTh = ({
    col, label, align = "left", title,
  }: { col: ProdSortCol; label: string; align?: "left" | "right"; title?: string }) => (
    <th
      onClick={() => handleSort(col)}
      title={title}
      className={`px-4 py-2 cursor-pointer select-none hover:bg-muted/80 text-${align} text-[11px] font-bold uppercase tracking-wider whitespace-nowrap`}
    >
      {label}
      <span className="ml-1 text-[9px] opacity-50">
        {sortCol === col ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );

  // Enrich produtos with NF-e cost data
  const produtosEnriquecidos = useMemo(() => data.produtos.map((p) => {
    const nfe = custoMap.get(p.sku);
    return { ...p, nfe };
  }), [data.produtos, custoMap]);

  const filtered = useMemo(() => {
    let rows = produtosEnriquecidos.filter((p) => {
      if (q && !(`${p.sku} ${p.nome}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (familia !== "all" && !p.sku.startsWith(familia)) return false;
      if (cat !== "all" && p.categoria !== cat) return false;
      if (classe !== "all" && p.classeABC !== classe) return false;
      if (status !== "all" && p.status !== status) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const numCols: ProdSortCol[] = ["estoqueAtual", "diasCobertura", "receita12m", "mediaMensal", "custoMedio", "margemRealPct", "estoqueOmie", "receitaNfeBrl", "lucroBrutoBrl", "margemLiquidaPct"];
      if (numCols.includes(sortCol)) {
        const av = sortCol === "custoMedio" ? (a.nfe?.custoMedio ?? -1)
          : sortCol === "margemRealPct" ? (a.nfe?.margemRealPct ?? -999)
          : sortCol === "estoqueOmie" ? (a.nfe?.estoqueOmie ?? -1)
          : sortCol === "receitaNfeBrl" ? (a.nfe?.receitaNfeBrl ?? -1)
          : sortCol === "lucroBrutoBrl" ? (a.nfe?.lucroBrutoBrl ?? -1)
          : sortCol === "margemLiquidaPct" ? (a.nfe?.margemRealPct != null ? a.nfe.margemRealPct * (1 - deducaoPct / 100) : -999)
          : (a[sortCol as keyof typeof a] as number);
        const bv = sortCol === "custoMedio" ? (b.nfe?.custoMedio ?? -1)
          : sortCol === "margemRealPct" ? (b.nfe?.margemRealPct ?? -999)
          : sortCol === "estoqueOmie" ? (b.nfe?.estoqueOmie ?? -1)
          : sortCol === "receitaNfeBrl" ? (b.nfe?.receitaNfeBrl ?? -1)
          : sortCol === "lucroBrutoBrl" ? (b.nfe?.lucroBrutoBrl ?? -1)
          : sortCol === "margemLiquidaPct" ? (b.nfe?.margemRealPct != null ? b.nfe.margemRealPct * (1 - deducaoPct / 100) : -999)
          : (b[sortCol as keyof typeof b] as number);
        return (av - bv) * dir;
      }
      return String(a[sortCol as keyof typeof a]).localeCompare(String(b[sortCol as keyof typeof b])) * dir;
    });
    return rows;
  }, [produtosEnriquecidos, q, familia, cat, classe, status, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const msg = await triggerSync();
      toast.success(msg);
    } catch (e) {
      toast.error("Erro na sincronização: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSyncing(false);
    }
  };

  const hasCustos = custoMap.size > 0;

  return (
    <>
      <Topbar crumb="PRODUTOS" title="Produtos" icon={<ShoppingBag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} extra={<USDCalendarWidget />} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Catálogo de Produtos</h2>
            {isLoading && <p className="mt-1 text-xs text-muted-foreground animate-pulse">Carregando dados do Supabase…</p>}
          </div>

          {/* Botão sync NF-e */}
          <div className="flex items-center gap-2">
            {!tabelaExiste && !nfeLoading && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                Aplique o SQL <code className="font-mono font-bold">supabase_nfe_custos.sql</code> no Supabase para ativar custo/margem
              </div>
            )}
            <button
              onClick={handleSync}
              disabled={syncing || !tabelaExiste}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-[11px] font-semibold hover:bg-muted disabled:opacity-50"
              title="Sincronizar NF-e do Omie (entradas + saídas)"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando…" : "Sync NF-e"}
            </button>
            {hasCustos && (
              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold">Dedução:</span>
                <input
                  type="number" min={0} max={60} step={1}
                  value={deducaoPct}
                  onChange={(e) => setDeducaoPct(Number(e.target.value))}
                  className="w-14 rounded border border-border px-2 py-1 text-center font-mono text-[11px]"
                />
                <span>%</span>
              </label>
            )}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Código ou nome..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
          <Select value={familia} onValueChange={(v) => { setFamilia(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Família (VPEL, VPER…)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as famílias</SelectItem>
              {familias.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={(v) => { setCat(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={classe} onValueChange={(v) => { setClasse(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Classe ABC" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas classes</SelectItem>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider">#</th>
                  <SortTh col="sku" label="Código" />
                  <SortTh col="nome" label="Produto" />
                  <SortTh col="categoria" label="Categoria" />
                  <SortTh col="estoqueAtual" label="Est. WMS" align="right" title="Estoque físico no WMS" />
                  {hasCustos && (
                    <SortTh col="estoqueOmie" label="Est. Omie" align="right" title="Estoque conforme catálogo Omie ERP" />
                  )}
                  <SortTh col="mediaMensal" label="Giro/mês" align="right" />
                  <SortTh col="diasCobertura" label="Cobertura" align="right" />
                  <SortTh col="receita12m" label="Receita 12m" align="right" />
                  {hasCustos && (
                    <>
                      <SortTh col="custoMedio" label="Custo Médio" align="right" title="Preço médio ponderado das últimas 10 NF-e de entrada" />
                      <SortTh col="receitaNfeBrl" label="Receita NF-e" align="right" title="Receita total por NF-e de saída emitidas" />
                      <SortTh col="lucroBrutoBrl" label="Lucro Bruto" align="right" title="Receita NF-e - CMV (custo médio × qtd vendida)" />
                      <SortTh col="margemRealPct" label="Mg. Bruta" align="right" title="Margem bruta = (preço venda - custo) / preço venda" />
                      <SortTh col="margemLiquidaPct" label="Mg. Líquida" align="right" title={`Margem bruta após dedução de ${deducaoPct}% (impostos+comissões)`} />
                    </>
                  )}
                  <th className="px-4 py-2 text-center text-[11px] font-bold uppercase tracking-wider">Classe</th>
                  <th className="px-4 py-2 text-left text-[11px] font-bold uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr><td colSpan={hasCustos ? 17 : 10} className="px-4 py-12 text-center text-sm text-muted-foreground animate-pulse">Carregando produtos…</td></tr>
                )}
                {!isLoading && pageItems.length === 0 && (
                  <tr><td colSpan={hasCustos ? 17 : 10} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum produto encontrado</td></tr>
                )}
                {pageItems.map((p, idx) => {
                  const isCrit = p.status === "critico";
                  const cobCls = p.diasCobertura < 7 ? "text-[#C62828] font-bold" : p.diasCobertura < 15 ? "text-[#E65100] font-semibold" : "";
                  const cobLabel = p.diasCobertura >= 999 ? "s/ demanda" : `${p.diasCobertura}d`;
                  const nfe = p.nfe;
                  const margem = nfe?.margemRealPct;
                  const margemLiquida = margem != null ? margem * (1 - deducaoPct / 100) : null;
                  const margemLiquidaCls = margemLiquida != null
                    ? margemLiquida < 0 ? "text-[#C62828] font-bold"
                    : margemLiquida < 10 ? "text-[#E65100] font-semibold"
                    : "text-[#2E7D32] font-semibold"
                    : "";
                  const margemCls = margem != null
                    ? margem < 0 ? "text-[#C62828] font-bold"
                    : margem < 20 ? "text-[#E65100] font-semibold"
                    : "text-[#2E7D32] font-semibold"
                    : "";
                  // Divergência estoque Omie vs estoque WMS
                  const diverg = nfe && nfe.estoqueOmie > 0 && Math.abs(nfe.estoqueOmie - p.estoqueAtual) > 1;

                  return (
                    <tr
                      key={p.id}
                      className={`border-t border-border ${isCrit ? "bg-[#FBE9E9]" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-4 py-2 text-xs text-muted-foreground">{(page - 1) * PER_PAGE + idx + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-2 text-xs max-w-[220px] truncate" title={p.nome}>{p.nome}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">{p.categoria}</td>
                      {/* Estoque WMS */}
                      <td className={`px-4 py-2 text-right font-mono ${diverg ? "text-amber-600 font-bold" : ""}`}
                        title={diverg ? `Divergência: WMS=${p.estoqueAtual} vs Omie=${nfe!.estoqueOmie}` : undefined}>
                        {p.estoqueAtual.toLocaleString("pt-BR")}
                        {diverg && <span className="ml-1 text-[10px]">⚠</span>}
                      </td>
                      {/* Estoque Omie (real) */}
                      {hasCustos && (
                        <td className={`px-4 py-2 text-right font-mono text-xs ${diverg ? "text-amber-600" : "text-muted-foreground"}`}>
                          {nfe && nfe.estoqueOmie > 0 ? nfe.estoqueOmie.toLocaleString("pt-BR") : "—"}
                        </td>
                      )}
                      <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">{p.mediaMensal > 0 ? p.mediaMensal.toFixed(1) : "—"}</td>
                      <td className={`px-4 py-2 text-right font-mono text-xs ${cobCls}`}>{cobLabel}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs">{formatBRLCompact(p.receita12m)}</td>
                      {/* Custo Médio */}
                      {hasCustos && (
                        <td
                          className="px-4 py-2 text-right font-mono text-xs"
                          title={nfe ? `Min: ${formatBRLCompact(nfe.custoMinimo)} · Max: ${formatBRLCompact(nfe.custoMaximo)} · ${nfe.qtdCompras} compras · Último: ${nfe.ultimoFornecedor ?? "—"}` : undefined}
                        >
                          {nfe?.custoMedio ? formatBRLCompact(nfe.custoMedio) : "—"}
                        </td>
                      )}
                      {/* Custo Médio - tooltip expanded */}
                      {/* Receita NF-e */}
                      {hasCustos && (
                        <td className="px-4 py-2 text-right font-mono text-xs text-muted-foreground">
                          {nfe?.receitaNfeBrl ? formatBRLCompact(nfe.receitaNfeBrl) : "—"}
                        </td>
                      )}
                      {/* Lucro Bruto */}
                      {hasCustos && (
                        <td className={`px-4 py-2 text-right font-mono text-xs ${nfe?.lucroBrutoBrl != null ? (nfe.lucroBrutoBrl >= 0 ? "text-[#2E7D32]" : "text-[#C62828]") : ""}`}>
                          {nfe?.lucroBrutoBrl != null ? formatBRLCompact(nfe.lucroBrutoBrl) : "—"}
                        </td>
                      )}
                      {/* Margem Bruta */}
                      {hasCustos && (
                        <td className={`px-4 py-2 text-right font-mono text-xs ${margemCls}`}>
                          {margem != null ? `${margem.toFixed(1)}%` : "—"}
                        </td>
                      )}
                      {/* Margem Líquida */}
                      {hasCustos && (
                        <td className={`px-4 py-2 text-right font-mono text-xs ${margemLiquidaCls}`}>
                          {margemLiquida != null ? `${margemLiquida.toFixed(1)}%` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-2 text-center"><ClasseBadge classe={p.classeABC} /></td>
                      <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">
              Exibindo {pageItems.length} de {filtered.length} produtos · {data.kpis.totalSkus} total
              {hasCustos && ` · ${custoMap.size} com custo NF-e`}
            </span>
            <div className="flex items-center gap-1">
              <button className="rounded border border-border px-3 py-1 disabled:opacity-50" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span className="px-2 font-mono">{page} / {totalPages}</span>
              <button className="rounded border border-border px-3 py-1 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
