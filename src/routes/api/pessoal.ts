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

type Row = Record<string, unknown>;

const PT_MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function str(v: unknown): string {
  return String(v ?? "").trim();
}

function num(v: unknown): number {
  return Number(v ?? 0) || 0;
}

function monthLabel(key: string): string {
  const [, mm] = key.split("-");
  const idx = Number(mm) - 1;
  return PT_MONTHS[idx] ?? key;
}

function pnName(p: Row): string {
  return (str(p.nome_fantasia) || str(p.razao_social) || str(p.nome) || `PN ${str(p.codigo_cliente_omie)}`).slice(0, 80);
}

function categoryName(c: Row): string {
  return str(c.descricao) || str(c.descricao_categoria) || str(c.nome) || str(c.codigo);
}

function classifyCost(codigo: string, descricao: string): "salarios" | "encargos" | "beneficios" {
  const txt = `${codigo} ${descricao}`.toLowerCase();
  if (/(benef|vale|aliment|refei|transp|plano|saude|saúde|seguro|cesta)/.test(txt)) return "beneficios";
  if (/(encarg|inss|fgts|irrf|impost|provis|rescis|ferias|férias|13)/.test(txt)) return "encargos";
  return "salarios";
}

function monthKeys(now: Date): string[] {
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export const Route = createFileRoute("/api/pessoal" as never)({
  server: {
    handlers: {
      GET: async () => {
        try {
          const d = new Date(); d.setFullYear(d.getFullYear() - 1); const dt12m = d.toISOString().slice(0, 10);
          const currentMonth = new Date().toISOString().slice(0, 7);
          const months = monthKeys(new Date());

          const [
            funcionariosPlain,
            funcionariosAccent,
            prestadoresRaw,
            vendedoresPnRaw,
            custosRaw,
            categoriasRaw,
            ordersVendedorRaw,
          ] = await Promise.all([
            sbQuery("PN_Omie", { select: "*", tags_raw: "ilike.*Funcionario*", limit: "5000" }).catch(() => []),
            sbQuery("PN_Omie", { select: "*", tags_raw: "ilike.*Funcionário*", limit: "5000" }).catch(() => []),
            sbQuery("PN_Omie", { select: "*", tags_raw: "ilike.*Prestadora*", limit: "5000" }).catch(() => []),
            sbQuery("PN_Omie", { select: "*", tags_raw: "ilike.*Vendedor*", limit: "5000" }).catch(() => []),
            sbQuery("CP_Omie", {
              select: "*",
              codigo_categoria: "like.2.03*",
              data_vencimento: `gte.${dt12m}`,
              limit: "50000",
            }),
            sbQuery("omie_categorias", { select: "*", codigo: "like.2.03*", limit: "2000" }).catch(() => []),
            sbQuery("omie_orders", {
              select: "vendedor,valor_total_pedido,data_inclusao",
              data_inclusao: `gte.${dt12m}`,
              limit: "60000",
            }).catch(() =>
              sbQuery("omie_orders", {
                select: "codigo_vendedor_omie,valor_total_pedido,data_inclusao",
                data_inclusao: `gte.${dt12m}`,
                limit: "60000",
              }).catch(() => []),
            ),
          ]);

          const funcionariosMap = new Map<string, Row>();
          for (const row of [...(funcionariosPlain as Row[]), ...(funcionariosAccent as Row[])]) {
            funcionariosMap.set(str(row.codigo_cliente_omie) || pnName(row), row);
          }

          const funcionarios = [...funcionariosMap.values()].map((p) => ({
            id: str(p.codigo_cliente_omie) || pnName(p),
            nome: pnName(p),
            documento: str(p.cnpj_cpf),
            cidade: str(p.cidade),
            uf: str(p.estado),
            tags: str(p.tags_raw),
          }));

          const prestadores = (prestadoresRaw as Row[]).map((p) => ({
            id: str(p.codigo_cliente_omie) || pnName(p),
            nome: pnName(p),
            documento: str(p.cnpj_cpf),
            cidade: str(p.cidade),
            uf: str(p.estado),
            tags: str(p.tags_raw),
          }));

          const categoriaMap = new Map<string, string>();
          for (const c of categoriasRaw as Row[]) categoriaMap.set(str(c.codigo), categoryName(c));

          const catAgg = new Map<string, { codigo: string; descricao: string; total12m: number; totalMesAtual: number; tipo: string }>();
          const trend = new Map<string, { mes: string; total: number; salarios: number; encargos: number; beneficios: number }>();
          for (const key of months) trend.set(key, { mes: monthLabel(key), total: 0, salarios: 0, encargos: 0, beneficios: 0 });

          let total12m = 0;
          let totalMesAtual = 0;

          for (const row of custosRaw as Row[]) {
            const codigo = str(row.codigo_categoria);
            const descricao = categoriaMap.get(codigo) ?? str(row.descricao_categoria) ?? codigo;
            const valor = num(row.valor_documento);
            const mes = str(row.data_vencimento).slice(0, 7);
            const tipo = classifyCost(codigo, descricao);

            total12m += valor;
            if (mes === currentMonth) totalMesAtual += valor;

            const cat = catAgg.get(codigo) ?? { codigo, descricao, total12m: 0, totalMesAtual: 0, tipo };
            cat.total12m += valor;
            if (mes === currentMonth) cat.totalMesAtual += valor;
            catAgg.set(codigo, cat);

            const t = trend.get(mes);
            if (t) {
              t.total += valor;
              t[tipo] += valor;
            }
          }

          const vendedoresPnMap = new Map((vendedoresPnRaw as Row[]).map((p) => [str(p.codigo_cliente_omie), pnName(p)]));
          const sellerAgg = new Map<string, { nome: string; total12m: number; totalMesAtual: number; pedidos12m: number; pedidosMesAtual: number }>();
          for (const o of ordersVendedorRaw as Row[]) {
            const rawId = str(o.vendedor) || str(o.codigo_vendedor_omie) || "Sem vendedor";
            const nome = vendedoresPnMap.get(rawId) ?? rawId;
            const valor = num(o.valor_total_pedido);
            const mes = str(o.data_inclusao).slice(0, 7);
            const item = sellerAgg.get(nome) ?? { nome, total12m: 0, totalMesAtual: 0, pedidos12m: 0, pedidosMesAtual: 0 };
            item.total12m += valor;
            item.pedidos12m += 1;
            if (mes === currentMonth) {
              item.totalMesAtual += valor;
              item.pedidosMesAtual += 1;
            }
            sellerAgg.set(nome, item);
          }

          // ── Turnover: filtra rescisões (2.03.04) do custosRaw já carregado ─────
          const RESCISAO_CODE = "2.03.04";
          const turnoverMes = new Map<string, number>();
          let turnoverTotal = 0;
          let turnoverEventos = 0;
          for (const row of custosRaw as Row[]) {
            const codigo = str(row.codigo_categoria);
            if (!codigo.startsWith(RESCISAO_CODE)) continue;
            const valor = num(row.valor_documento);
            const mes = str(row.data_vencimento).slice(0, 7);
            turnoverTotal += valor;
            turnoverEventos += 1;
            turnoverMes.set(mes, (turnoverMes.get(mes) ?? 0) + valor);
          }
          const turnoverPorMes = months.map((key) => ({
            mes: monthLabel(key),
            rescisoes: Math.round(turnoverMes.get(key) ?? 0),
          }));

          return Response.json({
            funcionarios,
            prestadores,
            custosPessoalCategorias: [...catAgg.values()].sort((a, b) => b.total12m - a.total12m),
            tendenciaMensal: [...trend.values()],
            vendedores: [...sellerAgg.values()].sort((a, b) => b.total12m - a.total12m),
            totalMesAtual: Math.round(totalMesAtual),
            total12m: Math.round(total12m),
            turnoverTotal: Math.round(turnoverTotal),
            turnoverEventos,
            turnoverPorMes,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/pessoal]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
