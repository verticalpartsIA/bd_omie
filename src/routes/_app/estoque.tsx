import { createFileRoute } from "@tanstack/react-router";
import { Warehouse, RefreshCw, CalendarClock, PackageX, DollarSign, Boxes, AlertTriangle, Plus } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { KpiCard } from "@/components/app/KpiCard";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { AbcBarchart } from "@/components/charts/AbcBarchart";
import { GiroCategoryChart } from "@/components/charts/GiroCategoryChart";
import { AlertaSeverityBadge } from "@/components/ui/AlertaSeverityBadge";
import { Button } from "@/components/ui/button";
import { abcTop15, alertasEstoque, giroPorCategoria, kpisEstoque, produtos, formatBRL } from "@/data/estoque-mock";
import { toast } from "sonner";

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
  const ruptura = produtos.filter((p) => p.estoqueAtual === 0 || p.diasCobertura < 7);
  const excesso = produtos.filter((p) => p.diasCobertura > 90);

  return (
    <>
      <Topbar crumb="PRODUTOS · ESTOQUE" title="Estoque" icon={<Warehouse className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Painel de Inventário</h2>
            <p className="mt-1 text-sm text-muted-foreground">Indicadores, curva ABC e alertas em tempo real.</p>
          </div>
          <div className="flex gap-2">
            <button className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-neutral-400">Período: 30d</button>
            <button className="rounded border border-border bg-card px-3 py-2 text-xs font-semibold hover:border-neutral-400">Categoria: Todas</button>
            <button className="rounded bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">Exportar CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Giro de Estoque" value={`${kpisEstoque.giroMedio}x`} delta={kpisEstoque.giroMedioDelta} hint="rotações/mês" icon={RefreshCw} />
          <KpiCard label="Cobertura Média" value={`${kpisEstoque.diasCobertura} dias`} delta={kpisEstoque.diasCoberturaDelta} hint="dias de estoque" icon={CalendarClock} />
          <KpiCard accent label="Ruptura" value={`${kpisEstoque.rupturaPercentual}%`} delta={kpisEstoque.rupturaPercentualDelta} hint="SKUs sem estoque" icon={PackageX} />
          <KpiCard label="Valor do Inventário" value={formatBRL(kpisEstoque.valorInventario)} delta={kpisEstoque.valorInventarioDelta} hint="custo total" icon={DollarSign} />
          <KpiCard label="SKUs Ativos" value={kpisEstoque.skusAtivos.toLocaleString("pt-BR")} delta={kpisEstoque.skusAtivosDelta} hint="produtos únicos" icon={Boxes} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card title="Curva ABC — Top 15 Produtos por Receita" subtitle="Classes A · B · C">
            <AbcBarchart data={abcTop15} />
          </Card>
          <Card title="Giro de Estoque por Categoria" subtitle="Comparado à meta">
            <GiroCategoryChart data={giroPorCategoria} />
          </Card>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <h4 className="text-sm font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-[#E65100]" /> Alertas de Movimentação</h4>
            <p className="text-[11px] text-muted-foreground">Produtos com variação &gt; 2σ vs média histórica</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Severity</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-right">Variação</th>
                  <th className="px-4 py-2 text-right">Estoque Atual</th>
                  <th className="px-4 py-2 text-left">Ação Sugerida</th>
                </tr>
              </thead>
              <tbody>
                {alertasEstoque.map((a) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-2"><AlertaSeverityBadge severity={a.severity} /></td>
                    <td className="px-4 py-2 font-mono text-xs">{a.sku}</td>
                    <td className="px-4 py-2">{a.nomeProduto}</td>
                    <td className={`px-4 py-2 text-right font-mono font-bold ${a.variacao < 0 ? "text-[#C62828]" : "text-[#E65100]"}`}>
                      {a.variacao > 0 ? "+" : ""}{a.variacao}%
                    </td>
                    <td className="px-4 py-2 text-right font-mono">{a.estoqueAtual} un</td>
                    <td className="px-4 py-2 text-xs">{a.acaoSugerida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RupExcPanel title="Produtos em Ruptura" badge={ruptura.length} badgeCls="bg-[#FBE9E9] text-[#C62828]" rows={ruptura} />
          <RupExcPanel title="Produtos com Excesso" badge={excesso.length} badgeCls="bg-[#FFF3E0] text-[#E65100]" rows={excesso} />
        </div>
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

function RupExcPanel({ title, badge, badgeCls, rows }: { title: string; badge: number; badgeCls: string; rows: typeof produtos }) {
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
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Produto</th>
              <th className="px-3 py-2 text-right">Cob.</th>
              <th className="px-3 py-2 text-left">Fornecedor</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhum produto</td></tr>
            )}
            {rows.slice(0, 6).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-3 py-2 text-xs">{p.nome}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">{p.diasCobertura}d</td>
                <td className="px-3 py-2 text-xs">{p.fornecedor}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => toast.info("Disponível após integração com backend")}>
                    <Plus className="h-3 w-3" /> Repor
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}