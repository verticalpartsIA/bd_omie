import { createFileRoute } from "@tanstack/react-router";

function getEnv(key: string): string {
  // @ts-expect-error Cloudflare Workers global
  if (typeof globalThis[key] !== "undefined") return globalThis[key] as string;
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

export interface PedidoRow {
  id: string;
  numeroPedido: string;
  cliente: string;
  vendedor: string;
  valor: number;
  dataInclusao: string;   // YYYY-MM-DD
  etapa: string;
  ageingDias: number;     // days since dataInclusao
}

export interface PedidosKpis {
  total: number;          // total orders in last 6m
  emAberto: number;       // orders where etapa NOT IN completed etapas
  carteira: number;       // sum of valor of open orders
  ticketMedio: number;    // avg valor all orders
  pedidosHoje: number;    // orders with dataInclusao = today
  pedidos30d: number;     // orders last 30 days
}

export interface StatusDistItem {
  key: string;
  etapa: string;
  count: number;
  valor: number;
  color: string;
}

export interface AgingBucket {
  faixa: string;
  count: number;
  color: string;
}

export interface MonthlyItem {
  mes: string;            // short PT month name e.g. "Jan"
  pedidos: number;
  valor: number;
}

export interface EtapaCicloItem {
  etapa: string;
  count: number;
  valor: number;
}

export interface PedidosResponse {
  pedidos: PedidoRow[];
  kpis: PedidosKpis;
  statusDist: StatusDistItem[];
  agingDist: AgingBucket[];
  evolucaoMensal: MonthlyItem[];
  etapasCiclo: EtapaCicloItem[];
}

const PT_MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const STATUS_COLORS = ["#F5C400","#2E7D32","#0288D1","#E65100","#7B1FA2","#9E9E9E","#C62828","#00838F"];

function isOpenEtapa(etapa: string): boolean {
  const e = etapa.toLowerCase();
  return !e.includes("fatur") && !e.includes("entreg") && !e.includes("cancelad");
}

export const Route = createFileRoute("/api/pedidos")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);
          const cut6m = new Date(now); cut6m.setMonth(cut6m.getMonth() - 6);
          const cut6mStr = cut6m.toISOString().slice(0, 10);
          const cut30d = new Date(now); cut30d.setDate(cut30d.getDate() - 30);
          const cut30dStr = cut30d.toISOString().slice(0, 10);

          const [ordersRaw, pnRaw, sellersRaw] = await Promise.all([
            sbQuery("omie_orders", {
              select: "numero_pedido,codigo_cliente_omie,codigo_vendedor_omie,valor_total_pedido,data_inclusao,etapa",
              order: "data_inclusao.desc",
              limit: "30000",
            }),
            sbQuery("PN_Omie", {
              select: "codigo_cliente_omie,razao_social,nome_fantasia",
              limit: "15000",
            }),
            sbQuery("sellers", {
              select: "omie_codigo,name",
              limit: "200",
            }),
          ]);

          const orders = ordersRaw as any[];
          const pnList = pnRaw as any[];
          const sellers = sellersRaw as any[];

          // Build client name map: prefer nome_fantasia else razao_social
          const pnMap: Record<number, string> = {};
          for (const pn of pnList) {
            const nf = String(pn.nome_fantasia ?? "").trim();
            const rs = String(pn.razao_social ?? "").trim();
            pnMap[Number(pn.codigo_cliente_omie)] = nf || rs;
          }

          // Build seller name map
          const sellerMap: Record<number, string> = {};
          for (const s of sellers) {
            sellerMap[Number(s.omie_codigo)] = String(s.name ?? "");
          }

          // Filter to last 6 months
          const orders6m = orders.filter((o) => String(o.data_inclusao ?? "").slice(0, 10) >= cut6mStr);

          // Etapa aggregation (all 6m orders)
          const etapaAgg: Record<string, { qty: number; val: number }> = {};

          // Monthly aggregation buckets
          const monthlyMap: Record<string, { pedidos: number; valor: number }> = {};
          for (let i = 5; i >= 0; i--) {
            const dt = new Date(now); dt.setMonth(dt.getMonth() - i);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
            monthlyMap[key] = { pedidos: 0, valor: 0 };
          }

          // Aging buckets for open orders only
          const agingCounts = { "0-7": 0, "8-15": 0, "16-30": 0, "31-60": 0, "60+": 0 };

          let emAberto = 0;
          let carteira = 0;
          let pedidosHoje = 0;
          let pedidos30d = 0;
          let totalValor = 0;

          // Build rows for top 300
          const pedidoRows: PedidoRow[] = [];

          for (const o of orders6m) {
            const dateStr = String(o.data_inclusao ?? "").slice(0, 10);
            const valor = Number(o.valor_total_pedido ?? 0);
            const etapa = String(o.etapa ?? "Sem etapa").slice(0, 60);
            const cid = Number(o.codigo_cliente_omie);
            const vid = Number(o.codigo_vendedor_omie);

            // Compute ageing
            const orderDate = new Date(dateStr);
            const ageingDias = Math.max(0, Math.floor((now.getTime() - orderDate.getTime()) / 86_400_000));

            totalValor += valor;

            if (dateStr === todayStr) pedidosHoje++;
            if (dateStr >= cut30dStr) pedidos30d++;

            // Etapa aggregation
            if (!etapaAgg[etapa]) etapaAgg[etapa] = { qty: 0, val: 0 };
            etapaAgg[etapa].qty++;
            etapaAgg[etapa].val += valor;

            // Monthly aggregation
            const mon = dateStr.slice(0, 7);
            if (monthlyMap[mon]) {
              monthlyMap[mon].pedidos++;
              monthlyMap[mon].valor += valor;
            }

            // Open orders
            if (isOpenEtapa(etapa)) {
              emAberto++;
              carteira += valor;

              // Aging distribution
              if (ageingDias <= 7) agingCounts["0-7"]++;
              else if (ageingDias <= 15) agingCounts["8-15"]++;
              else if (ageingDias <= 30) agingCounts["16-30"]++;
              else if (ageingDias <= 60) agingCounts["31-60"]++;
              else agingCounts["60+"]++;
            }

            // Build row (top 300 will be sliced after)
            if (pedidoRows.length < 300) {
              pedidoRows.push({
                id: String(o.numero_pedido ?? pedidoRows.length),
                numeroPedido: String(o.numero_pedido ?? ""),
                cliente: pnMap[cid] ?? `Cliente ${cid}`,
                vendedor: sellerMap[vid] ?? `Vendedor ${vid}`,
                valor: Math.round(valor),
                dataInclusao: dateStr,
                etapa,
                ageingDias,
              });
            }
          }

          const total = orders6m.length;
          const ticketMedio = total > 0 ? Math.round(totalValor / total) : 0;

          // Status distribution: top 8 etapas by count
          const statusDist: StatusDistItem[] = Object.entries(etapaAgg)
            .sort(([, a], [, b]) => b.qty - a.qty)
            .slice(0, 8)
            .map(([etapa, d], i) => ({
              key: `status-${i}`,
              etapa,
              count: d.qty,
              valor: Math.round(d.val),
              color: STATUS_COLORS[i] ?? "#9E9E9E",
            }));

          // Aging distribution
          const agingDist: AgingBucket[] = [
            { faixa: "0–7 dias",   count: agingCounts["0-7"],   color: "#2E7D32" },
            { faixa: "8–15 dias",  count: agingCounts["8-15"],  color: "#F5C400" },
            { faixa: "16–30 dias", count: agingCounts["16-30"], color: "#E65100" },
            { faixa: "31–60 dias", count: agingCounts["31-60"], color: "#C62828" },
            { faixa: "60+ dias",   count: agingCounts["60+"],   color: "#7B1FA2" },
          ];

          // Monthly evolution
          const evolucaoMensal: MonthlyItem[] = Object.entries(monthlyMap).map(([key, d]) => {
            const [, mm] = key.split("-");
            return {
              mes: PT_MONTHS[parseInt(mm, 10) - 1] ?? key,
              pedidos: d.pedidos,
              valor: Math.round(d.valor),
            };
          });

          // Etapas ciclo: all etapas, sorted by count desc, top 10
          const etapasCiclo: EtapaCicloItem[] = Object.entries(etapaAgg)
            .sort(([, a], [, b]) => b.qty - a.qty)
            .slice(0, 10)
            .map(([etapa, d]) => ({
              etapa,
              count: d.qty,
              valor: Math.round(d.val),
            }));

          const response: PedidosResponse = {
            pedidos: pedidoRows,
            kpis: {
              total,
              emAberto,
              carteira: Math.round(carteira),
              ticketMedio,
              pedidosHoje,
              pedidos30d,
            },
            statusDist,
            agingDist,
            evolucaoMensal,
            etapasCiclo,
          };

          return Response.json(response);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/pedidos]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
