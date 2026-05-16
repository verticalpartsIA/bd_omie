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

export interface VendedorRow {
  id: string;
  nome: string;
  pedidos12m: number;
  receita12m: number;
  ticketMedio: number;
  clientes: number; // unique clients
  ultimoPedido: string;
}

export interface EtapaItem {
  etapa: string;
  quantidade: number;
  valor: number;
}

export interface MesVendedor {
  mes: string;
  [nome: string]: number | string;
}

export interface VendedoresKpis {
  totalPedidos12m: number;
  totalReceita12m: number;
  ticketMedio: number;
  totalVendedores: number;
  topVendedor: string;
}

export interface VendedoresResponse {
  vendedores: VendedorRow[];
  kpis: VendedoresKpis;
  etapas: EtapaItem[];
  evolucaoMensal: MesVendedor[];
  topVendedoresNomes: string[];
}

const PT_MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const EXCLUDED = ["integr", "administr", "import", "sistema", "api"];

export const Route = createFileRoute("/api/vendedores")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const now = new Date();
          const cut12 = new Date(now); cut12.setMonth(cut12.getMonth() - 12);
          const cut12str = cut12.toISOString().slice(0, 10);

          const [ordersRaw, sellersRaw] = await Promise.all([
            sbQuery("omie_orders", {
              select: "codigo_vendedor_omie,codigo_cliente_omie,valor_total_pedido,data_inclusao,etapa",
              order: "data_inclusao.desc",
              limit: "60000",
            }),
            sbQuery("sellers", {
              select: "omie_codigo,name",
              limit: "200",
            }),
          ]);

          const orders = ordersRaw as any[];
          const sellers = sellersRaw as any[];

          // Build seller name map
          const sellerMap: Record<number, string> = {};
          for (const s of sellers) {
            sellerMap[Number(s.omie_codigo)] = String(s.name ?? "");
          }

          // Filter to last 12m orders
          const orders12m = orders.filter((o) => String(o.data_inclusao ?? "").slice(0, 10) >= cut12str);

          // Aggregate per vendor
          type VAgg = { pedidos: number; revenue: number; clients: Set<number>; lastDate: string };
          const vagg: Record<number, VAgg> = {};
          const etapaAgg: Record<string, { qty: number; val: number }> = {};

          for (const o of orders12m) {
            const vid = Number(o.codigo_vendedor_omie);
            const val = Number(o.valor_total_pedido ?? 0);
            const cid = Number(o.codigo_cliente_omie);
            const dateStr = String(o.data_inclusao ?? "").slice(0, 10);
            const etapa = String(o.etapa ?? "Sem etapa").slice(0, 40);

            // Vendor aggregation
            if (vid > 0) {
              if (!vagg[vid]) vagg[vid] = { pedidos: 0, revenue: 0, clients: new Set(), lastDate: dateStr };
              vagg[vid].pedidos++;
              vagg[vid].revenue += val;
              vagg[vid].clients.add(cid);
              if (dateStr > vagg[vid].lastDate) vagg[vid].lastDate = dateStr;
            }

            // Etapa aggregation
            if (!etapaAgg[etapa]) etapaAgg[etapa] = { qty: 0, val: 0 };
            etapaAgg[etapa].qty++;
            etapaAgg[etapa].val += val;
          }

          // Build vendor rows, excluding system/integration accounts
          const vendedoresList: VendedorRow[] = Object.entries(vagg)
            .map(([vidStr, a]) => {
              const vid = Number(vidStr);
              const nome = sellerMap[vid] ?? `Vendedor ${vid}`;
              return {
                id: String(vid),
                nome,
                pedidos12m: a.pedidos,
                receita12m: Math.round(a.revenue),
                ticketMedio: a.pedidos > 0 ? Math.round(a.revenue / a.pedidos) : 0,
                clientes: a.clients.size,
                ultimoPedido: a.lastDate,
              };
            })
            .filter((v) => !EXCLUDED.some((ex) => v.nome.toLowerCase().includes(ex)))
            .sort((a, b) => b.receita12m - a.receita12m);

          const top5Nomes = vendedoresList.slice(0, 5).map((v) => v.nome);

          // Monthly evolution for top 5 (last 6 months)
          const evolucaoMap: Record<string, Record<string, number>> = {};
          for (let i = 5; i >= 0; i--) {
            const dt = new Date(now); dt.setMonth(dt.getMonth() - i);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
            const label = PT_MONTHS[dt.getMonth()];
            evolucaoMap[key] = { __label: label as unknown as number };
            for (const nome of top5Nomes) evolucaoMap[key][nome] = 0;
          }

          // Fill evolution data
          const top5VidMap: Record<number, string> = {};
          for (const v of vendedoresList.slice(0, 5)) top5VidMap[Number(v.id)] = v.nome;

          for (const o of orders12m) {
            const vid = Number(o.codigo_vendedor_omie);
            const nome = top5VidMap[vid];
            if (!nome) continue;
            const mon = String(o.data_inclusao ?? "").slice(0, 7);
            if (evolucaoMap[mon]) {
              evolucaoMap[mon][nome] = (evolucaoMap[mon][nome] ?? 0) + Number(o.valor_total_pedido ?? 0);
            }
          }

          const evolucaoMensal: MesVendedor[] = Object.values(evolucaoMap).map((m) => {
            const result: MesVendedor = { mes: String(m.__label) };
            for (const nome of top5Nomes) result[nome] = Math.round((m[nome] as number) || 0);
            return result;
          });

          // Etapas (top 8 by qty)
          const etapas: EtapaItem[] = Object.entries(etapaAgg)
            .sort(([, a], [, b]) => b.qty - a.qty)
            .slice(0, 8)
            .map(([etapa, d]) => ({ etapa, quantidade: d.qty, valor: Math.round(d.val) }));

          const totalPedidos12m = vendedoresList.reduce((s, v) => s + v.pedidos12m, 0);
          const totalReceita12m = vendedoresList.reduce((s, v) => s + v.receita12m, 0);
          const ticketMedio = totalPedidos12m > 0 ? Math.round(totalReceita12m / totalPedidos12m) : 0;

          const response: VendedoresResponse = {
            vendedores: vendedoresList,
            kpis: {
              totalPedidos12m,
              totalReceita12m,
              ticketMedio,
              totalVendedores: vendedoresList.length,
              topVendedor: vendedoresList[0]?.nome ?? "—",
            },
            etapas,
            evolucaoMensal,
            topVendedoresNomes: top5Nomes,
          };

          return Response.json(response);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/vendedores]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
