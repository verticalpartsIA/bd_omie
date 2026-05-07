import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleDot, Cable, LayoutGrid, Zap, Layers, Package, Tag } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { CoberturaBar } from "@/components/ui/CoberturaBar";
import { categorias, formatBRL, produtos } from "@/data/estoque-mock";

export const Route = createFileRoute("/_app/categorias")({
  head: () => ({ meta: [{ title: "Categorias — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <CategoriasPage />
    </RoleGuard>
  ),
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Polias: CircleDot, Cabos: Cable, Painéis: LayoutGrid, Motores: Zap, Degraus: Layers, Outros: Package,
};

function CategoriasPage() {
  const toggle = useSidebarToggle();
  const navigate = useNavigate();

  const cards = categorias.map((c) => {
    const items = produtos.filter((p) => p.categoria === c);
    const valor = items.reduce((s, p) => s + p.estoqueAtual * p.custoUnitario, 0);
    const giro = items.length ? items.reduce((s, p) => s + p.giro, 0) / items.length : 0;
    const cob = items.length ? Math.round(items.reduce((s, p) => s + p.diasCobertura, 0) / items.length) : 0;
    const classeMaj: "A" | "B" | "C" = items.filter((p) => p.classeABC === "A").length > items.length / 3 ? "A" : "B";
    const saude = giro >= 4 ? "ok" : giro >= 3 ? "warn" : "bad";
    return { c, items, valor, giro, cob, classeMaj, saude };
  });

  return (
    <>
      <Topbar crumb="PRODUTOS · CATEGORIAS" title="Categorias" icon={<Tag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <h2 className="text-[26px] font-extrabold tracking-tight">Visão por Categoria</h2>
        <p className="mt-1 text-sm text-muted-foreground">Saúde de inventário agregada por linha de produto.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ c, items, valor, giro, cob, classeMaj, saude }) => {
            const Icon = ICONS[c] ?? Package;
            const saudeIcon = saude === "ok" ? "✓" : saude === "warn" ? "⚠" : "✗";
            const saudeCls = saude === "ok" ? "text-[#2E7D32]" : saude === "warn" ? "text-[#E65100]" : "text-[#C62828]";
            return (
              <button
                key={c}
                onClick={() => navigate({ to: "/produtos" })}
                className="rounded-xl border border-border bg-card p-5 text-left shadow-sm hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
                  <h3 className="flex-1 text-base font-bold">{c}</h3>
                  <ClasseBadge classe={classeMaj} />
                  <span className={`text-lg font-bold ${saudeCls}`}>{saudeIcon}</span>
                </div>
                <div className="my-3 h-px bg-border" />
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div><div className="text-muted-foreground">SKUs</div><div className="font-mono text-base font-bold">{items.length}</div></div>
                  <div><div className="text-muted-foreground">Valor</div><div className="font-mono text-base font-bold">{formatBRL(valor)}</div></div>
                  <div><div className="text-muted-foreground">Giro</div><div className="font-mono text-base font-bold">{giro.toFixed(1)}x</div></div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Cobertura: {cob} dias</span></div>
                  <CoberturaBar dias={cob} max={90} />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}