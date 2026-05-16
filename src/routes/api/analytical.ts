import { createFileRoute } from "@tanstack/react-router";

// ── Env + Supabase helper ─────────────────────────────────────────────────────

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

async function sbQuery(
  table: string,
  params: Record<string, string>,
): Promise<unknown[]> {
  const supabaseUrl = getEnv("VITE_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${table}: ${res.status} ${err.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown[]>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PT_MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const EXCLUDED_SELLERS = [
  "integração", "integraçao", "integracao",
  "administr", "import", "sistema", "api",
];

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/analytical")({
  server: {
    handlers: {
      GET: async () => {
        try {
        const now = new Date();

        const d12 = new Date(now); d12.setMonth(d12.getMonth() - 12);
        const d18 = new Date(now); d18.setMonth(d18.getMonth() - 18);
        const cut12 = d12.toISOString().slice(0, 10);
        const cut18 = d18.toISOString().slice(0, 10);

        // ── Parallel fetches ────────────────────────────────────────────
        const [ordersRaw, itemsRaw, sellersRaw, topClientsRaw] =
          await Promise.all([
            // Fetch all orders (no server-side date filter — JS handles it)
            // Reason: date column may be text type, server filter unreliable
            sbQuery("omie_orders", {
              select:
                "codigo_pedido_omie,codigo_cliente_omie,codigo_vendedor_omie,valor_total_pedido,data_inclusao",
              order: "data_inclusao.desc",
              limit: "60000",
            }),
            // Top 20K items by value (covers top products)
            // Columns: codigo (SKU), descricao, quantidade, valor_total
            sbQuery("omie_order_items", {
              select: "codigo,descricao,quantidade,valor_total",
              order: "valor_total.desc",
              limit: "20000",
            }),
            // Sellers: omie_codigo = Omie vendor ID, name = seller name
            sbQuery("sellers", {
              select: "omie_codigo,name",
              limit: "200",
            }),
            sbQuery("vw_concentracao_clientes", {
              select: "nome_cliente,receita_total",
              order: "receita_total.desc",
              limit: "10",
            }),
          ]);

        const orders = ordersRaw as any[];

        // Debug: sample the first few dates to understand the format
        const _sampleDates = orders.slice(0, 3).map((o) => o.data_inclusao);
        const _lastDates = orders.slice(-3).map((o) => o.data_inclusao);

        const orders12m = orders.filter((o) => {
          const d = o.data_inclusao;
          if (!d) return false;
          // Support both "YYYY-MM-DD..." and other ISO-like formats
          const dateStr = String(d).slice(0, 10);
          return dateStr >= cut12;
        });

        const orders18m = orders.filter((o) => {
          const d = o.data_inclusao;
          if (!d) return false;
          return String(d).slice(0, 10) >= cut18;
        });

        // ── KPIs ────────────────────────────────────────────────────────

        // Ticket médio (positive-value orders, last 12m)
        const validOrders = orders12m.filter(
          (o) => Number(o.valor_total_pedido) > 0,
        );
        const ticketMedio =
          validOrders.length > 0
            ? validOrders.reduce(
                (s, o) => s + Number(o.valor_total_pedido),
                0,
              ) / validOrders.length
            : 0;

        // Recompra (% clients with ≥2 orders, last 12m)
        const clientCount: Record<number, number> = {};
        for (const o of orders12m) {
          const c = Number(o.codigo_cliente_omie);
          clientCount[c] = (clientCount[c] ?? 0) + 1;
        }
        const totalClients = Object.keys(clientCount).length;
        const recompraClients = Object.values(clientCount).filter(
          (n) => n >= 2,
        ).length;
        const recompraPct =
          totalClients > 0
            ? Math.round((recompraClients / totalClients) * 100)
            : 0;

        // Itens por pedido (global ratio: item rows / order rows)
        const itensPorPedido =
          orders.length > 0
            ? Math.round(
                ((itemsRaw as any[]).length / orders.length) * 10,
              ) / 10
            : 0;

        // ── Sellers ─────────────────────────────────────────────────────
        const sellerMap: Record<number, string> = {};
        for (const s of sellersRaw as any[]) {
          sellerMap[Number(s.omie_codigo)] = String(s.name ?? "");
        }

        const sellerOrders: Record<number, number> = {};
        for (const o of orders12m) {
          const vid = Number(o.codigo_vendedor_omie);
          if (vid > 0) sellerOrders[vid] = (sellerOrders[vid] ?? 0) + 1;
        }

        const vendedores = Object.entries(sellerOrders)
          .map(([id, v]) => ({
            name: sellerMap[Number(id)] ?? `Vendedor ${id}`,
            v,
          }))
          .filter(
            (s) =>
              !EXCLUDED_SELLERS.some((ex) =>
                s.name.toLowerCase().includes(ex),
              ),
          )
          .sort((a, b) => b.v - a.v)
          .slice(0, 7);

        const topVendedor = vendedores[0] ?? { name: "—", v: 0 };

        // ── Top Produtos (by revenue, from item rows) ────────────────────
        const productAgg: Record<
          string,
          { desc: string; qty: number; rev: number }
        > = {};
        for (const it of itemsRaw as any[]) {
          // Real columns: codigo (SKU), descricao, quantidade, valor_total
          const sku = String(it.codigo ?? "").trim();
          if (!sku || sku === "null") continue;
          if (!productAgg[sku])
            productAgg[sku] = {
              desc: String(it.descricao ?? "").slice(0, 40),
              qty: 0,
              rev: 0,
            };
          productAgg[sku].qty += Number(it.quantidade ?? 0);
          productAgg[sku].rev += Number(it.valor_total ?? 0);
        }

        const topProdutos = Object.entries(productAgg)
          .sort(([, a], [, b]) => b.rev - a.rev)
          .slice(0, 8)
          .map(([sku, d]) => ({
            sku,
            desc: d.desc,
            qty: Math.round(d.qty),
            rev: Math.round(d.rev / 1000), // R$ mil
          }));

        // ── Sazonalidade (pedidos por mês, últimos 12m) ──────────────────
        const monthOrders: Record<string, number> = {};
        for (const o of orders12m) {
          const key = String(o.data_inclusao).slice(0, 7);
          monthOrders[key] = (monthOrders[key] ?? 0) + 1;
        }

        const seasonality: { m: string; v: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const dt = new Date(now);
          dt.setMonth(dt.getMonth() - i);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
          seasonality.push({ m: PT_MONTHS[dt.getMonth()], v: monthOrders[key] ?? 0 });
        }

        const peakMonth = seasonality.reduce(
          (a, b) => (b.v > a.v ? b : a),
          seasonality[0] ?? { m: "—", v: 0 },
        ).m;

        // ── Cohort (últimos 6 meses) ─────────────────────────────────────
        // Determine first order month per client from 18m of orders
        const clientFirstOrder: Record<number, string> = {};
        for (const o of orders18m) {
          const c = Number(o.codigo_cliente_omie);
          const mk = String(o.data_inclusao).slice(0, 7);
          if (!clientFirstOrder[c] || mk < clientFirstOrder[c]) {
            clientFirstOrder[c] = mk;
          }
        }

        const cohort: {
          mes: string;
          novos: number;
          m1?: number;
          m2?: number;
          m3?: number;
          m4?: number;
          m5?: number;
        }[] = [];

        for (let mo = 5; mo >= 0; mo--) {
          const cdt = new Date(now);
          cdt.setMonth(cdt.getMonth() - mo);
          const yr = cdt.getFullYear();
          const mn = cdt.getMonth();
          const ck = `${yr}-${String(mn + 1).padStart(2, "0")}`;

          const newIds = new Set<number>(
            Object.entries(clientFirstOrder)
              .filter(([, fk]) => fk === ck)
              .map(([id]) => Number(id)),
          );

          if (newIds.size === 0) {
            cohort.push({
              mes: `${PT_MONTHS[mn]}/${String(yr).slice(2)}`,
              novos: 0,
            });
            continue;
          }

          const retention: (number | undefined)[] = [];
          for (let r = 1; r <= 5; r++) {
            if (mo - r < 0) {
              retention.push(undefined);
              continue;
            }
            const rdt = new Date(now);
            rdt.setMonth(rdt.getMonth() - (mo - r));
            const rk = `${rdt.getFullYear()}-${String(rdt.getMonth() + 1).padStart(2, "0")}`;
            const retSet = new Set<number>(
              orders18m
                .filter(
                  (o) =>
                    String(o.data_inclusao).slice(0, 7) === rk &&
                    newIds.has(Number(o.codigo_cliente_omie)),
                )
                .map((o) => Number(o.codigo_cliente_omie)),
            );
            retention.push(retSet.size);
          }

          cohort.push({
            mes: `${PT_MONTHS[mn]}/${String(yr).slice(2)}`,
            novos: newIds.size,
            m1: retention[0],
            m2: retention[1],
            m3: retention[2],
            m4: retention[3],
            m5: retention[4],
          });
        }

        // ── Top Clientes ────────────────────────────────────────────────
        const topClientes = (topClientsRaw as any[]).map((c) => ({
          name: String(c.nome_cliente ?? "").slice(0, 25),
          v: Math.round(Number(c.receita_total ?? 0) / 1000),
        }));

        // ── Return ──────────────────────────────────────────────────────
        const mesAtual = `${PT_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

        return Response.json({
          ticketMedio: Math.round(ticketMedio),
          recompraPct,
          itensPorPedido,
          topVendedor: { nome: topVendedor.name, pedidos: topVendedor.v },
          topClientes,
          topProdutos,
          vendedores,
          seasonality,
          peakMonth,
          cohort,
          totalPedidos12m: orders12m.length,
          mesAtual,
          // Debug fields (remove after confirming data is correct)
          _debug: {
            totalOrdersFetched: orders.length,
            orders18mCount: orders18m.length,
            orders12mCount: orders12m.length,
            cut18,
            cut12,
            sampleDatesFirst: _sampleDates,
            sampleDatesLast: _lastDates,
            itemsFetched: (itemsRaw as any[]).length,
            sellersFetched: (sellersRaw as any[]).length,
          },
        });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/analytical]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
