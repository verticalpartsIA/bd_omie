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
  return PT_MONTHS[Number(mm) - 1] ?? key;
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

function categoryName(c: Row): string {
  return str(c.descricao) || str(c.descricao_categoria) || str(c.nome) || str(c.codigo);
}

function fornecedorName(f: Row): string {
  return str(f.nome_fantasia) || str(f.razao_social) || str(f.nome) || str(f.codigo_cliente_omie);
}

export const Route = createFileRoute("/api/custos-fixos" as never)({
  server: {
    handlers: {
      GET: async () => {
        try {
          const d = new Date(); d.setFullYear(d.getFullYear() - 1); const dt12m = d.toISOString().slice(0, 10);
          const currentMonth = new Date().toISOString().slice(0, 7);
          const months = monthKeys(new Date());

          const [custosRaw, categoriasRaw, fornecedoresRaw] = await Promise.all([
            sbQuery("CP_Omie", {
              select: "*",
              data_vencimento: `gte.${dt12m}`,
              and: "(codigo_categoria.not.like.2.01*,codigo_categoria.not.like.2.03*)",
              limit: "50000",
            }),
            sbQuery("omie_categorias", { select: "*", limit: "5000" }).catch(() => []),
            sbQuery("omie_fornecedores", { select: "*", limit: "20000" }).catch(() => []),
          ]);

          const categoriaMap = new Map<string, string>();
          for (const c of categoriasRaw as Row[]) categoriaMap.set(str(c.codigo), categoryName(c));

          const fornecedorMap = new Map<string, string>();
          for (const f of fornecedoresRaw as Row[]) fornecedorMap.set(str(f.codigo_cliente_omie) || str(f.codigo_fornecedor_omie) || str(f.codigo), fornecedorName(f));

          const gruposMap = new Map<string, { codigo: string; descricao: string; total12m: number; totalMesAtual: number; count: number }>();
          const fornecedorAgg = new Map<string, { id: string; nome: string; total12m: number; totalMesAtual: number; count: number }>();
          const tendenciaMap = new Map<string, Record<string, number | string>>();
          for (const key of months) tendenciaMap.set(key, { mes: monthLabel(key), total: 0 });

          let total12m = 0;
          let totalMesAtual = 0;

          for (const row of custosRaw as Row[]) {
            const codigoCategoria = str(row.codigo_categoria);
            if (codigoCategoria.startsWith("2.01") || codigoCategoria.startsWith("2.03")) continue;

            const prefix = codigoCategoria.slice(0, 4) || "N/D";
            const valor = num(row.valor_documento);
            const mes = str(row.data_vencimento).slice(0, 7);
            const descricao = categoriaMap.get(prefix) ?? categoriaMap.get(codigoCategoria) ?? prefix;

            total12m += valor;
            if (mes === currentMonth) totalMesAtual += valor;

            const grupo = gruposMap.get(prefix) ?? { codigo: prefix, descricao, total12m: 0, totalMesAtual: 0, count: 0 };
            grupo.total12m += valor;
            grupo.count += 1;
            if (mes === currentMonth) grupo.totalMesAtual += valor;
            gruposMap.set(prefix, grupo);

            const trend = tendenciaMap.get(mes);
            if (trend) {
              trend.total = Number(trend.total ?? 0) + valor;
              trend[prefix] = Number(trend[prefix] ?? 0) + valor;
            }

            const fid = str(row.codigo_cliente_fornecedor) || str(row.codigo_fornecedor_omie) || str(row.codigo_cliente_omie) || str(row.fornecedor) || "N/D";
            const nome = fornecedorMap.get(fid) ?? (str(row.nome_fantasia) || str(row.razao_social) || str(row.fornecedor) || `Fornecedor ${fid}`);
            const forn = fornecedorAgg.get(fid) ?? { id: fid, nome, total12m: 0, totalMesAtual: 0, count: 0 };
            forn.total12m += valor;
            forn.count += 1;
            if (mes === currentMonth) forn.totalMesAtual += valor;
            fornecedorAgg.set(fid, forn);
          }

          return Response.json({
            grupos: [...gruposMap.values()].sort((a, b) => b.total12m - a.total12m),
            tendencia: [...tendenciaMap.values()],
            top_fornecedores: [...fornecedorAgg.values()].sort((a, b) => b.total12m - a.total12m).slice(0, 10),
            totalMesAtual: Math.round(totalMesAtual),
            total12m: Math.round(total12m),
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[/api/custos-fixos]", msg);
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
