import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Warehouse, RefreshCw, CalendarClock, PackageX, DollarSign, Boxes, AlertTriangle, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { KpiCard } from "@/components/app/KpiCard";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { AbcBarchart } from "@/components/charts/AbcBarchart";
import { GiroCategoryChart } from "@/components/charts/GiroCategoryChart";
import { ExportMenu } from "@/components/app/ExportMenu";
import { useEstoqueDashboard } from "@/hooks/useEstoqueDashboard";
import { useNfeDashboard } from "@/hooks/useNfeDashboard";
import type { NfeItemProduto } from "@/hooks/useNfeDashboard";
import { formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/estoque")({
  head: () => ({ meta: [{ title: "Estoque — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <EstoquePage />
    </RoleGuard>
  ),
});

function EstoquePage() {
  const toggle = useSidebarToggle();
  const { data, isLoading } = useEstoqueDashboard();
  const { custoMap } = useNfeDashboard();

  const custoTotalEstoque = useMemo(() => {
    let t = 0;
    custoMap.forEach((n) => { if (n.estoqueOmie > 0 && n.custoMedio > 0) t += n.estoqueOmie * n.custoMedio; });
    return t;
  }, [custoMap]);
  const lucroBrutoTotal = useMemo(() => {
    let t = 0; custoMap.forEach((n) => { t += n.lucroBrutoBrl ?? 0; }); return t;
  }, [custoMap]);
  const margemMediaReal = useMemo(() => {
    let r = 0, l = 0;
    custoMap.forEach((n) => { r += n.receitaNfeBrl; l += n.lucroBrutoBrl ?? 0; });
    return r > 0 ? (l / r) * 100 : null;
  }, [custoMap]);

  const ruptura = data.produtos.filter((p) => p.estoqueAtual === 0 || (p.diasCobertura < 7 && p.mediaMensal > 0));
  const excesso = data.produtos.filter((p) => p.diasCobertura > 90 && p.diasCobertura < 999);

  return (
    <>
      <Topbar crumb="PRODUTOS · ESTOQUE" title="Estoque" icon={<Warehouse className="h-3.5 w-3.5" />} onToggleSidebar={toggle} extra={<USDCalendarWidget />} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Painel de Inventário</h2>
            <p className="mt-1 text-sm text-muted-foreground">Indicadores, curva ABC e alertas em tempo real.</p>
          </div>
          <div className="flex gap-2">
            <ExportMenu
              filename="estoque"
              rows={data.produtos.slice(0, 500).map((p) => ({
                codigo: p.sku,
                nome: p.nome,
                categoria: p.categoria,
                estoque: p.estoqueAtual,
                cobertura_dias: p.diasCobertura < 999 ? p.diasCobertura : "",
                media_mensal: p.mediaMensal,
                classe_abc: p.classeABC,
                status: p.status,
                receita_12m: p.receita12m,
              }))}
            />
          </div>
        </div>

        {isLoading && <p className="mb-4 text-sm text-muted-foreground animate-pulse">Carregando dados do Supabase…</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
          <KpiCard label="Giro Médio" value={`${data.kpis.giroMedio}x`} hint="rotações/ano" icon={RefreshCw} />
          <KpiCard label="Cobertura Média" value={`${data.kpis.diasCobertura}d`} hint="dias de estoque" icon={CalendarClock} />
          <KpiCard accent label="Ruptura" value={`${data.kpis.rupturaPercentual}%`} hint="SKUs sem estoque" icon={PackageX} />
          <KpiCard label="Receita Total 12m" value={formatBRLCompact(data.kpis.valorInventario)} hint="referência de giro" icon={DollarSign} />
          <KpiCard label="SKUs Ativos" value={data.kpis.skusAtivos.toLocaleString("pt-BR")} hint={`de ${data.kpis.totalSkus} total`} icon={Boxes} />
          <KpiCard label="Custo Estoque" value={formatBRLCompact(custoTotalEstoque)} hint="capital imobilizado NF-e" icon={DollarSign} />
          <KpiCard label="Lucro Bruto NF-e" value={formatBRLCompact(lucroBrutoTotal)} hint={margemMediaReal != null ? `${margemMediaReal.toFixed(1)}% margem` : "sem dados"} icon={TrendingUp} />
        </div>

        {/* Aging / Coverage distribution */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">SKUs em Ruptura</div>
            <div className="mt-2 font-mono text-2xl font-extrabold text-destructive">{ruptura.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Estoque zero ou cobertura &lt; 7 dias</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">SKUs Críticos</div>
            <div className="mt-2 font-mono text-2xl font-extrabold text-primary">{data.kpis.skusCriticos}</div>
            <div className="mt-1 text-xs text-muted-foreground">Risco de ruptura nos próximos 30 dias</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Distribuição de Cobertura</div>
            <div className="mt-3 space-y-1.5">
              {data.aging.map((a) => (
                <div key={a.faixa} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.cor }} />
                    {a.faixa}
                  </span>
                  <span className="font-mono font-semibold">{a.skus} SKUs</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ABC + Giro charts */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Curva ABC — Top 15 Produtos por Receita" subtitle="Classes A · B · C">
            {data.abcTop15.length > 0
              ? <AbcBarchart data={data.abcTop15} />
              : <Empty />}
          </Card>
          <Card title="Giro de Estoque por Categoria" subtitle="Comparado à meta de 4x">
            {data.giroPorCategoria.length > 0
              ? <GiroCategoryChart data={data.giroPorCategoria} />
              : <Empty />}
          </Card>
        </div>

        {/* Ruptura / Excesso panels */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RupExcPanel title="Produtos em Ruptura" badge={ruptura.length} badgeCls="bg-[#FBE9E9] text-[#C62828]" rows={ruptura} custoMap={custoMap} />
          <RupExcPanel title="Produtos com Excesso" badge={excesso.length} badgeCls="bg-[#FFF3E0] text-[#E65100]" rows={excesso} custoMap={custoMap} />
        </div>

        {/* Diagnostics table */}
        {data.produtos.filter((p) => p.diagnostico && p.diagnostico !== "OK").length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#E65100]" /> Diagnósticos Críticos
              </h4>
              <p className="text-[11px] text-muted-foreground">Alertas da view vw_estoque_inteligente</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">Código</th>
                    <th className="px-4 py-2 text-left">Produto</th>
                    <th className="px-4 py-2 text-right">Estoque</th>
                    <th className="px-4 py-2 text-right">Cobertura</th>
                    <th className="px-4 py-2 text-left">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {data.produtos
                    .filter((p) => p.diagnostico && p.diagnostico !== "OK" && p.diagnostico !== "")
                    .slice(0, 20)
                    .map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                        <td className="px-4 py-2 text-xs">{p.nome}</td>
                        <td className="px-4 py-2 text-right font-mono">{p.estoqueAtual}</td>
                        <td className={`px-4 py-2 text-right font-mono ${p.diasCobertura < 7 ? "text-[#C62828] font-bold" : ""}`}>
                          {p.diasCobertura < 999 ? `${p.diasCobertura}d` : "—"}
                        </td>
                        <td className="px-4 py-2 text-xs text-[#E65100]">{p.diagnostico}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h4 className="text-sm font-bold">{title}</h4>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Empty() {
  return <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">Sem dados suficientes</div>;
}

function MargemCell({ pct }: { pct: number | null | undefined }) {
  if (pct == null) return <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">—</td>;
  const cls = pct < 0 ? "text-[#C62828] font-bold" : pct < 20 ? "text-[#E65100] font-bold" : "text-[#2E7D32] font-bold";
  return <td className={`px-3 py-2 text-right font-mono text-xs ${cls}`}>{pct.toFixed(1)}%</td>;
}

function RupExcPanel({ title, badge, badgeCls, rows, custoMap }: {
  title: string;
  badge: number;
  badgeCls: string;
  rows: ReturnType<typeof useEstoqueDashboard>["data"]["produtos"];
  custoMap: Map<string, NfeItemProduto>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h4 className="text-sm font-bold">{title}</h4>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeCls}`}>{badge}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Produto</th>
              <th className="px-3 py-2 text-right">Est. WMS</th>
              <th className="px-3 py-2 text-right">Est. Omie</th>
              <th className="px-3 py-2 text-right">Cob.</th>
              <th className="px-3 py-2 text-right">Custo</th>
              <th className="px-3 py-2 text-right">Margem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum produto</td></tr>
            )}
            {rows.slice(0, 8).map((p) => {
              const nfe = custoMap.get(p.sku);
              const diverg = nfe && nfe.estoqueOmie > 0 && Math.abs(nfe.estoqueOmie - p.estoqueAtual) > 1;
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                  <td className="px-3 py-2 text-xs">{p.nome}</td>
                  <td className={`px-3 py-2 text-right font-mono text-xs ${diverg ? "text-amber-600 font-bold" : ""}`}>
                    {p.estoqueAtual}{diverg && <span className="ml-1 text-[9px]">⚠</span>}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-xs ${diverg ? "text-amber-600" : "text-muted-foreground"}`}>
                    {nfe && nfe.estoqueOmie > 0 ? nfe.estoqueOmie.toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono text-xs ${p.diasCobertura < 7 ? "text-[#C62828] font-bold" : "text-[#E65100]"}`}>
                    {p.diasCobertura < 999 ? `${p.diasCobertura}d` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">
                    {nfe?.custoMedio ? formatBRLCompact(nfe.custoMedio) : "—"}
                  </td>
                  <MargemCell pct={nfe?.margemRealPct} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
