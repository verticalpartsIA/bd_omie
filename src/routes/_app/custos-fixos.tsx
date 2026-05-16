import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, FileText, Percent, Sparkles, Wallet } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { USDCalendarWidget } from "@/components/app/USDCalendarWidget";
import { RoleGuard } from "@/components/app/RoleGuard";
import { KpiCard } from "@/components/app/KpiCard";
import { useSidebarToggle } from "../_app";
import { formatBRL, formatBRLCompact } from "@/lib/format";

export const Route = createFileRoute("/_app/custos-fixos" as never)({
  head: () => ({ meta: [{ title: "Custos Fixos — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "financeiro"]}>
      <CustosFixosPage />
    </RoleGuard>
  ),
});

interface GrupoCusto {
  codigo: string;
  descricao: string;
  total12m: number;
  totalMesAtual: number;
  count: number;
}

interface TopFornecedor {
  id: string;
  nome: string;
  total12m: number;
  totalMesAtual: number;
  count: number;
}

interface CustosFixosResponse {
  grupos: GrupoCusto[];
  tendencia: Array<Record<string, string | number>>;
  top_fornecedores: TopFornecedor[];
  totalMesAtual: number;
  total12m: number;
}

const emptyData: CustosFixosResponse = {
  grupos: [],
  tendencia: [],
  top_fornecedores: [],
  totalMesAtual: 0,
  total12m: 0,
};

const COLORS = ["#0288D1", "#2E7D32", "#E65100", "#7B1FA2", "#C62828", "#00838F", "#6B7280", "#F5C400"];

async function fetchCustosFixos(): Promise<CustosFixosResponse> {
  const res = await fetch("/api/custos-fixos");
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<CustosFixosResponse>;
}

function askClaude(q: string) {
  window.dispatchEvent(new CustomEvent("claude-ask", { detail: q }));
}

function CustosFixosPage() {
  const toggle = useSidebarToggle();
  const { data = emptyData, isLoading, isError } = useQuery({
    queryKey: ["custos-fixos"],
    queryFn: fetchCustosFixos,
  });

  return (
    <>
      <Topbar
        crumb="OPERAÇÃO · CUSTOS FIXOS"
        title="Custos Fixos"
        icon={<Building2 className="h-3.5 w-3.5" />}
        onToggleSidebar={toggle}
        extra={<USDCalendarWidget />}
      />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[26px] font-extrabold tracking-tight">Estrutura fixa da operação</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading ? "Carregando dados reais..." : "Contas a pagar excluindo CMV e pessoal."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => askClaude(`Analise os custos fixos: mês atual ${formatBRL(data.totalMesAtual)}, 12 meses ${formatBRL(data.total12m)} e principais grupos ${data.grupos.slice(0, 5).map((g) => `${g.codigo} ${formatBRL(g.total12m)}`).join(", ")}.`)}
            className="inline-flex items-center gap-2 rounded border border-border bg-card px-3 py-2 text-xs font-bold hover:bg-muted"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            Perguntar IA
          </button>
        </div>

        {isError && <div className="mb-4 text-sm text-destructive">Erro ao carregar /api/custos-fixos.</div>}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <KpiCard label="Total Mês" value={formatBRLCompact(data.totalMesAtual)} hint="mês corrente" icon={Wallet} accent />
          <KpiCard label="Total 12M" value={formatBRLCompact(data.total12m)} hint="últimos 12 meses" icon={FileText} />
          <KpiCard label="Pct Receita" value="--" hint="receita não informada nesta visão" icon={Percent} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 xl:col-span-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-400">Aluguel · Não mapeado</div>
            <div className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">Apto Gelson + Vinicius</div>
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              O aluguel do apartamento ainda não está cadastrado no Omie como contas a pagar.
              Cadastre em CP_Omie para aparecer automaticamente nesta visão.
            </p>
          </div>
          {data.grupos.map((g) => (
            <div key={g.codigo} className="rounded-md border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{g.codigo}</div>
                  <div className="mt-1 line-clamp-2 text-sm font-bold">{g.descricao}</div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{g.count}</span>
              </div>
              <div className="mt-4 font-mono text-2xl font-extrabold text-primary">{formatBRLCompact(g.total12m)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Mês atual: {formatBRL(g.totalMesAtual)}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Evolução por Grupo</h4>
            <p className="text-[11px] text-muted-foreground">Barras empilhadas dos últimos 12 meses.</p>
            <div className="mt-3">
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data.tendencia} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => formatBRLCompact(v)} />
                  <Tooltip formatter={(v: unknown) => formatBRL(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {data.grupos.slice(0, 8).map((g, i) => (
                    <Bar key={g.codigo} dataKey={g.codigo} name={g.codigo} stackId="a" fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Top Fornecedores</h4>
              <p className="text-[11px] text-muted-foreground">Maiores despesas fixas em 12 meses.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Fornecedor</th>
                    <th className="px-3 py-2 text-right">12M</th>
                    <th className="px-3 py-2 text-right">Mês</th>
                    <th className="px-3 py-2 text-right">Títulos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_fornecedores.map((f) => (
                    <tr key={f.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-3 py-2 font-medium">{f.nome}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{formatBRL(f.total12m)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(f.totalMesAtual)}</td>
                      <td className="px-3 py-2 text-right font-mono">{f.count.toLocaleString("pt-BR")}</td>
                    </tr>
                  ))}
                  {data.top_fornecedores.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Nenhum fornecedor encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
