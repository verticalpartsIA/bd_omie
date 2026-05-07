import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { ClasseBadge } from "@/components/ui/ClasseBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EstoqueHistoricoChart } from "@/components/charts/EstoqueHistoricoChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { estoqueHistoricoMock, getProdutoById, movimentacoes, formatBRL } from "@/data/estoque-mock";

export const Route = createFileRoute("/_app/produtos/$id")({
  head: () => ({ meta: [{ title: "Produto — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "estoque"]}>
      <ProdutoDetail />
    </RoleGuard>
  ),
});

function ProdutoDetail() {
  const toggle = useSidebarToggle();
  const { id } = useParams({ from: "/_app/produtos/$id" });
  const p = getProdutoById(id);
  const [tab, setTab] = useState("historico");

  if (!p) {
    return (
      <>
        <Topbar crumb="PRODUTOS" title="Produto" icon={<ShoppingBag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
        <main className="p-7"><p className="text-sm text-muted-foreground">Produto não encontrado.</p></main>
      </>
    );
  }

  const movs = movimentacoes.filter((m) => m.produtoId === p.id).slice(0, 20);

  return (
    <>
      <Topbar crumb="PRODUTOS · DETALHE" title={p.nome} icon={<ShoppingBag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <Link to="/produtos" className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Produtos
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
          <h1 className="text-2xl font-extrabold">{p.nome}</h1>
          <ClasseBadge classe={p.classeABC} />
          <StatusBadge status={p.status} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Mini label="Estoque Atual" value={`${p.estoqueAtual} ${p.unidade}`} />
          <Mini label="Dias Cobertura" value={`${p.diasCobertura} dias`} />
          <Mini label="Giro (6m)" value={`${p.giro}x`} />
          <Mini label="Custo Total" value={formatBRL(p.estoqueAtual * p.custoUnitario)} />
        </div>

        <div className="mt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="historico" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <h4 className="text-sm font-bold mb-2">Evolução do Saldo (6 meses)</h4>
                <EstoqueHistoricoChart data={estoqueHistoricoMock} minimo={p.estoqueMinimo} />
              </div>
            </TabsContent>

            <TabsContent value="movimentacoes" className="mt-4">
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[11px] font-bold uppercase text-muted-foreground">
                    <tr><th className="px-4 py-2 text-left">Data</th><th className="px-4 py-2 text-left">Tipo</th><th className="px-4 py-2 text-right">Qtd</th><th className="px-4 py-2 text-right">Saldo</th><th className="px-4 py-2 text-left">Responsável</th></tr>
                  </thead>
                  <tbody>
                    {movs.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">Sem movimentações</td></tr>}
                    {movs.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-2 text-xs">{new Date(m.data).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-2 text-xs capitalize">{m.tipo}</td>
                        <td className={`px-4 py-2 text-right font-mono ${m.quantidade > 0 ? "text-[#2E7D32]" : "text-[#C62828]"}`}>{m.quantidade > 0 ? "+" : ""}{m.quantidade}</td>
                        <td className="px-4 py-2 text-right font-mono">{m.saldoApos}</td>
                        <td className="px-4 py-2 text-xs">{m.responsavel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="fornecedores" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-sm">
                <p><strong>Fornecedor principal:</strong> {p.fornecedor}</p>
                <p className="mt-2 text-xs text-muted-foreground">Lead time: 7 dias · Último pedido: há 12 dias</p>
              </div>
            </TabsContent>

            <TabsContent value="config" className="mt-4">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm text-sm text-muted-foreground">
                Edição de produto disponível após integração com backend.
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-extrabold">{value}</div>
    </div>
  );
}