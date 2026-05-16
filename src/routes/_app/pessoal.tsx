import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BadgePercent, BriefcaseBusiness, Gift, History, Sparkles, TrendingDown, Users, Wallet } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSidebarToggle } from "../_app";
import { formatBRL, formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/pessoal" as never)({
  head: () => ({ meta: [{ title: "Custo com Pessoal — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <PessoalPage />
    </RoleGuard>
  ),
});

interface Pessoa {
  id: string;
  nome: string;
  documento: string;
  cidade: string;
  uf: string;
  tags: string;
}

interface CategoriaPessoal {
  codigo: string;
  descricao: string;
  total12m: number;
  totalMesAtual: number;
  tipo: "salarios" | "encargos" | "beneficios";
}

interface TendenciaPessoal {
  mes: string;
  total: number;
  salarios: number;
  encargos: number;
  beneficios: number;
}

interface VendedorComissao {
  nome: string;
  total12m: number;
  totalMesAtual: number;
  pedidos12m: number;
  pedidosMesAtual: number;
}

interface TurnoverMes {
  mes: string;
  rescisoes: number;
}

interface PessoalResponse {
  funcionarios: Pessoa[];
  prestadores: Pessoa[];
  custosPessoalCategorias: CategoriaPessoal[];
  tendenciaMensal: TendenciaPessoal[];
  vendedores: VendedorComissao[];
  totalMesAtual: number;
  total12m: number;
  turnoverTotal: number;
  turnoverEventos: number;
  turnoverPorMes: TurnoverMes[];
}

const emptyData: PessoalResponse = {
  funcionarios: [],
  prestadores: [],
  custosPessoalCategorias: [],
  tendenciaMensal: [],
  vendedores: [],
  totalMesAtual: 0,
  total12m: 0,
  turnoverTotal: 0,
  turnoverEventos: 0,
  turnoverPorMes: [],
};

async function fetchPessoal(): Promise<PessoalResponse> {
  const res = await fetch("/api/pessoal");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<PessoalResponse>;
}

function askClaude(q: string) {
  window.dispatchEvent(new CustomEvent("claude-ask", { detail: q }));
}

function PessoaTable({ rows, empty }: { rows: Pessoa[]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Nome</th>
            <th className="px-3 py-2 text-left">Documento</th>
            <th className="px-3 py-2 text-left">Cidade</th>
            <th className="px-3 py-2 text-left">Tags</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-t border-border hover:bg-muted/30">
              <td className="px-3 py-2 font-medium">{p.nome}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{p.documento || "--"}</td>
              <td className="px-3 py-2 text-muted-foreground">{[p.cidade, p.uf].filter(Boolean).join(" / ") || "--"}</td>
              <td className="max-w-[360px] truncate px-3 py-2 text-xs text-muted-foreground">{p.tags || "--"}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PessoalPage() {
  const toggle = useSidebarToggle();
  const { data = emptyData, isLoading, isError } = useQuery({
    queryKey: ["pessoal"],
    queryFn: fetchPessoal,
  });

  const beneficios = data.custosPessoalCategorias.filter((c) => c.tipo === "beneficios");

  return (
    <>
      <Topbar
        crumb="OPERAÇÃO · PESSOAL"
        title="Custo com Pessoal"
        icon={<Users className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
        extra={<USDCalendarWidget />}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Folha, terceiros e comissões</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading ? "Carregando dados reais..." : "Custos de pessoal dos últimos 12 meses por categoria."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => askClaude(`Analise o custo com pessoal: mês atual ${formatBRL(data.totalMesAtual)}, 12 meses ${formatBRL(data.total12m)}, ${data.funcionarios.length} CLT e ${data.prestadores.length} PJ.`)}
            className="inline-flex items-center gap-2 rounded border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Perguntar IA
          </button>
        </div>

        {isError && <div className="mb-4 text-sm text-destructive">Erro ao carregar /api/pessoal.</div>}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Total Folha Mês" value={formatBRLCompact(data.totalMesAtual)} hint="mês corrente" icon={Wallet} accent />
          <KpiCard label="Total 12M" value={formatBRLCompact(data.total12m)} hint="últimos 12 meses" icon={History} />
          <KpiCard label="Funcionários CLT" value={String(data.funcionarios.length)} hint="tags PN_Omie" icon={Users} />
          <KpiCard label="Prestadores PJ" value={String(data.prestadores.length)} hint="tags PN_Omie" icon={BriefcaseBusiness} />
        </div>

        <Tabs defaultValue="clt" className="mt-6">
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="clt"><Users className="mr-2 h-4 w-4" />CLT</TabsTrigger>
            <TabsTrigger value="pj"><BriefcaseBusiness className="mr-2 h-4 w-4" />PJ</TabsTrigger>
            <TabsTrigger value="beneficios"><Gift className="mr-2 h-4 w-4" />Benefícios</TabsTrigger>
            <TabsTrigger value="comissoes"><BadgePercent className="mr-2 h-4 w-4" />Comissões</TabsTrigger>
            <TabsTrigger value="turnover"><TrendingDown className="mr-2 h-4 w-4" />Turnover</TabsTrigger>
            <TabsTrigger value="historico"><History className="mr-2 h-4 w-4" />Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="clt">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h4 className="text-sm font-bold">Funcionários CLT</h4>
                <p className="text-[11px] text-muted-foreground">Parceiros com tag Funcionário/Funcionario.</p>
              </div>
              <PessoaTable rows={data.funcionarios} empty="Nenhum funcionário encontrado." />
            </div>
          </TabsContent>

          <TabsContent value="pj">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h4 className="text-sm font-bold">Prestadores PJ</h4>
                <p className="text-[11px] text-muted-foreground">Parceiros com tag Prestadora.</p>
              </div>
              <PessoaTable rows={data.prestadores} empty="Nenhum prestador encontrado." />
            </div>
          </TabsContent>

          <TabsContent value="beneficios">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {beneficios.map((b) => (
                <div key={b.codigo} className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{b.codigo}</div>
                  <div className="mt-1 min-h-10 text-sm font-bold">{b.descricao}</div>
                  <div className="mt-4 font-mono text-2xl font-extrabold text-primary">{formatBRL(b.total12m)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">Mês atual: {formatBRL(b.totalMesAtual)}</div>
                </div>
              ))}
              {beneficios.length === 0 && <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">Nenhum benefício classificado.</div>}
            </div>
          </TabsContent>

          <TabsContent value="comissoes">
            <div className="rounded-xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h4 className="text-sm font-bold">Base para Comissões</h4>
                <p className="text-[11px] text-muted-foreground">Pedidos agrupados pelo campo vendedor nos últimos 12 meses.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Vendedor</th>
                      <th className="px-3 py-2 text-right">Vendas 12M</th>
                      <th className="px-3 py-2 text-right">Vendas Mês</th>
                      <th className="px-3 py-2 text-right">Pedidos 12M</th>
                      <th className="px-3 py-2 text-left">Comissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendedores.map((v) => (
                      <tr key={v.nome} className="border-t border-border hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{v.nome}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatBRL(v.total12m)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatBRL(v.totalMesAtual)}</td>
                        <td className="px-3 py-2 text-right font-mono">{v.pedidos12m.toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-2"><span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">Cadastrar%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="turnover">
            <div className="space-y-4">
              {/* KPI cards de turnover */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Verbas Rescisórias (hist.)</div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-destructive">{formatBRL(data.turnoverTotal)}</div>
                  <div className="mt-1 text-xs text-muted-foreground">CP_Omie cat. 2.03.04</div>
                </div>
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Eventos de Rescisão</div>
                  <div className="mt-2 font-mono text-2xl font-extrabold">{data.turnoverEventos}</div>
                  <div className="mt-1 text-xs text-muted-foreground">últimos 12 meses</div>
                </div>
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Custo Médio / Rescisão</div>
                  <div className="mt-2 font-mono text-2xl font-extrabold text-amber-600">
                    {data.turnoverEventos > 0 ? formatBRL(data.turnoverTotal / data.turnoverEventos) : "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">média histórica</div>
                </div>
                <div className="rounded-md border border-border bg-card p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Equipe Ativa</div>
                  <div className="mt-2 font-mono text-2xl font-extrabold">{data.funcionarios.length + data.prestadores.length}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{data.funcionarios.length} CLT + {data.prestadores.length} PJ</div>
                </div>
              </div>

              {/* Gráfico de rescisões por mês */}
              <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <h4 className="text-sm font-bold">Rescisões por Mês (12 meses)</h4>
                <p className="text-[11px] text-muted-foreground">Verbas rescisórias pagas mês a mês — categoria 2.03.04 do Omie.</p>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.turnoverPorMes} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRLCompact(v)} />
                      <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                      <Bar dataKey="rescisoes" name="Rescisões" fill="#E65100" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Box informativo */}
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400">Metodologia de Turnover</div>
                <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
                  Taxa de Turnover = (nº eventos rescisórios / média de colaboradores ativos) × 100.
                  Benchmark saudável PME: 5%–15% ao ano. Custo estimado por saída: 3 a 10 salários mensais
                  (verbas + recrutamento + treinamento + perda de produtividade).
                  Todos os 47 funcionários aparecem como ativos no Omie — o histórico de saídas é derivado das verbas rescisórias pagas.
                </p>
                <button
                  type="button"
                  onClick={() => askClaude(`Analise o turnover da VerticalParts: ${data.turnoverEventos} eventos de rescisão nos últimos 12 meses, total de verbas rescisórias ${formatBRL(data.turnoverTotal)}, custo médio por rescisão ${formatBRL(data.turnoverEventos > 0 ? data.turnoverTotal / data.turnoverEventos : 0)}. Equipe ativa: ${data.funcionarios.length} CLT + ${data.prestadores.length} PJ.`)}
                  className="mt-3 inline-flex items-center gap-2 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-900/60"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Perguntar IA sobre Turnover
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="historico">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h4 className="text-sm font-bold">Histórico 12M</h4>
              <p className="text-[11px] text-muted-foreground">Total, salários, encargos e benefícios.</p>
              <div className="mt-3">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={data.tendenciaMensal} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRLCompact(v)} />
                    <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="total" name="Total" stroke="#111827" fill="#111827" fillOpacity={0.10} />
                    <Area type="monotone" dataKey="salarios" name="Salários" stroke="#0288D1" fill="#0288D1" fillOpacity={0.20} />
                    <Area type="monotone" dataKey="encargos" name="Encargos" stroke="#E65100" fill="#E65100" fillOpacity={0.20} />
                    <Area type="monotone" dataKey="beneficios" name="Benefícios" stroke="#2E7D32" fill="#2E7D32" fillOpacity={0.20} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
