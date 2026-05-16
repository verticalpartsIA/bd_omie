import { createFileRoute } from "@tanstack/react-router";

// ── Supabase helper ───────────────────────────────────────────────────────────

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

// ── Types ─────────────────────────────────────────────────────────────────────

export type StatusCliente = "ativo" | "novo" | "em_risco" | "inativo";
export type RFMSegmento = "champion" | "loyal" | "potential" | "em_risco" | "novo" | "inativo";

export interface ClienteRow {
  id: string;
  codigo: string;
  nome: string;
  cidade: string;
  uf: string;
  cnpj: string;
  totalPedidos: number;
  receitaTotal: number;
  ticketMedio: number;
  diasSemComprar: number;
  status: StatusCliente;
  rfmR: number; // 1-3
  rfmF: number;
  rfmM: number;
  rfmSegmento: RFMSegmento;
}

export interface ClientesKpis {
  baseAtiva: number;
  baseInativa: number;
  emRisco: number;
  receitaTotal: number;
  ticketMedio: number;
  concentracaoTop10: number;
  ltvMedio: number;
  totalClientes: number;
}

export interface RFMDist {
  key: RFMSegmento;
  segmento: string;
  count: number;
  color: string;
  receitaTotal: number;
}

export interface ClientesResponse {
  clientes: ClienteRow[];
  kpis: ClientesKpis;
  rfmDist: RFMDist[];
  concentracaoPareto: { pos: number; nome: string; receita: number; acumuladoPct: number }[];
  top10: { id: string; nome: string; receita: number; pctTotal: number }[];
  mesesNovos: { mes: string; novos: number }[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

export const RFM_COLORS: Record<RFMSegmento, string> = {
  champion:  "#F5C400",
  loyal:     "#2E7D32",
  potential: "#0288D1",
  em_risco:  "#E65100",
  novo:      "#7B1FA2",
  inativo:   "#9E9E9E",
};

export const RFM_LABELS: Record<RFMSegmento, string> = {
  champion:  "Campeão",
  loyal:     "Fiel",
  potential: "Potencial",
  em_risco:  "Em Risco",
  novo:      "Novo",
  inativo:   "Inativo",
};

const PT_MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function rfmSegmento(r: number, f: number): RFMSegmento {
  if (r === 3 && f === 3) return "champion";
  if ((r >= 2 && f === 3) || (r === 3 && f === 2)) return "loyal";
  if (r === 1 && f >= 2) return "em_risco";
  if (r === 3 && f === 1) return "novo";
  if (r >= 2 && f >= 1) return "potential";
  return "inativo";
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/clientes")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const now = new Date();
          const cut18 = new Date(now); cut18.setMonth(cut18.getMonth() - 18);
          const cut18str = cut18.toISOString().slice(0, 10);
          const cut12 = new Date(now); cut12.setMonth(cut12.getMonth() - 12);
          const cut12str = cut12.toISOString().slice(0, 10);

          const [ordersRaw, pnRaw] = await Promise.all([
            sbQuery("omie_orders", {
              select: "codigo_cliente_omie,valor_total_pedido,data_inclusao",
              order: "data_inclusao.desc",
              limit: "60000",
            }),
            sbQuery("PN_Omie", {
              select: "codigo_cliente_omie,razao_social,nome_fantasia,cidade,estado,cnpj_cpf",
              limit: "15000",
            }),
          ]);

          const orders = ordersRaw as any[];
          const pnList = pnRaw as any[];

          // Build PN map
          const pnMap: Record<number, { nome: string; cidade: string; uf: string; cnpj: string }> = {};
          for (const p of pnList) {
            const id = Number(p.codigo_cliente_omie);
            pnMap[id] = {
              nome: (p.nome_fantasia?.trim() || p.razao_social?.trim() || `Cliente ${id}`).slice(0, 40),
              cidade: String(p.cidade ?? "").slice(0, 30),
              uf: String(p.estado ?? "").slice(0, 2),
              cnpj: String(p.cnpj_cpf ?? ""),
            };
          }

          // Aggregate orders per client
          type Agg = { count12: number; countAll: number; revenue: number; lastDate: string; firstDate: string };
          const agg: Record<number, Agg> = {};
          for (const o of orders) {
            const cid = Number(o.codigo_cliente_omie);
            if (!cid) continue;
            const dateStr = String(o.data_inclusao ?? "").slice(0, 10);
            const val = Number(o.valor_total_pedido ?? 0);
            if (!agg[cid]) agg[cid] = { count12: 0, countAll: 0, revenue: 0, lastDate: dateStr, firstDate: dateStr };
            const a = agg[cid];
            a.countAll++;
            a.revenue += val;
            if (dateStr > a.lastDate) a.lastDate = dateStr;
            if (dateStr < a.firstDate) a.firstDate = dateStr;
            if (dateStr >= cut12str) a.count12++;
          }

          // Build client list
          const today = now.toISOString().slice(0, 10);
          const allRevenues: number[] = Object.values(agg).map((a) => a.revenue).sort((a, b) => a - b);
          const p33 = allRevenues[Math.floor(allRevenues.length * 0.33)] ?? 0;
          const p66 = allRevenues[Math.floor(allRevenues.length * 0.66)] ?? 0;

          const clienteRows: ClienteRow[] = [];
          const totalReceita = Object.values(agg).reduce((s, a) => s + a.revenue, 0);

          for (const [cidStr, a] of Object.entries(agg)) {
            const cid = Number(cidStr);
            const dias = Math.floor((new Date(today).getTime() - new Date(a.lastDate).getTime()) / 86_400_000);
            const isNew = a.countAll <= 2 && a.firstDate >= cut12str;

            let status: StatusCliente;
            if (isNew && dias < 90) status = "novo";
            else if (dias < 90) status = "ativo";
            else if (dias < 180) status = "em_risco";
            else status = "inativo";

            const rfmR = dias <= 30 ? 3 : dias <= 90 ? 2 : 1;
            const rfmF = a.count12 >= 5 ? 3 : a.count12 >= 2 ? 2 : 1;
            const rfmM = a.revenue > p66 ? 3 : a.revenue > p33 ? 2 : 1;
            const seg = rfmSegmento(rfmR, rfmF);

            clienteRows.push({
              id: String(cid),
              codigo: String(cid),
              nome: pnMap[cid]?.nome ?? `Cliente ${cid}`,
              cidade: pnMap[cid]?.cidade ?? "",
              uf: pnMap[cid]?.uf ?? "",
              cnpj: pnMap[cid]?.cnpj ?? "",
              totalPedidos: a.countAll,
              receitaTotal: Math.round(a.revenue),
              ticketMedio: a.countAll > 0 ? Math.round(a.revenue / a.countAll) : 0,
              diasSemComprar: dias,
              status,
              rfmR,
              rfmF,
              rfmM,
              rfmSegmento: seg,
            });
          }

          // Sort by revenue desc, take top 500 for list
          clienteRows.sort((a, b) => b.receitaTotal - a.receitaTotal);
          const top500 = clienteRows.slice(0, 500);

          // KPIs
          const baseAtiva = clienteRows.filter((c) => c.status === "ativo" || c.status === "novo").length;
          const baseInativa = clienteRows.filter((c) => c.status === "inativo").length;
          const emRisco = clienteRows.filter((c) => c.status === "em_risco").length;
          const ticketMedio = clienteRows.length > 0
            ? Math.round(clienteRows.reduce((s, c) => s + c.ticketMedio, 0) / clienteRows.length)
            : 0;
          const top10Rev = clienteRows.slice(0, 10).reduce((s, c) => s + c.receitaTotal, 0);
          const concentracaoTop10 = totalReceita > 0 ? Math.round((top10Rev / totalReceita) * 100) : 0;
          const ltvMedio = clienteRows.length > 0
            ? Math.round(totalReceita / clienteRows.length)
            : 0;

          // RFM distribution
          const rfmDistMap: Record<RFMSegmento, { count: number; rev: number }> = {
            champion: { count: 0, rev: 0 }, loyal: { count: 0, rev: 0 },
            potential: { count: 0, rev: 0 }, em_risco: { count: 0, rev: 0 },
            novo: { count: 0, rev: 0 }, inativo: { count: 0, rev: 0 },
          };
          for (const c of clienteRows) {
            rfmDistMap[c.rfmSegmento].count++;
            rfmDistMap[c.rfmSegmento].rev += c.receitaTotal;
          }
          const rfmDist: RFMDist[] = (Object.keys(rfmDistMap) as RFMSegmento[]).map((k) => ({
            key: k,
            segmento: RFM_LABELS[k],
            count: rfmDistMap[k].count,
            color: RFM_COLORS[k],
            receitaTotal: Math.round(rfmDistMap[k].rev),
          }));

          // Concentração pareto (top 20)
          let acum = 0;
          const concentracaoPareto = clienteRows.slice(0, 20).map((c, i) => {
            acum += c.receitaTotal;
            return {
              pos: i + 1,
              nome: c.nome.slice(0, 20),
              receita: c.receitaTotal,
              acumuladoPct: totalReceita > 0 ? Math.round((acum / totalReceita) * 100) : 0,
            };
          });

          // Top 10
          const top10 = clienteRows.slice(0, 10).map((c) => ({
            id: c.id,
            nome: c.nome,
            receita: c.receitaTotal,
            pctTotal: totalReceita > 0 ? Math.round((c.receitaTotal / totalReceita) * 100) : 0,
          }));

          // Novos clientes por mês (last 12m)
          const mesesNovosMap: Record<string, number> = {};
          for (const o of orders) {
            const cid = Number(o.codigo_cliente_omie);
            const a = agg[cid];
            if (!a) continue;
            const firstMon = a.firstDate.slice(0, 7);
            if (firstMon >= cut12str.slice(0, 7) && a.firstDate === String(o.data_inclusao ?? "").slice(0, 10)) {
              mesesNovosMap[firstMon] = (mesesNovosMap[firstMon] ?? 0) + 1;
            }
          }
          const mesesNovos: { mes: string; novos: number }[] = [];
          for (let i = 11; i >= 0; i--) {
            const dt = new Date(now); dt.setMonth(dt.getMonth() - i);
            const k = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
            mesesNovos.push({ mes: PT_MONTHS[dt.getMonth()], novos: mesesNovosMap[k] ?? 0 });
          }

          const response: ClientesResponse = {
            clientes: top500,
            kpis: {
              baseAtiva, baseInativa, emRisco,
              receitaTotal: Math.round(totalReceita),
              ticketMedio, concentracaoTop10, ltvMedio,
              totalClientes: clienteRows.length,
            },
            rfmDist,
            concentracaoPareto,
            top10,
            mesesNovos,
          };

          return Response.json(response);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/clientes]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
