import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileBarChart, Download, BarChart3, DollarSign, Package, Layers, Wallet, Sliders } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Line, ComposedChart,
} from "recharts";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { vendedores, formatBRL as fmtV } from "@/data/comercial-mock";
import { clientes } from "@/data/clientes-mock";
import { margemCategoria, evolucaoReceitaCusto, dre, formatBRL } from "@/data/financeiro-mock";
import { produtos, categorias } from "@/data/estoque-mock";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <RelatoriosPage />
    </RoleGuard>
  ),
});

function RelatoriosPage() {
  const toggle = useSidebarToggle();
  const [periodo, setPeriodo] = useState("30d");

  // Custom report builder state
  const [dimensao, setDimensao] = useState("vendedor");
  const [metrica, setMetrica] = useState("receita");

  const customRows = useMemo(() => {
    if (dimensao === "vendedor") {
      return vendedores.map((v) => ({
        chave: v.nome,
        receita: v.realizado,
        margem: Math.round(v.realizado * 0.34),
        quantidade: v.pedidos,
        ticket: v.ticketMedio,
      }));
    }
    if (dimensao === "cliente") {
      return clientes.slice(0, 15).map((c) => ({
        chave: c.nome,
        receita: c.receitaTotal,
        margem: Math.round(c.receitaTotal * 0.32),
        quantidade: c.totalPedidos,
        ticket: c.ticketMedio,
      }));
    }
    return categorias.map((cat) => {
      const ps = produtos.filter((p) => p.categoria === cat);
      const receita = ps.reduce((s, p) => s + p.custoUnitario * p.giro * 30, 0);
      return { chave: cat, receita, margem: Math.round(receita * 0.36), quantidade: ps.length, ticket: Math.round(receita / Math.max(1, ps.length)) };
    });
  }, [dimensao]);

  const sorted = [...customRows].sort((a, b) => (b as any)[metrica] - (a as any)[metrica]);

  // ABC dinâmica
  const abcData = produtos.slice(0, 30).map((p) => {
    const receita = p.custoUnitario * p.giro * 30;
    return { sku: p.sku, receita, margem: Math.round(receita * 0.32) };
  }).sort((a, b) => b.receita - a.receita);

  const onExport = () => toast.success("Relatório exportado para CSV");

  return (
    <>
      <Topbar crumb="OPERAÇÃO · RELATÓRIOS" title="Relatórios" icon={<FileBarChart className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Investigação & Self-service</h2>
            <p className="mt-1 text-sm text-muted-foreground">Recorte qualquer dimensão, qualquer período. Sem depender de TI.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="ytd">Ano corrente</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={onExport}><Download className="mr-2 h-4 w-4" /> Exportar</Button>
          </div>
        </div>

        <Tabs defaultValue="vendas">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="vendas"><BarChart3 className="mr-2 h-4 w-4" /> Vendas</TabsTrigger>
            <TabsTrigger value="rentabilidade"><DollarSign className="mr-2 h-4 w-4" /> Rentabilidade</TabsTrigger>
            <TabsTrigger value="estoque"><Package className="mr-2 h-4 w-4" /> Estoque</TabsTrigger>
            <TabsTrigger value="abc"><Layers className="mr-2 h-4 w-4" /> Curva ABC</TabsTrigger>
            <TabsTrigger value="financeiro"><Wallet className="mr-2 h-4 w-4" /> Financeiro</TabsTrigger>
            <TabsTrigger value="custom"><Sliders className="mr-2 h-4 w-4" /> Customizado</TabsTrigger>
          </TabsList>

          <TabsContent value="vendas">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Vendas por vendedor</h4>
              <p className="text-[11px] text-muted-foreground">Período: {periodo}</p>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vendedores.map((v) => ({ nome: v.nome, receita: v.realizado, ticket: v.ticketMedio }))} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtV(v)} />
                    <Tooltip formatter={(v: unknown) => fmtV(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receita" name="Receita" fill="#F5C400" radius={[4,4,0,0]} />
                    <Bar dataKey="ticket" name="Ticket Médio" fill="#0288D1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="rentabilidade">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Rentabilidade por categoria</h4>
              <p className="text-[11px] text-muted-foreground">Receita vs custo vs margem%</p>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={margemCategoria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip formatter={(v: unknown, n: unknown) => n === "margemPct" ? `${v}%` : formatBRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar yAxisId="l" dataKey="receita" name="Receita" fill="#0288D1" />
                    <Bar yAxisId="l" dataKey="custo" name="Custo" fill="#C62828" />
                    <Line yAxisId="r" type="monotone" dataKey="margemPct" name="Margem %" stroke="#F5C400" strokeWidth={3} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="estoque">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Inventário em foto</h4>
              <p className="text-[11px] text-muted-foreground">{produtos.length} SKUs</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Categoria</th>
                      <th className="px-3 py-2 text-right">Estoque</th>
                      <th className="px-3 py-2 text-right">Giro/mês</th>
                      <th className="px-3 py-2 text-right">Cobertura</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.slice(0, 25).map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.categoria}</td>
                        <td className="px-3 py-2 text-right font-mono">{p.estoqueAtual}</td>
                        <td className="px-3 py-2 text-right font-mono">{p.giro}</td>
                        <td className="px-3 py-2 text-right font-mono">{p.diasCobertura}d</td>
                        <td className="px-3 py-2 text-right font-mono">{formatBRL(p.custoUnitario * p.estoqueAtual)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="abc">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Curva ABC dinâmica</h4>
              <p className="text-[11px] text-muted-foreground">Receita vs margem por SKU · top 30</p>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={abcData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="sku" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                    <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receita" name="Receita" fill="#0288D1" />
                    <Bar dataKey="margem" name="Margem absoluta" fill="#F5C400" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financeiro">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h4 className="text-sm font-bold">DRE consolidado</h4>
                <p className="text-[11px] text-muted-foreground">Mai/25</p>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between border-b border-border py-1.5"><span>Receita Bruta</span><span className="font-mono">{formatBRL(dre.receitaBruta)}</span></div>
                  <div className="flex justify-between border-b border-border py-1.5"><span>Receita Líquida</span><span className="font-mono font-bold">{formatBRL(dre.receitaLiquida)}</span></div>
                  <div className="flex justify-between border-b border-border py-1.5"><span>Margem Bruta</span><span className="font-mono">{formatBRL(dre.margemBruta)}</span></div>
                  <div className="flex justify-between border-b border-border py-1.5"><span>EBITDA</span><span className="font-mono font-bold text-success">{formatBRL(dre.ebitda)}</span></div>
                  <div className="flex justify-between py-1.5"><span>Resultado Líquido</span><span className="font-mono font-bold">{formatBRL(dre.resultadoLiquido)}</span></div>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h4 className="text-sm font-bold">Receita vs Custo · 6 meses</h4>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={evolucaoReceitaCusto}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRL(v)} />
                      <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="receita" name="Receita" fill="#2E7D32" />
                      <Bar dataKey="custo" name="Custo" fill="#C62828" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Construtor de relatório</h4>
              <p className="text-[11px] text-muted-foreground">Escolha dimensão e métrica para montar a sua visão</p>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Dimensão</label>
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
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">Ordenar por</label>
                  <Select value={metrica} onValueChange={setMetrica}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receita">Receita</SelectItem>
                      <SelectItem value="margem">Margem</SelectItem>
                      <SelectItem value="quantidade">Quantidade</SelectItem>
                      <SelectItem value="ticket">Ticket Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={onExport}><Download className="mr-2 h-4 w-4" /> Exportar</Button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">{dimensao}</th>
                      <th className="px-3 py-2 text-right">Receita</th>
                      <th className="px-3 py-2 text-right">Margem</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Ticket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.chave} className="border-t border-border">
                        <td className="px-3 py-2 font-medium">{r.chave}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatBRL(r.receita)}</td>
                        <td className="px-3 py-2 text-right font-mono text-success">{formatBRL(r.margem)}</td>
                        <td className="px-3 py-2 text-right font-mono">{r.quantidade}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatBRL(r.ticket)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}