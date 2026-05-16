import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleDot, Cable, LayoutGrid, Zap, Layers, Package, Tag } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { CoberturaBar } from "@/components/ui/CoberturaBar";
import { useEstoqueDashboard } from "@/hooks/useEstoqueDashboard";
import { useNfeDashboard } from "@/hooks/useNfeDashboard";
import { formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/categorias")({
  head: () => ({ meta: [{ title: "Categorias — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <CategoriasPage />
    </RoleGuard>
  ),
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Polias: CircleDot,
  Cabos: Cable,
  Painéis: LayoutGrid,
  Motores: Zap,
  Degraus: Layers,
  Outros: Package,
};

function CategoriasPage() {
  const toggle = useSidebarToggle();
  const navigate = useNavigate();
  const { data, isLoading } = useEstoqueDashboard();
  const { custoMap } = useNfeDashboard();

  // Mapa sku → categoria usando dados do estoque
  const skuToCategoria = useMemo(() =>
    new Map(data.produtos.map((p) => [p.sku, p.categoria])),
  [data.produtos]);

  // Agrupa lucro/receita NF-e por nome de categoria (join correto)
  const lucroPorCategoria = useMemo(() => {
    const map: Record<string, { lucro: number; receita: number }> = {};
    custoMap.forEach((nfe, sku) => {
      const cat = skuToCategoria.get(sku) ?? "Outros";
      if (!map[cat]) map[cat] = { lucro: 0, receita: 0 };
      map[cat].lucro += nfe.lucroBrutoBrl ?? 0;
      map[cat].receita += nfe.receitaNfeBrl;
    });
    return map;
  }, [custoMap, skuToCategoria]);

  return (
    <>
      <Topbar crumb="PRODUTOS · CATEGORIAS" title="Categorias" icon={<Tag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} extra={<USDCalendarWidget />} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <h2 className="text-[26px] font-extrabold tracking-tight">Visão por Categoria</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saúde de inventário agregada por linha de produto.</p>

        {isLoading && (
          <p className="mt-6 text-sm text-muted-foreground animate-pulse">Carregando categorias do Supabase…</p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.categorias.map((c) => {
            const Icon = ICONS[c.nome] ?? Package;
            const saudeIcon = c.saude === "ok" ? "✓" : c.saude === "warn" ? "⚠" : "✗";
            const saudeCls = c.saude === "ok" ? "text-[#2E7D32]" : c.saude === "warn" ? "text-[#E65100]" : "text-[#C62828]";
            return (
              <button
                key={c.nome}
                onClick={() => navigate({ to: "/produtos" })}
                className="rounded-xl border border-border bg-card p-5 text-left shadow-sm hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="flex-1 text-sm font-bold">{c.nome}</h3>
                  <ClasseBadge classe={c.classeABC} />
                  <span className={`text-lg font-bold ${saudeCls}`}>{saudeIcon}</span>
                </div>
                <div className="my-3 h-px bg-border" />
                <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <div>
                    <div className="text-muted-foreground">SKUs</div>
                    <div className="font-mono text-base font-bold">{c.skus}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Receita 12m</div>
                    <div className="font-mono text-base font-bold">{formatBRLCompact(c.receita12m)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Giro</div>
                    <div className="font-mono text-base font-bold">{c.giro > 0 ? `${c.giro.toFixed(1)}x` : "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Lucro Bruto</div>
                    <div className="font-mono text-base font-bold">
                      {(() => {
                        const lc = lucroPorCategoria[c.nome] ?? { lucro: 0, receita: 0 };
                        const mg = lc.receita > 0 ? (lc.lucro / lc.receita * 100).toFixed(0) : null;
                        return (
                          <span>
                            {formatBRLCompact(lc.lucro)}
                            {mg && <span className="ml-1 text-[11px] font-normal text-muted-foreground">({mg}%)</span>}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>Cobertura média: {c.diasCobertura > 0 ? `${c.diasCobertura}d` : "—"}</span>
                  </div>
                  <CoberturaBar dias={c.diasCobertura} max={90} />
                </div>
              </button>
            );
          })}

          {!isLoading && data.categorias.length === 0 && (
            <div className="col-span-3 rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              Nenhuma categoria encontrada. Verifique a view vw_estoque_inteligente.
            </div>
          )}
        </div>

        {data.categorias.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-3">Resumo por Categoria</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-right">SKUs</th>
                    <th className="px-3 py-2 text-right">Receita 12m</th>
                    <th className="px-3 py-2 text-right">Lucro NF-e</th>
                    <th className="px-3 py-2 text-right">Margem</th>
                    <th className="px-3 py-2 text-right">Giro médio</th>
                    <th className="px-3 py-2 text-right">Cobertura</th>
                    <th className="px-3 py-2 text-center">Classe</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categorias.slice(0, 20).map((c) => {
                    const lc = lucroPorCategoria[c.nome] ?? { lucro: 0, receita: 0 };
                    const lucroNfe = lc.lucro;
                    const margemPct = lc.receita > 0 ? (lc.lucro / lc.receita * 100) : null;
                    return (
                      <tr key={c.nome} className="border-t border-border">
                        <td className="px-3 py-2 font-medium text-xs">{c.nome}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{c.skus}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{formatBRLCompact(c.receita12m)}</td>
                        <td className={`px-3 py-2 text-right font-mono text-xs ${lucroNfe < 0 ? "text-[#C62828]" : lucroNfe > 0 ? "text-[#2E7D32]" : "text-muted-foreground"}`}>
                          {lucroNfe !== 0 ? formatBRLCompact(lucroNfe) : "—"}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono text-xs font-bold ${margemPct == null ? "text-muted-foreground" : margemPct < 20 ? "text-[#C62828]" : margemPct < 40 ? "text-[#E65100]" : "text-[#2E7D32]"}`}>
                          {margemPct != null ? `${margemPct.toFixed(1)}%` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{c.giro > 0 ? `${c.giro.toFixed(1)}x` : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">{c.diasCobertura > 0 ? `${c.diasCobertura}d` : "—"}</td>
                        <td className="px-3 py-2 text-center"><ClasseBadge classe={c.classeABC} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
