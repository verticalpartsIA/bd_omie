import { createFileRoute } from "@tanstack/react-router";

// ── Env + Supabase helper ─────────────────────────────────────────────────────

function getEnv(key: string): string {
  // 1. Cloudflare Workers: variáveis vinculadas como globais
  // @ts-ignore
  if (typeof globalThis[key] !== "undefined") return globalThis[key] as string;
  // 2. Vite dev server: import.meta.env (exposto via envPrefix no vite.config)
  // @ts-ignore
  const metaVal = import.meta.env?.[key];
  if (metaVal) return metaVal as string;
  // 3. Node.js process.env (fallback)
  return (process.env[key] as string) ?? "";
}

async function sbQuery(
  table: string,
  params: Record<string, string>,
): Promise<unknown[]> {
  const url = new URL(
    `${getEnv("VITE_SUPABASE_URL")}/rest/v1/${encodeURIComponent(table)}`,
  );
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), {
    headers: {
      apikey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      Authorization: `Bearer ${getEnv("SUPABASE_SERVICE_ROLE_KEY")}`,
    },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${(await res.text()).slice(0, 100)}`);
  return res.json() as Promise<unknown[]>;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/tv")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const now = new Date();
          const cut2h = new Date(now.getTime() - 2 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 19);
          const today = now.toISOString().slice(0, 10);

          // Parallel fetches: recent orders + recent NFs + critical stock
          const [ordersRaw, nfRaw, criticoRaw] = await Promise.all([
            // Last 20 orders (no date filter — order by desc, grab recent)
            sbQuery("omie_orders", {
              select:
                "codigo_pedido_omie,codigo_cliente_omie,valor_total_pedido,data_inclusao,etapa,numero_pedido",
              order: "data_inclusao.desc",
              limit: "20",
            }),
            // Today's NFs
            sbQuery("omie_nfe_emitidas", {
              select: "codigo_nfe_omie,numero_nf,valor_total_nf,data_emissao",
              data_emissao: `gte.${today}`,
              order: "data_emissao.desc",
              limit: "10",
            }).catch(() => []), // graceful: table may be sparse
            // Critical stock items
            sbQuery("vw_estoque_inteligente", {
              select:
                "codigo,descricao,descricao_familia,media_mensal_saidas,quantidade_estoque",
              diagnostico: "eq.CRÍTICO — Estoque zerado com demanda",
              order: "media_mensal_saidas.desc",
              limit: "6",
            }),
          ]);

          // Enrich orders with client names
          const orders = ordersRaw as any[];
          const clientIds = [...new Set(orders.map((o) => o.codigo_cliente_omie))].filter(Boolean);

          const pnRaw =
            clientIds.length > 0
              ? await sbQuery("PN_Omie", {
                  select: "codigo_cliente_omie,razao_social,nome_fantasia",
                  codigo_cliente_omie: `in.(${clientIds.join(",")})`,
                }).catch(() => [])
              : [];

          const pnMap: Record<number, string> = {};
          for (const p of pnRaw as any[]) {
            pnMap[Number(p.codigo_cliente_omie)] =
              (p.nome_fantasia?.trim() || p.razao_social?.trim() || "").slice(0, 28);
          }

          const recentOrders = orders.slice(0, 12).map((o) => ({
            id: Number(o.codigo_pedido_omie),
            numero: String(o.numero_pedido ?? o.codigo_pedido_omie ?? ""),
            cliente: pnMap[Number(o.codigo_cliente_omie)] ?? `Cliente ${o.codigo_cliente_omie}`,
            valor: Number(o.valor_total_pedido ?? 0),
            hora: o.data_inclusao ? String(o.data_inclusao).slice(11, 16) : "--:--",
            etapa: String(o.etapa ?? ""),
            dataRaw: String(o.data_inclusao ?? ""),
          }));

          const nfRecentes = (nfRaw as any[]).slice(0, 5).map((n) => ({
            id: Number(n.codigo_nfe_omie),
            numero: String(n.numero_nf ?? ""),
            valor: Number(n.valor_total_nf ?? 0),
            hora: today,
          }));

          const criticos = (criticoRaw as any[]).map((c) => ({
            codigo: String(c.codigo ?? ""),
            descricao: String(c.descricao ?? "").slice(0, 30),
            familia: String(c.descricao_familia ?? ""),
            media: Number(c.media_mensal_saidas ?? 0),
          }));

          return Response.json({
            recentOrders,
            nfRecentes,
            criticos,
            criticoCount: criticos.length, // from the query limit; real count would need a separate COUNT
            serverTime: now.toISOString(),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/tv]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
