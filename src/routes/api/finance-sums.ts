import { createFileRoute } from "@tanstack/react-router";

// ── Env + Supabase helper (service_role — bypasses RLS) ───────────────────────

function getEnv(key: string): string {
  // @ts-ignore
  if (typeof globalThis[key] !== "undefined") return globalThis[key] as string;
  // @ts-ignore
  const metaVal = import.meta.env?.[key];
  if (metaVal) return metaVal as string;
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
  if (!res.ok) throw new Error(`${table}: ${res.status} ${(await res.text()).slice(0, 120)}`);
  return res.json() as Promise<unknown[]>;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/finance-sums")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [crRows, cpRows, inadRows] = await Promise.all([
            // CR aberto: títulos a receber + atrasados
            sbQuery("CR_Omie", {
              select: "valor_documento",
              status_titulo: "in.(A RECEBER,ATRASADO)",
              limit: "10000",
            }),
            // CP aberto: títulos a vencer
            sbQuery("CP_Omie", {
              select: "valor_documento",
              status_titulo: "eq.A VENCER",
              limit: "10000",
            }),
            // Inadimplência: só os atrasados
            sbQuery("CR_Omie", {
              select: "valor_documento",
              status_titulo: "eq.ATRASADO",
              limit: "10000",
            }),
          ]);

          const sum = (rows: unknown[]) =>
            (rows as { valor_documento: string | number | null }[]).reduce(
              (s, r) => s + Number(r.valor_documento ?? 0),
              0,
            );

          return Response.json({
            crAberto:      sum(crRows),
            cpAberto:      sum(cpRows),
            inadimplencia: sum(inadRows),
          });
        } catch (err) {
          console.error("[finance-sums]", err);
          return Response.json(
            { error: String(err), crAberto: 0, cpAberto: 0, inadimplencia: 0 },
            { status: 500 },
          );
        }
      },
    },
  },
});
