import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProductModal } from "@/components/app/ProductModal";
import { categorias, produtos } from "@/data/estoque-mock";

export const Route = createFileRoute("/_app/produtos/")({
  head: () => ({ meta: [{ title: "Produtos — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <ProdutosList />
    </RoleGuard>
  ),
});

function ProdutosList() {
  const toggle = useSidebarToggle();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [classe, setClasse] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const filtered = useMemo(() => {
    return produtos.filter((p) => {
      if (q && !(`${p.sku} ${p.nome}`.toLowerCase().includes(q.toLowerCase()))) return false;
      if (cat !== "all" && p.categoria !== cat) return false;
      if (classe !== "all" && p.classeABC !== classe) return false;
      if (status !== "all" && p.status !== status) return false;
      return true;
    });
  }, [q, cat, classe, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <Topbar crumb="PRODUTOS" title="Produtos" icon={<ShoppingBag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[26px] font-extrabold tracking-tight">Catálogo de Produtos</h2>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo Produto</Button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="SKU ou nome..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
          </div>
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
              <thead className="bg-muted/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">SKU</th>
                  <th className="px-4 py-2 text-left">Produto</th>
                  <th className="px-4 py-2 text-left">Categoria</th>
                  <th className="px-4 py-2 text-right">Estoque</th>
                  <th className="px-4 py-2 text-right">Cobertura</th>
                  <th className="px-4 py-2 text-center">Classe</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">Nenhum produto encontrado</td></tr>
                )}
                {pageItems.map((p, idx) => {
                  const isCrit = p.status === "critico";
                  const cobCls = p.diasCobertura < 7 ? "text-[#C62828] font-bold" : p.diasCobertura < 15 ? "text-[#E65100] font-semibold" : "";
                  return (
                    <tr
                      key={p.id}
                      onClick={() => navigate({ to: "/produtos/$id", params: { id: p.id } })}
                      className={`cursor-pointer border-t border-border hover:bg-gray-50 ${isCrit ? "bg-[#FBE9E9]" : ""}`}
                    >
                      <td className="px-4 py-2 text-xs text-muted-foreground">{(page - 1) * PER_PAGE + idx + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-2">{p.nome}</td>
                      <td className="px-4 py-2 text-xs">{p.categoria}</td>
                      <td className="px-4 py-2 text-right font-mono">{p.estoqueAtual} {p.unidade}</td>
                      <td className={`px-4 py-2 text-right font-mono ${cobCls}`}>{p.diasCobertura} dias</td>
                      <td className="px-4 py-2 text-center"><ClasseBadge classe={p.classeABC} /></td>
                      <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
            <span className="text-muted-foreground">Exibindo {pageItems.length} de {filtered.length} produtos</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</Button>
              <span className="px-2 font-mono">{page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</Button>
            </div>
          </div>
        </div>

        <ProductModal open={open} onOpenChange={setOpen} />
      </main>
    </>
  );
}