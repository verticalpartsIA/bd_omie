import { createFileRoute } from "@tanstack/react-router";

function getEnv(key: string): string {
  // 1. Cloudflare Workers: variáveis vinculadas como globais
  // @ts-expect-error
  if (typeof globalThis[key] !== "undefined") return globalThis[key] as string;
  // 2. Vite dev server: import.meta.env (exposto via envPrefix no vite.config)
  // @ts-expect-error
  const metaVal = import.meta.env?.[key];
  if (metaVal) return metaVal as string;
  // 3. Node.js process.env (fallback)
  return (process.env[key] as string) ?? "";
}

async function sbQuery(table: string, params: Record<string, string>): Promise<unknown[]> {
  const url = new URL(`${getEnv("VITE_SUPABASE_URL")}/rest/v1/${encodeURIComponent(table)}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      apikey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<unknown[]>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClasseABC = "A" | "B" | "C";
export type StatusEstoque = "ativo" | "critico" | "inativo";

export interface ProdutoRow {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  estoqueAtual: number;
  mediaMensal: number;
  diasCobertura: number;
  diagnostico: string;
  classeABC: ClasseABC;
  receita12m: number;
  status: StatusEstoque;
  unidade: string;
  giro: number;
}

export interface CategoriaRow {
  nome: string;
  skus: number;
  receita12m: number;
  diasCobertura: number;
  classeABC: ClasseABC;
  giro: number;
  saude: "ok" | "warn" | "bad";
}

export interface EstoqueKpis {
  giroMedio: number;
  diasCobertura: number;
  rupturaPercentual: number;
  valorInventario: number; // total receita 12m como proxy
  skusAtivos: number;
  skusCriticos: number;
  totalSkus: number;
}

export interface AbcItem {
  sku: string;
  nome: string;
  receita: number;
  classe: ClasseABC;
}

export interface GiroItem {
  categoria: string;
  giro: number;
  meta: number;
}

export interface MovimentacaoRow {
  id: string;
  data: string;
  tipo: "saida";
  sku: string;
  nomeProduto: string;
  quantidade: number;
  valorTotal: number;
  origem: string;
}

export interface DiaMove {
  dia: string;
  saidas: number;
  entradas: number;
}

export interface AgingItem {
  faixa: string;
  skus: number;
  cor: string;
}

export interface EstoqueResponse {
  produtos: ProdutoRow[];
  categorias: CategoriaRow[];
  kpis: EstoqueKpis;
  abcTop15: AbcItem[];
  giroPorCategoria: GiroItem[];
  movimentacoes: MovimentacaoRow[];
  movimentacoesPorDia: DiaMove[];
  aging: AgingItem[];
}

const PT_MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/estoque")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const now = new Date();
          const cut12 = new Date(now); cut12.setMonth(cut12.getMonth() - 12);
          const cut12str = cut12.toISOString().slice(0, 10);
          const cut30 = new Date(now); cut30.setDate(cut30.getDate() - 30);
          const cut30str = cut30.toISOString().slice(0, 10);

          // Fetch in parallel
          // NOTE: omie_order_items confirmed columns (see analytical.ts): codigo,descricao,quantidade,valor_total
          // numero_pedido is NOT a reliable column — join to orders via a separate query if needed
          const [estoqueRaw, itemsRaw, ordersRaw] = await Promise.all([
            sbQuery("vw_estoque_inteligente", {
              select: "codigo,descricao,descricao_familia,media_mensal_saidas,quantidade_estoque,diagnostico",
              limit: "5000",
            }),
            sbQuery("omie_order_items", {
              select: "codigo,descricao,quantidade,valor_total",
              limit: "40000",
              order: "valor_total.desc",
            }).catch(() => [] as unknown[]),
            sbQuery("omie_orders", {
              select: "numero_pedido,valor_total_pedido,data_inclusao",
              order: "data_inclusao.desc",
              limit: "10000",
            }).catch(() => [] as unknown[]),
          ]);

          const estoqueList = estoqueRaw as any[];
          const items = itemsRaw as any[];
          const orders = ordersRaw as any[];

          // Build daily orders value map from omie_orders (for movimentacoesPorDia chart)
          const ordersByDay: Record<string, { saidas: number; valor: number }> = {};
          for (let i = 29; i >= 0; i--) {
            const dt = new Date(now);
            dt.setDate(dt.getDate() - i);
            ordersByDay[dt.toISOString().slice(0, 10)] = { saidas: 0, valor: 0 };
          }
          for (const o of orders) {
            const day = String(o.data_inclusao ?? "").slice(0, 10);
            if (ordersByDay[day]) {
              ordersByDay[day].saidas++;
              ordersByDay[day].valor += Number(o.valor_total_pedido ?? 0);
            }
          }
          // Most recent order date (for movimentacoes list)
          const mostRecentOrderDate = orders[0]
            ? String(orders[0].data_inclusao ?? "").slice(0, 10) || cut30str
            : cut30str;

          // Aggregate revenue per product from order_items (all time)
          const revenueByCode: Record<string, number> = {};
          for (const it of items) {
            const cod = String(it.codigo ?? "").trim();
            if (!cod) continue;
            revenueByCode[cod] = (revenueByCode[cod] ?? 0) + Number(it.valor_total ?? 0);
          }

          // Total revenue for ABC percentile
          const allRevs = Object.values(revenueByCode).sort((a, b) => b - a);
          const totalRev = allRevs.reduce((s, v) => s + v, 0);

          // ABC classification: A = top 80% of revenue, B = next 15%, C = rest
          let cumRev = 0;
          const abcByCode: Record<string, ClasseABC> = {};
          for (const cod of Object.keys(revenueByCode).sort((a, b) => (revenueByCode[b] ?? 0) - (revenueByCode[a] ?? 0))) {
            cumRev += revenueByCode[cod] ?? 0;
            const pct = totalRev > 0 ? cumRev / totalRev : 0;
            abcByCode[cod] = pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C";
          }

          // Build product rows
          const produtosAll: ProdutoRow[] = estoqueList.map((e) => {
            const cod = String(e.codigo ?? "").trim();
            const estoque = Number(e.quantidade_estoque ?? 0);
            const mediaMes = Number(e.media_mensal_saidas ?? 0);
            const diasCob = mediaMes > 0 ? Math.round((estoque / mediaMes) * 30) : (estoque > 0 ? 999 : 0);
            const diag = String(e.diagnostico ?? "").trim();
            const receita = revenueByCode[cod] ?? 0;

            let status: StatusEstoque;
            if (estoque === 0 || diasCob < 7) status = "critico";
            else if (mediaMes === 0 && estoque > 0) status = "inativo";
            else status = "ativo";

            const giro = estoque > 0 && mediaMes > 0 ? Math.round((mediaMes * 12) / estoque * 10) / 10 : 0;

            return {
              id: cod,
              sku: cod,
              nome: String(e.descricao ?? `Produto ${cod}`).trim().slice(0, 60),
              categoria: String(e.descricao_familia ?? "Outros").trim().slice(0, 40),
              estoqueAtual: estoque,
              mediaMensal: Math.round(mediaMes * 10) / 10,
              diasCobertura: diasCob,
              diagnostico: diag,
              classeABC: abcByCode[cod] ?? "C",
              receita12m: Math.round(receita),
              status,
              unidade: "un",
              giro,
            };
          }).sort((a, b) => b.receita12m - a.receita12m);

          // KPIs
          const skusAtivos = produtosAll.filter((p) => p.status === "ativo").length;
          const skusCriticos = produtosAll.filter((p) => p.status === "critico").length;
          const prodComDemanda = produtosAll.filter((p) => p.mediaMensal > 0);
          const diasCobMedia = prodComDemanda.length > 0
            ? Math.round(prodComDemanda.reduce((s, p) => s + p.diasCobertura, 0) / prodComDemanda.length)
            : 0;
          const giroMedio = prodComDemanda.length > 0
            ? Math.round(prodComDemanda.reduce((s, p) => s + p.giro, 0) / prodComDemanda.length * 10) / 10
            : 0;
          const rupturaPercentual = produtosAll.length > 0
            ? Math.round((produtosAll.filter((p) => p.estoqueAtual === 0).length / produtosAll.length) * 100)
            : 0;
          const valorInventario = Math.round(totalRev);

          // Categorias aggregation
          const catMap: Record<string, { skus: number; receita: number; diasList: number[]; giroList: number[] }> = {};
          for (const p of produtosAll) {
            if (!catMap[p.categoria]) catMap[p.categoria] = { skus: 0, receita: 0, diasList: [], giroList: [] };
            catMap[p.categoria].skus++;
            catMap[p.categoria].receita += p.receita12m;
            if (p.mediaMensal > 0) {
              catMap[p.categoria].diasList.push(p.diasCobertura);
              catMap[p.categoria].giroList.push(p.giro);
            }
          }

          // Sort categories by revenue
          const catRevs = Object.entries(catMap).sort(([, a], [, b]) => b.receita - a.receita);
          const totalCatRev = catRevs.reduce((s, [, c]) => s + c.receita, 0);
          let cumCatRev = 0;
          const categorias: CategoriaRow[] = catRevs.map(([nome, c]) => {
            cumCatRev += c.receita;
            const pct = totalCatRev > 0 ? cumCatRev / totalCatRev : 0;
            const classeABC: ClasseABC = pct <= 0.8 ? "A" : pct <= 0.95 ? "B" : "C";
            const diasCob = c.diasList.length > 0 ? Math.round(c.diasList.reduce((s, v) => s + v, 0) / c.diasList.length) : 0;
            const giro = c.giroList.length > 0 ? Math.round(c.giroList.reduce((s, v) => s + v, 0) / c.giroList.length * 10) / 10 : 0;
            const saude: "ok" | "warn" | "bad" = giro >= 4 ? "ok" : giro >= 2 ? "warn" : "bad";
            return { nome, skus: c.skus, receita12m: Math.round(c.receita), diasCobertura: diasCob, classeABC, giro, saude };
          });

          // ABC top 15
          const abcTop15: AbcItem[] = produtosAll.slice(0, 15).map((p) => ({
            sku: p.sku.slice(0, 12),
            nome: p.nome.slice(0, 25),
            receita: p.receita12m,
            classe: p.classeABC,
          }));

          // Giro por categoria
          const giroPorCategoria: GiroItem[] = categorias
            .filter((c) => c.giro > 0)
            .slice(0, 8)
            .map((c) => ({ categoria: c.nome.slice(0, 12), giro: c.giro, meta: 4 }));

          // Aging distribution (by diasCobertura buckets)
          const aging: AgingItem[] = [
            { faixa: "Ruptura (0d)", skus: produtosAll.filter((p) => p.diasCobertura === 0 && p.mediaMensal > 0).length, cor: "#C62828" },
            { faixa: "Crítico (1–7d)", skus: produtosAll.filter((p) => p.diasCobertura > 0 && p.diasCobertura <= 7).length, cor: "#E65100" },
            { faixa: "Alerta (8–30d)", skus: produtosAll.filter((p) => p.diasCobertura > 7 && p.diasCobertura <= 30).length, cor: "#F5C400" },
            { faixa: "OK (31–90d)", skus: produtosAll.filter((p) => p.diasCobertura > 30 && p.diasCobertura <= 90).length, cor: "#2E7D32" },
            { faixa: "Excesso (90d+)", skus: produtosAll.filter((p) => p.diasCobertura > 90 && p.diasCobertura < 999).length, cor: "#0288D1" },
          ];

          // Movimentações from order_items — sorted by valor_total desc (top selling items)
          // Date = mostRecentOrderDate (items don't carry individual order dates)
          const movimentacoes: MovimentacaoRow[] = items
            .slice(0, 500)
            .map((it, i) => ({
              id: `item-${i}-${String(it.codigo ?? "").trim()}`,
              data: mostRecentOrderDate + "T00:00:00",
              tipo: "saida" as const,
              sku: String(it.codigo ?? "").trim(),
              nomeProduto: String(it.descricao ?? "").trim().slice(0, 50),
              quantidade: -Math.abs(Number(it.quantidade ?? 1)),
              valorTotal: Number(it.valor_total ?? 0),
              origem: "Venda Omie",
            }))
            .filter((m) => m.sku);

          // Movimentações por dia — built from omie_orders (accurate daily order counts)
          const movimentacoesPorDia: DiaMove[] = Object.entries(ordersByDay).map(([dia, v]) => ({
            dia: new Date(dia + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            saidas: v.saidas,   // count of orders on that day
            entradas: 0,
          }));

          const response: EstoqueResponse = {
            produtos: produtosAll.slice(0, 500),
            categorias,
            kpis: {
              giroMedio,
              diasCobertura: diasCobMedia,
              rupturaPercentual,
              valorInventario,
              skusAtivos,
              skusCriticos,
              totalSkus: produtosAll.length,
            },
            abcTop15,
            giroPorCategoria,
            movimentacoes,
            movimentacoesPorDia,
            aging,
          };

          return Response.json(response);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/estoque]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
