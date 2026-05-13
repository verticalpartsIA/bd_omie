import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";

// ── Supabase helper (server-side, bypasses RLS via service role) ──────────────

function getEnv(key: string): string {
  // @ts-expect-error Cloudflare Workers global
  if (typeof globalThis[key] !== "undefined") return globalThis[key] as string;
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

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_produtos_estoque_critico",
    description:
      "Retorna a lista de produtos com estoque ZERADO e demanda recente — são os itens CRÍTICOS para compra imediata. Inclui código, descrição, família, média mensal de saídas e última venda.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: {
          type: "number",
          description: "Máximo de produtos (padrão 200)",
        },
      },
    },
  },
  {
    name: "buscar_produtos_abaixo_minimo",
    description:
      "Retorna produtos com estoque abaixo do mínimo sugerido. Inclui código, descrição, quantidade atual e mínimo recomendado.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: { type: "number" },
      },
    },
  },
  {
    name: "buscar_produtos_parados",
    description:
      "Retorna produtos sem nenhuma saída nos últimos 12 meses. Útil para avaliar descontinuação ou promoção.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: { type: "number" },
      },
    },
  },
  {
    name: "buscar_inadimplencia",
    description:
      "Retorna títulos de contas a receber vencidos e em atraso. Inclui nome do cliente, valor, data de vencimento e dias de atraso.",
    input_schema: {
      type: "object" as const,
      properties: {
        dias_minimo: {
          type: "number",
          description: "Mínimo de dias em atraso (padrão 1)",
        },
        limite: { type: "number", description: "Máximo de registros (padrão 100)" },
      },
    },
  },
  {
    name: "buscar_contas_pagar",
    description:
      "Retorna contas a pagar vencendo nos próximos N dias. Inclui fornecedor, valor e data de vencimento.",
    input_schema: {
      type: "object" as const,
      properties: {
        dias: {
          type: "number",
          description: "Próximos N dias (padrão 7)",
        },
        limite: { type: "number" },
      },
    },
  },
  {
    name: "buscar_detalhes_produto",
    description:
      "Retorna detalhes completos de um produto específico: estoque atual, preço, histórico de vendas, diagnóstico.",
    input_schema: {
      type: "object" as const,
      properties: {
        codigo: {
          type: "string",
          description: "Código do produto (ex: VPEL-228)",
        },
      },
      required: ["codigo"],
    },
  },
  {
    name: "buscar_top_clientes",
    description:
      "Retorna os maiores clientes por receita nos últimos 12 meses, com nome, receita total e quantidade de títulos.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: { type: "number", description: "Quantidade de clientes (padrão 20)" },
      },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  try {
    switch (name) {
      case "buscar_produtos_estoque_critico": {
        const data = await sbQuery("vw_estoque_inteligente", {
          select:
            "codigo,descricao,descricao_familia,quantidade_estoque,media_mensal_saidas,total_vendido_12m,meses_com_venda,ultima_saida",
          diagnostico: "eq.CRÍTICO — Estoque zerado com demanda",
          order: "media_mensal_saidas.desc",
          limit: String(input.limite ?? 200),
        });
        return JSON.stringify({ total: data.length, produtos: data });
      }

      case "buscar_produtos_abaixo_minimo": {
        const data = await sbQuery("vw_estoque_inteligente", {
          select:
            "codigo,descricao,descricao_familia,quantidade_estoque,estoque_minimo_sugerido,media_mensal_saidas",
          diagnostico: "eq.Alerta — Abaixo do mínimo sugerido",
          order: "media_mensal_saidas.desc",
          limit: String(input.limite ?? 100),
        });
        return JSON.stringify({ total: data.length, produtos: data });
      }

      case "buscar_produtos_parados": {
        const data = await sbQuery("vw_estoque_inteligente", {
          select:
            "codigo,descricao,descricao_familia,quantidade_estoque,total_vendido_12m",
          diagnostico: "eq.Sem saída — avaliar descontinuar",
          order: "quantidade_estoque.desc",
          limit: String(input.limite ?? 100),
        });
        return JSON.stringify({ total: data.length, produtos: data });
      }

      case "buscar_inadimplencia": {
        const diasMin = Number(input.dias_minimo ?? 1);
        const dataCorte = new Date();
        dataCorte.setDate(dataCorte.getDate() - diasMin);
        const dataStr = dataCorte.toISOString().split("T")[0];
        const limite = Number(input.limite ?? 100);

        const cr = await sbQuery("CR_Omie", {
          select:
            "codigo_lancamento_omie,codigo_cliente_omie,valor_documento,data_vencimento,status_titulo,numero_documento_fiscal",
          status_titulo: "eq.ATRASADO",
          data_vencimento: `lt.${dataStr}`,
          order: "valor_documento.desc",
          limit: String(limite),
        });

        const codigos = [
          ...new Set((cr as any[]).map((r) => r.codigo_cliente_omie)),
        ];
        const pn =
          codigos.length > 0
            ? await sbQuery("PN_Omie", {
                select: "codigo_cliente_omie,razao_social,nome_fantasia",
                codigo_cliente_omie: `in.(${codigos.join(",")})`,
              })
            : [];
        const pnMap: Record<number, string> = {};
        for (const p of pn as any[]) {
          pnMap[p.codigo_cliente_omie] =
            p.nome_fantasia?.trim() || p.razao_social?.trim();
        }
        const today = Date.now();
        const enriched = (cr as any[]).map((r) => ({
          ...r,
          nome_cliente:
            pnMap[r.codigo_cliente_omie] ?? `Cliente ${r.codigo_cliente_omie}`,
          dias_atraso: Math.floor(
            (today - new Date(r.data_vencimento).getTime()) / 86_400_000,
          ),
        }));
        const total = enriched.reduce(
          (s, r) => s + Number(r.valor_documento),
          0,
        );
        return JSON.stringify({
          total_registros: enriched.length,
          valor_total: total.toFixed(2),
          titulos: enriched,
        });
      }

      case "buscar_contas_pagar": {
        const dias = Number(input.dias ?? 7);
        const dataFim = new Date();
        dataFim.setDate(dataFim.getDate() + dias);
        const dataStr = dataFim.toISOString().split("T")[0];
        const hoje = new Date().toISOString().split("T")[0];

        const cp = await sbQuery("CP_Omie", {
          select:
            "codigo_lancamento_omie,codigo_cliente_omie,valor_documento,data_vencimento,status_titulo",
          status_titulo: "eq.A VENCER",
          data_vencimento: `lte.${dataStr}`,
          "data_vencimento.gte": hoje,
          order: "data_vencimento.asc",
          limit: String(input.limite ?? 100),
        });

        const codigos = [
          ...new Set((cp as any[]).map((r) => r.codigo_cliente_omie)),
        ];
        const pn =
          codigos.length > 0
            ? await sbQuery("PN_Omie", {
                select: "codigo_cliente_omie,razao_social,nome_fantasia",
                codigo_cliente_omie: `in.(${codigos.join(",")})`,
              })
            : [];
        const pnMap: Record<number, string> = {};
        for (const p of pn as any[]) {
          pnMap[p.codigo_cliente_omie] =
            p.nome_fantasia?.trim() || p.razao_social?.trim();
        }
        const today = Date.now();
        const enriched = (cp as any[]).map((r) => ({
          ...r,
          nome_fornecedor:
            pnMap[r.codigo_cliente_omie] ??
            `Fornecedor ${r.codigo_cliente_omie}`,
          dias_para_vencer: Math.ceil(
            (new Date(r.data_vencimento).getTime() - today) / 86_400_000,
          ),
        }));
        const total = enriched.reduce(
          (s, r) => s + Number(r.valor_documento),
          0,
        );
        return JSON.stringify({
          total_registros: enriched.length,
          valor_total: total.toFixed(2),
          contas: enriched,
        });
      }

      case "buscar_detalhes_produto": {
        const data = await sbQuery("vw_estoque_inteligente", {
          select: "*",
          codigo: `eq.${input.codigo}`,
          limit: "1",
        });
        return JSON.stringify(data[0] ?? { erro: "Produto não encontrado" });
      }

      case "buscar_top_clientes": {
        const data = await sbQuery("vw_concentracao_clientes", {
          select: "nome_cliente,receita_total,qtd_titulos",
          order: "receita_total.desc",
          limit: String(input.limite ?? 20),
        });
        return JSON.stringify({ total: data.length, clientes: data });
      }

      default:
        return JSON.stringify({ erro: `Ferramenta desconhecida: ${name}` });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ erro: msg });
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/api/claude")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { question, context } = (await request.json()) as {
          question: string;
          context: string;
        };

        const apiKey = getEnv("ANTHROPIC_API_KEY");
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const client = new Anthropic({ apiKey });
        const messages: Anthropic.MessageParam[] = [
          { role: "user", content: question },
        ];

        // ── Phase 1: Non-streaming call with tools ──────────────────────────
        let firstResponse = await client.messages.create({
          model: "claude-haiku-4-5",
          max_tokens: 4096,
          system: context,
          tools: TOOLS,
          messages,
        });

        // ── Phase 2: Tool execution loop (max 3 rounds) ─────────────────────
        let rounds = 0;
        while (firstResponse.stop_reason === "tool_use" && rounds < 3) {
          rounds++;

          // Collect all tool use blocks
          const toolUseBlocks = firstResponse.content.filter(
            (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
          );

          // Execute all tools in parallel
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (block) => {
              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>,
              );
              return {
                type: "tool_result" as const,
                tool_use_id: block.id,
                content: result,
              };
            }),
          );

          // Add assistant turn + tool results to messages
          messages.push({ role: "assistant", content: firstResponse.content });
          messages.push({ role: "user", content: toolResults });

          // Next round
          firstResponse = await client.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 4096,
            system: context,
            tools: TOOLS,
            messages,
          });
        }

        // ── Phase 3: Stream the final answer ────────────────────────────────
        // Add the last assistant turn so final streaming starts from context
        messages.push({ role: "assistant", content: firstResponse.content });

        // If final response already has text (stop_reason=end_turn), stream it directly
        const existingText = firstResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");

        if (existingText) {
          // Encode and stream the text we already have
          const encoder = new TextEncoder();
          const readable = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode(existingText));
              controller.close();
            },
          });
          return new Response(readable, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache",
              "X-Accel-Buffering": "no",
            },
          });
        }

        // Otherwise request a fresh streaming response
        const stream = client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 2048,
          system: context,
          tools: TOOLS,
          messages,
        });

        const readable = new ReadableStream({
          async start(controller) {
            try {
              for await (const event of stream) {
                if (
                  event.type === "content_block_delta" &&
                  event.delta.type === "text_delta"
                ) {
                  controller.enqueue(
                    new TextEncoder().encode(event.delta.text),
                  );
                }
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
          },
        });
      },
    },
  },
});
