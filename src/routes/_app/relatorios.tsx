import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  FileBarChart, BarChart3, DollarSign, Package, Layers, Wallet, Sliders,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExportMenu } from "@/components/app/ExportMenu";
import { AbcBarchart } from "@/components/charts/AbcBarchart";
import { useVendedoresDashboard } from "@/hooks/useVendedoresDashboard";
import { useClientesDashboard, RFM_LABELS, RFM_COLORS } from "@/hooks/useClientesDashboard";
import { useEstoqueDashboard } from "@/hooks/useEstoqueDashboard";
import { useStrategicDashboard } from "@/hooks/useStrategicDashboard";
import { formatBRL, formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <RelatoriosPage />
    </RoleGuard>
  ),
});

const LINE_COLORS = ["#F5C400", "#0288D1", "#2E7D32", "#E65100", "#7B1FA2"];

function RelatoriosPage() {
  const toggle = useSidebarToggle();
  const [periodo, setPeriodo] = useState("30d");

  // ── Hooks ────────────────────────────────────────────────────────────────────
  const vendData = useVendedoresDashboard();
  const cliData = useClientesDashboard();
  const estoqueData = useEstoqueDashboard();
  const stratData = useStrategicDashboard();

  const isLoading =
    vendData.isLoading || cliData.isLoading || estoqueData.isLoading || stratData.isLoading;

  // ── Rentabilidade sort ───────────────────────────────────────────────────────
  const [sortColCli, setSortColCli] = useState("receitaTotal");
  const [sortDirCli, setSortDirCli] = useState<"asc" | "desc">("desc");

  // ── Estoque state ────────────────────────────────────────────────────────────
  const [sortColEst, setSortColEst] = useState("receita12m");
  const [sortDirEst, setSortDirEst] = useState<"asc" | "desc">("desc");
  const [familiaFilter, setFamiliaFilter] = useState("all");
  const [searchEst, setSearchEst] = useState("");
  const [pageEst, setPageEst] = useState(1);
  const PER_EST = 20;

  // ── Customizado state ────────────────────────────────────────────────────────
  const [dimensao, setDimensao] = useState("vendedor");
  const [metrica, setMetrica] = useState("receita");

  // ── Sort helpers ─────────────────────────────────────────────────────────────
  const SortThCli = ({ col, label, align = "left" }: { col: string; label: string; align?: string }) => (
    <th
      onClick={() => {
        if (sortColCli === col) setSortDirCli((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortColCli(col); setSortDirCli("desc"); }
      }}
      className={`px-3 py-2 cursor-pointer select-none hover:bg-muted/80 text-${align} text-[10px] font-bold uppercase tracking-wider`}
    >
      {label}
      <span className="ml-1 opacity-50">{sortColCli === col ? (sortDirCli === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );

  const SortThEst = ({ col, label, align = "left" }: { col: string; label: string; align?: string }) => (
    <th
      onClick={() => {
        if (sortColEst === col) setSortDirEst((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortColEst(col); setSortDirEst("desc"); }
      }}
      className={`px-3 py-2 cursor-pointer select-none hover:bg-muted/80 text-${align} text-[10px] font-bold uppercase tracking-wider`}
    >
      {label}
      <span className="ml-1 opacity-50">{sortColEst === col ? (sortDirEst === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );

  // ── Rentabilidade: sorted clientes ───────────────────────────────────────────
  const sortedClientes = useMemo(() => {
    return [...cliData.data.clientes.slice(0, 50)].sort((a, b) => {
      const dir = sortDirCli === "asc" ? 1 : -1;
      if (
        sortColCli === "receitaTotal" ||
        sortColCli === "totalPedidos" ||
        sortColCli === "ticketMedio" ||
        sortColCli === "diasSemComprar"
      ) {
        return ((a as any)[sortColCli] - (b as any)[sortColCli]) * dir;
      }
      return String((a as any)[sortColCli]).localeCompare(String((b as any)[sortColCli])) * dir;
    });
  }, [cliData.data.clientes, sortColCli, sortDirCli]);

  // ── Estoque: familias, filtered, paginated ───────────────────────────────────
  const familias = useMemo(() => {
    const set = new Set(
      estoqueData.data.produtos.map((p) => p.sku.split("-")[0]).filter(Boolean),
    );
    return Array.from(set).sort();
  }, [estoqueData.data.produtos]);

  const filteredEst = useMemo(() => {
    let rows = estoqueData.data.produtos.filter((p) => {
      if (familiaFilter !== "all" && !p.sku.startsWith(familiaFilter)) return false;
      if (searchEst && !`${p.sku} ${p.nome}`.toLowerCase().includes(searchEst.toLowerCase()))
        return false;
      return true;
    });
    return [...rows].sort((a, b) => {
      const dir = sortDirEst === "asc" ? 1 : -1;
      const numCols = ["estoqueAtual", "mediaMensal", "diasCobertura", "receita12m", "giro"];
      if (numCols.includes(sortColEst))
        return ((a as any)[sortColEst] - (b as any)[sortColEst]) * dir;
      return String((a as any)[sortColEst]).localeCompare(String((b as any)[sortColEst])) * dir;
    });
  }, [estoqueData.data.produtos, familiaFilter, searchEst, sortColEst, sortDirEst]);

  const totalPagesEst = Math.max(1, Math.ceil(filteredEst.length / PER_EST));
  const pageItemsEst = filteredEst.slice((pageEst - 1) * PER_EST, pageEst * PER_EST);

  // ── ABC summary ──────────────────────────────────────────────────────────────
  const abcSummary = useMemo(() => {
    const map: Record<string, { count: number; receita: number }> = {
      A: { count: 0, receita: 0 },
      B: { count: 0, receita: 0 },
      C: { count: 0, receita: 0 },
    };
    for (const p of estoqueData.data.produtos) {
      if (map[p.classeABC]) {
        map[p.classeABC].count++;
        map[p.classeABC].receita += p.receita12m;
      }
    }
    return Object.entries(map).map(([k, v]) => ({ classe: k, ...v }));
  }, [estoqueData.data.produtos]);

  // ── Customizado rows ─────────────────────────────────────────────────────────
  const customRows = useMemo(() => {
    if (dimensao === "vendedor")
      return vendData.data.vendedores.map((v) => ({
        chave: v.nome,
        receita: v.receita12m,
        quantidade: v.pedidos12m,
        ticket: v.ticketMedio,
      }));
    if (dimensao === "cliente")
      return cliData.data.clientes.slice(0, 30).map((c) => ({
        chave: c.nome,
        receita: c.receitaTotal,
        quantidade: c.totalPedidos,
        ticket: c.ticketMedio,
      }));
    return estoqueData.data.categorias.map((c) => ({
      chave: c.nome,
      receita: c.receita12m,
      quantidade: c.skus,
      ticket: c.skus > 0 ? Math.round(c.receita12m / c.skus) : 0,
    }));
  }, [dimensao, vendData.data, cliData.data, estoqueData.data]);

  const sorted = [...customRows].sort((a, b) =>
    metrica === "receita"
      ? b.receita - a.receita
      : metrica === "quantidade"
        ? b.quantidade - a.quantidade
        : b.ticket - a.ticket,
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const onSave = () =>
    toast.success(`Relatório "${dimensao} por ${metrica}" salvo na biblioteca`);
  const onSchedule = () =>
    toast.success("Relatório agendado: envio semanal segunda 08:00 por e-mail");

  // ── Forecast helpers ─────────────────────────────────────────────────────────
  const { forecastMes, ebitda12m, ebitda, ebitdaPct, resultadoLiquido, margemLiquida, receita } =
    stratData.kpis;
  const fMeta = forecastMes.meta || 1;
  const fRealizadoPct = Math.min(100, Math.round((forecastMes.realizado / fMeta) * 100));
  const fProjetadoPct = Math.min(100, Math.round((forecastMes.projetado / fMeta) * 100));

  return (
    <>
      <Topbar
        crumb="OPERAÇÃO · RELATÓRIOS"
        title="Relatórios"
        icon={<FileBarChart className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
        extra={<USDCalendarWidget />}
      />
      <main className="flex-1 px-7 pb-16 pt-6">

        {/* Loading banner */}
        {isLoading && (
          <div className="mb-4 rounded border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            Carregando dados…
          </div>
        )}

        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Investigação & Self-service</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Recorte qualquer dimensão, qualquer período. Sem depender de TI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="ytd">Ano corrente</SelectItem>
              </SelectContent>
            </Select>
            <ExportMenu filename="relatorios-geral" />
          </div>
        </div>

        <Tabs defaultValue="vendas">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="vendas"><BarChart3 className="mr-2 h-4 w-4" />Vendas</TabsTrigger>
            <TabsTrigger value="rentabilidade"><DollarSign className="mr-2 h-4 w-4" />Rentabilidade</TabsTrigger>
            <TabsTrigger value="estoque"><Package className="mr-2 h-4 w-4" />Estoque</TabsTrigger>
            <TabsTrigger value="abc"><Layers className="mr-2 h-4 w-4" />ABC</TabsTrigger>
            <TabsTrigger value="financeiro"><Wallet className="mr-2 h-4 w-4" />Financeiro</TabsTrigger>
            <TabsTrigger value="custom"><Sliders className="mr-2 h-4 w-4" />Customizado</TabsTrigger>
          </TabsList>

          {/* ── TAB: VENDAS ────────────────────────────────────────────────────── */}
          <TabsContent value="vendas" className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Receita por Vendedor — 12 meses</h4>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={vendData.data.vendedores.slice(0, 10).map((v) => ({
                      nome: v.nome,
                      receita: v.receita12m,
                      ticket: v.ticketMedio,
                    }))}
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRLCompact(v)} />
                    <Tooltip formatter={(v: unknown) => formatBRLCompact(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receita" name="Receita" fill="#F5C400" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ticket" name="Ticket Médio" fill="#0288D1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Evolução Mensal — Top 5 Vendedores</h4>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart
                    data={vendData.data.evolucaoMensal}
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRLCompact(v)} />
                    <Tooltip formatter={(v: unknown) => formatBRLCompact(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {vendData.data.topVendedoresNomes.map((nome, i) => (
                      <Line
                        key={nome}
                        type="monotone"
                        dataKey={nome}
                        stroke={LINE_COLORS[i % LINE_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: RENTABILIDADE ────────────────────────────────────────────── */}
          <TabsContent value="rentabilidade" className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Distribuição RFM de Clientes</h4>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={cliData.data.rfmDist}
                    margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="segmento" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Clientes" radius={[4, 4, 0, 0]}>
                      {cliData.data.rfmDist.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold mb-3">Top 50 Clientes</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <SortThCli col="nome" label="Cliente" />
                      <SortThCli col="receitaTotal" label="Receita" align="right" />
                      <SortThCli col="totalPedidos" label="Pedidos" align="right" />
                      <SortThCli col="ticketMedio" label="Ticket" align="right" />
                      <SortThCli col="diasSemComprar" label="Dias s/ comprar" align="right" />
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">RFM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedClientes.map((c) => (
                      <tr key={c.nome} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-xs">{c.nome}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatBRL(c.receitaTotal)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{c.totalPedidos}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatBRL(c.ticketMedio)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{c.diasSemComprar}d</td>
                        <td className="px-3 py-2">
                          <span
                            style={{
                              background: RFM_COLORS[c.rfmSegmento] + "22",
                              color: RFM_COLORS[c.rfmSegmento],
                            }}
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                          >
                            {RFM_LABELS[c.rfmSegmento]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: ESTOQUE ──────────────────────────────────────────────────── */}
          <TabsContent value="estoque">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              {/* Header with export */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-bold">Inventário em Foto</h4>
                <ExportMenu
                  filename="estoque-relatorio"
                  rows={filteredEst.slice(0, 500).map((p) => ({
                    sku: p.sku,
                    nome: p.nome,
                    categoria: p.categoria,
                    estoqueAtual: p.estoqueAtual,
                    mediaMensal: p.mediaMensal,
                    diasCobertura: p.diasCobertura,
                    receita12m: p.receita12m,
                    classeABC: p.classeABC,
                  }))}
                />
              </div>

              {/* Filter bar */}
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <Input
                  placeholder="Buscar SKU ou produto…"
                  value={searchEst}
                  onChange={(e) => { setSearchEst(e.target.value); setPageEst(1); }}
                  className="w-[220px] h-8 text-xs"
                />
                <Select
                  value={familiaFilter}
                  onValueChange={(v) => { setFamiliaFilter(v); setPageEst(1); }}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs">
                    <SelectValue placeholder="Família: VPEL, VPER…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as famílias</SelectItem>
                    {familias.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  {filteredEst.length} de {estoqueData.data.produtos.length} produtos
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <SortThEst col="sku" label="Código" />
                      <SortThEst col="nome" label="Produto" />
                      <SortThEst col="categoria" label="Categoria" />
                      <SortThEst col="estoqueAtual" label="Estoque" align="right" />
                      <SortThEst col="mediaMensal" label="Giro/mês" align="right" />
                      <SortThEst col="diasCobertura" label="Cobertura" align="right" />
                      <SortThEst col="receita12m" label="Receita 12m" align="right" />
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItemsEst.map((p) => (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                        <td className="px-3 py-2 text-xs max-w-[200px] truncate">{p.nome}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{p.categoria}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{p.estoqueAtual}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{p.mediaMensal}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{p.diasCobertura}d</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatBRLCompact(p.receita12m)}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            p.classeABC === "A"
                              ? "bg-yellow-100 text-yellow-800"
                              : p.classeABC === "B"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-neutral-100 text-neutral-500"
                          }`}>
                            {p.classeABC}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPagesEst > 1 && (
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Página {pageEst} de {totalPagesEst}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageEst <= 1}
                      onClick={() => setPageEst((p) => Math.max(1, p - 1))}
                      className="h-7 text-xs"
                    >
                      ‹ Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pageEst >= totalPagesEst}
                      onClick={() => setPageEst((p) => Math.min(totalPagesEst, p + 1))}
                      className="h-7 text-xs"
                    >
                      Próxima ›
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB: ABC ──────────────────────────────────────────────────────── */}
          <TabsContent value="abc" className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold mb-3">Curva ABC — Top 15 SKUs</h4>
              <AbcBarchart data={estoqueData.data.abcTop15} />
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold mb-3">Resumo ABC</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider">Classe</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">SKUs</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wider">Receita 12m</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abcSummary.map((row) => (
                      <tr key={row.classe} className="border-t border-border">
                        <td className="px-3 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            row.classe === "A"
                              ? "bg-yellow-100 text-yellow-800"
                              : row.classe === "B"
                                ? "bg-gray-100 text-gray-600"
                                : "bg-neutral-100 text-neutral-500"
                          }`}>
                            {row.classe}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{row.count}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatBRL(row.receita)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: FINANCEIRO ───────────────────────────────────────────────── */}
          <TabsContent value="financeiro" className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Receita · Margem · EBITDA — 12 meses</h4>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={ebitda12m} margin={{ top: 8, right: 40, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis
                      yAxisId="l"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => formatBRLCompact(v)}
                    />
                    <YAxis
                      yAxisId="r"
                      orientation="right"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: number) => formatBRLCompact(v)}
                    />
                    <Tooltip formatter={(v: unknown) => formatBRLCompact(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="l" dataKey="receita" name="Receita" fill="#0288D1" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="l" dataKey="margem" name="Margem" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="r"
                      type="monotone"
                      dataKey="ebitda"
                      name="EBITDA"
                      stroke="#F5C400"
                      strokeWidth={3}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* DRE simplificado */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h4 className="text-sm font-bold mb-3">DRE Simplificado</h4>
                <div className="space-y-0.5 text-sm">
                  <div className="flex items-center justify-between border-b border-border py-2">
                    <span className="text-muted-foreground">Receita</span>
                    <span className="font-mono font-semibold">{formatBRL(receita)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border py-2">
                    <span className="text-muted-foreground">
                      EBITDA{" "}
                      <span className="text-[10px] font-bold text-success">
                        {ebitdaPct}%
                      </span>
                    </span>
                    <span className="font-mono font-semibold text-success">{formatBRL(ebitda)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">
                      Resultado Líquido{" "}
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {margemLiquida}%
                      </span>
                    </span>
                    <span className="font-mono font-semibold">{formatBRL(resultadoLiquido)}</span>
                  </div>
                </div>
              </div>

              {/* Forecast */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h4 className="text-sm font-bold mb-3">Forecast do Mês</h4>
                <div className="space-y-4 text-sm">
                  {/* Realizado */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Realizado</span>
                      <span className="font-mono font-semibold">{formatBRLCompact(forecastMes.realizado)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#0288D1] transition-all"
                        style={{ width: `${fRealizadoPct}%` }}
                      />
                    </div>
                  </div>
                  {/* Projetado */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Projetado</span>
                      <span className="font-mono font-semibold">{formatBRLCompact(forecastMes.projetado)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#F5C400] transition-all"
                        style={{ width: `${fProjetadoPct}%` }}
                      />
                    </div>
                  </div>
                  {/* Meta */}
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Meta</span>
                      <span className="font-mono font-semibold">{formatBRLCompact(forecastMes.meta)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-full rounded-full bg-[#2E7D32]/30" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB: CUSTOMIZADO ──────────────────────────────────────────────── */}
          <TabsContent value="custom" className="space-y-5">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Construtor de Relatório</h4>
              <p className="text-[11px] text-muted-foreground">Escolha dimensão e métrica para montar a sua visão</p>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Dimensão</label>
                  <Select value={dimensao} onValueChange={setDimensao}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                      <SelectItem value="categoria">Categoria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Ordenar por</label>
                  <Select value={metrica} onValueChange={setMetrica}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="quantidade">Quantidade</SelectItem>
                      <SelectItem value="ticket">Ticket Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={onSave}>Salvar relatório</Button>
                <Button variant="outline" onClick={onSchedule}>Agendar envio</Button>
                <ExportMenu
                  filename={`custom-${dimensao}-${metrica}`}
                  rows={sorted.map((r) => ({
                    [dimensao]: r.chave,
                    receita: r.receita,
                    quantidade: r.quantidade,
                    ticket: r.ticket,
                  }))}
                />
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">{dimensao}</th>
                      <th className="px-3 py-2 text-right">Receita</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.chave} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-xs">{r.chave}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatBRL(r.receita)}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{r.quantidade}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatBRL(r.ticket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Biblioteca de relatórios prontos */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Relatórios prontos da biblioteca</h4>
              <p className="text-[11px] text-muted-foreground">Modelos pré-configurados respeitando suas permissões</p>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                {[
                  "DRE consolidado mensal",
                  "Top 20 clientes do trimestre",
                  "Inventário com cobertura crítica",
                  "Performance da equipe comercial",
                  "Margem por categoria",
                  "Aging de inadimplência",
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => toast.info(`Abrindo: ${r}`)}
                    className="rounded border border-border bg-background px-3 py-2 text-left text-xs font-semibold hover:border-primary"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
