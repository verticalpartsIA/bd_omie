import { createFileRoute } from "@tanstack/react-router";
import Anthropic from "@anthropic-ai/sdk";

// ── Supabase helper (server-side, bypasses RLS via service role) ──────────────

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
  params: Record<string, string> | Array<[string, string]>,
): Promise<unknown[]> {
  const supabaseUrl = getEnv("VITE_SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const url = new URL(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}`);
  // Usa append (não set) para suportar chaves duplicadas como dois filtros em data_vencimento
  const entries = Array.isArray(params) ? params : Object.entries(params);
  for (const [k, v] of entries) url.searchParams.append(k, v);
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
      "Retorna contas a pagar vencendo nos próximos N dias OU em uma data específica. Use 'data_especifica' (formato YYYY-MM-DD) para perguntas como 'quanto pago na segunda dia 18/05'. Use 'dias' para janelas como 'essa semana' ou 'próximos 30 dias'. Inclui nome do fornecedor, valor e data de vencimento.",
    input_schema: {
      type: "object" as const,
      properties: {
        dias: {
          type: "number",
          description: "Próximos N dias a partir de hoje (padrão 7). Use para janelas como 'essa semana', 'próximos 30 dias'.",
        },
        data_especifica: {
          type: "string",
          description: "Data exata no formato YYYY-MM-DD. Use quando o usuário perguntar sobre um dia específico, ex: 2026-05-18 para 'segunda dia 18/05'.",
        },
        limite: { type: "number", description: "Máximo de registros (padrão 100)" },
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
  {
    name: "buscar_mix_familias",
    description:
      "Retorna o mix de vendas por família de produto nos últimos 12 meses (volume de unidades vendidas por categoria). Use para responder perguntas sobre 'Mix por Categoria', participação de cada família, quais categorias vendem mais, etc.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: { type: "number", description: "Máximo de famílias (padrão 15)" },
      },
    },
  },
  {
    name: "buscar_evolucao_receita",
    description:
      "Retorna a evolução mensal de receita, EBITDA e margem dos últimos 12 meses para análise de tendências e comparação YoY.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "buscar_historico_compras",
    description:
      "Retorna o histórico de compras (NF-e entrada, tipo='E') de um ou mais produtos: última data de compra, preço unitário pago, fornecedor e quantidade. Use SEMPRE que discutir compras, reposição de estoque, custo de produto, lista de compras ou importação — mesmo que o usuário não tenha pedido explicitamente. Isso é o diferencial de um CFO de elite: trazer o custo histórico sem precisar ser solicitado.",
    input_schema: {
      type: "object" as const,
      properties: {
        codigos: {
          type: "array",
          items: { type: "string" },
          description: "Lista de códigos de produto (ex: ['VPEL-228', 'VPEL-401']). Pode ser um único código em array.",
        },
        limite_por_produto: {
          type: "number",
          description: "Quantas compras mostrar por produto (padrão 3, para ver evolução de preço)",
        },
      },
      required: ["codigos"],
    },
  },
  {
    name: "buscar_dre_resumo",
    description:
      "Retorna o DRE (Demonstrativo de Resultado) resumido dos últimos 12 meses: receita, EBITDA e margem por mês, com totais e crescimento. Use para análise de tendência, sazonalidade, crescimento YoY e diagnóstico de resultado.",
    input_schema: {
      type: "object" as const,
      properties: {
        meses: {
          type: "number",
          description: "Quantos meses retornar (padrão 12)",
        },
      },
    },
  },
  {
    name: "buscar_caixa_estrategico",
    description:
      "Retorna a projeção de caixa D+30 e D+90 com entradas previstas (CR a receber), saídas previstas (CP a pagar) e saldo líquido. Use para perguntas sobre saúde de caixa, liquidez, capacidade de pagamento, risco de insolvência, 'estou bem de caixa?', 'o caixa aguenta?'.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "buscar_ncg_estimado",
    description:
      "Calcula a NCG (Necessidade de Capital de Giro) = CR_aberto - CP_aberto, com os três componentes separados. Use para perguntas sobre capital de giro, ciclo financeiro, liquidez operacional, 'quanto capital preciso para girar o negócio?'.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "buscar_curva_abc_produtos",
    description:
      "Classifica produtos por Curva ABC baseado em volume de saídas nos últimos 12 meses. Classe A = top 80% do volume (poucos produtos, alto giro), B = próximos 15%, C = restantes 5% (baixo giro). Use para priorização de compras, análise de portfólio, decisões de estoque e descontinuação.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: {
          type: "number",
          description: "Máximo de produtos por classe (padrão 50)",
        },
        classe: {
          type: "string",
          description: "Filtrar por classe específica: 'A', 'B' ou 'C'. Se omitido, retorna todas as classes.",
        },
      },
    },
  },
  {
    name: "buscar_risco_clientes",
    description:
      "Análise de risco combinada por cliente: concentração de receita (pct da receita total) + saldo inadimplente em aberto. Calcula nível de risco: CRITICO, ALTO, MODERADO ou BAIXO. Use para gestão de carteira, análise de crédito, 'qual cliente é mais arriscado', 'quem concentra receita e ainda deve'.",
    input_schema: {
      type: "object" as const,
      properties: {
        limite: {
          type: "number",
          description: "Máximo de clientes a retornar (padrão 20)",
        },
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
        const hoje = new Date().toISOString().split("T")[0];
        let dataInicio = hoje;
        let dataFimStr: string;

        if (input.data_especifica && typeof input.data_especifica === "string") {
          // Busca só naquele dia específico
          dataInicio = input.data_especifica;
          dataFimStr = input.data_especifica;
        } else {
          const dias = Number(input.dias ?? 7);
          const dataFim = new Date();
          dataFim.setDate(dataFim.getDate() + dias);
          dataFimStr = dataFim.toISOString().split("T")[0];
        }

        const cp = await sbQuery("CP_Omie", [
          ["select", "codigo_lancamento_omie,codigo_cliente_omie,valor_documento,data_vencimento,status_titulo"],
          ["status_titulo", "eq.A VENCER"],
          ["data_vencimento", `gte.${dataInicio}`],
          ["data_vencimento", `lte.${dataFimStr}`],
          ["order", "data_vencimento.asc"],
          ["limit", String(input.limite ?? 100)],
        ]);

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
          periodo: input.data_especifica
            ? `Dia específico: ${dataInicio}`
            : `De ${dataInicio} até ${dataFimStr}`,
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

      case "buscar_mix_familias": {
        // Fetch all products with family + sales volume, then group in JS
        const data = await sbQuery("vw_estoque_inteligente", {
          select: "descricao_familia,total_vendido_12m,media_mensal_saidas,quantidade_estoque",
          limit: "5000",
        });
        const byFamily: Record<string, { volume: number; media: number; qtd_skus: number; skus_zerados: number }> = {};
        for (const row of data as any[]) {
          const f = (row.descricao_familia as string)?.trim() || "Sem categoria";
          if (!byFamily[f]) byFamily[f] = { volume: 0, media: 0, qtd_skus: 0, skus_zerados: 0 };
          byFamily[f].volume += Number(row.total_vendido_12m ?? 0);
          byFamily[f].media  += Number(row.media_mensal_saidas ?? 0);
          byFamily[f].qtd_skus += 1;
          if (Number(row.quantidade_estoque ?? 0) <= 0) byFamily[f].skus_zerados += 1;
        }
        const totalVol = Object.values(byFamily).reduce((s, v) => s + v.volume, 0);
        const sorted = Object.entries(byFamily)
          .sort(([, a], [, b]) => b.volume - a.volume)
          .slice(0, Number(input.limite ?? 15))
          .map(([familia, v]) => ({
            familia,
            volume_12m: Math.round(v.volume),
            media_mensal: Math.round(v.media),
            participacao_pct: totalVol > 0 ? Math.round((v.volume / totalVol) * 1000) / 10 : 0,
            qtd_skus: v.qtd_skus,
            skus_zerados: v.skus_zerados,
          }));
        return JSON.stringify({
          nota: "Volume em unidades vendidas (não R$) — proxy de participação por família",
          total_volume_12m: Math.round(totalVol),
          familias: sorted,
        });
      }

      case "buscar_evolucao_receita": {
        const data = await sbQuery("vw_ebitda_12m", {
          select: "mes,mes_dt,receita,margem,ebitda",
          order: "mes_dt.asc",
        });
        return JSON.stringify({ meses: data.length, historico: data });
      }

      case "buscar_historico_compras": {
        const codigos = (input.codigos as string[]) ?? [];
        const limitePorProd = Number(input.limite_por_produto ?? 3);
        if (codigos.length === 0) {
          return JSON.stringify({ erro: "Informe ao menos um código de produto" });
        }

        // Busca NF-e de entrada para cada produto, ordenado pela data mais recente
        const resultados: Record<string, unknown[]> = {};
        await Promise.all(
          codigos.map(async (codigo) => {
            const rows = await sbQuery("omie_nfe_itens", {
              select: "codigo_produto,descricao,data_emissao,valor_unitario,quantidade,nome_parceiro,numero_nfe",
              tipo: "eq.E",
              codigo_produto: `eq.${codigo.trim()}`,
              order: "data_emissao.desc",
              limit: String(limitePorProd),
            }).catch(() => [] as unknown[]);
            resultados[codigo] = rows;
          }),
        );

        // Enriquece com custo médio ponderado das últimas compras e variação de preço
        const enriched = Object.entries(resultados).map(([codigo, rows]) => {
          const compras = (rows as any[]).map((r) => ({
            data: r.data_emissao,
            preco_unitario: Number(r.valor_unitario),
            quantidade: Number(r.quantidade),
            fornecedor: r.nome_parceiro ?? "—",
            numero_nfe: r.numero_nfe,
            descricao: r.descricao,
          }));
          const ultima = compras[0] ?? null;
          const penultima = compras[1] ?? null;
          const variacao_pct = ultima && penultima && penultima.preco_unitario > 0
            ? Math.round(((ultima.preco_unitario - penultima.preco_unitario) / penultima.preco_unitario) * 1000) / 10
            : null;
          return {
            codigo,
            descricao: ultima?.descricao ?? codigo,
            ultima_compra: ultima?.data ?? null,
            ultimo_preco_unitario_brl: ultima?.preco_unitario ?? null,
            ultimo_fornecedor: ultima?.fornecedor ?? null,
            variacao_pct_vs_anterior: variacao_pct,
            nota: "Preços em BRL conforme NF-e de entrada. Para produtos importados, o custo total inclui frete internacional (8-15%), seguro (0,5%), II, IPI, ICMS, PIS/COFINS — total landed cost tipicamente 40-70% acima do valor FOB/CIF.",
            historico: compras,
          };
        });

        return JSON.stringify({
          total_produtos: enriched.length,
          aviso: "Use os preços históricos para estimar custo atual. Produtos BST/Monarch/Fermator são importados — aplique correção cambial (USD/BRL do dia da compra vs hoje) e adicione custos de importação.",
          produtos: enriched,
        });
      }

      case "buscar_dre_resumo": {
        const data = await sbQuery("vw_ebitda_12m", {
          select: "mes,mes_dt,receita,margem,ebitda",
          order: "mes_dt.asc",
          limit: String(input.meses ?? 12),
        });
        const rows = data as any[];
        const totalReceita = rows.reduce((s, r) => s + Number(r.receita ?? 0), 0);
        const totalEbitda  = rows.reduce((s, r) => s + Number(r.ebitda  ?? 0), 0);
        const margemMedia  = totalReceita > 0 ? (totalEbitda / totalReceita * 100) : 0;
        const primeiroMes  = rows[0]?.receita ? Number(rows[0].receita) : 0;
        const ultimoMes    = rows[rows.length - 1]?.receita ? Number(rows[rows.length - 1].receita) : 0;
        const crescimento  = rows.length >= 2 && primeiroMes > 0
          ? Math.round(((ultimoMes - primeiroMes) / primeiroMes) * 1000) / 10
          : null;
        return JSON.stringify({
          resumo: {
            total_receita_12m: Math.round(totalReceita),
            total_ebitda_12m:  Math.round(totalEbitda),
            margem_ebitda_media_pct: Math.round(margemMedia * 10) / 10,
            crescimento_receita_periodo_pct: crescimento,
          },
          meses: rows,
        });
      }

      case "buscar_caixa_estrategico": {
        const data = await sbQuery("vw_caixa_projetado", {
          select: "data_base,entradas_d30,saidas_d30,saldo_d30,entradas_d90,saidas_d90,saldo_d90",
          limit: "1",
        });
        const row = (data as any[])[0] ?? null;
        if (!row) return JSON.stringify({ erro: "View vw_caixa_projetado sem dados" });
        const alertas: string[] = [];
        const s30 = Number(row.saldo_d30 ?? 0);
        const s90 = Number(row.saldo_d90 ?? 0);
        const e30 = Number(row.entradas_d30 ?? 0);
        const p30 = Number(row.saidas_d30 ?? 0);
        if (s30 < 0)           alertas.push("CRITICO: saldo D+30 negativo — risco de insolvência em 30 dias");
        if (s90 < 0)           alertas.push("ALERTA: saldo D+90 negativo — risco de caixa no trimestre");
        if (e30 > 0 && p30 > e30 * 1.2) alertas.push("ATENCAO: saídas D+30 superam entradas em mais de 20%");
        if (s30 > 0 && s30 < p30 * 0.1) alertas.push("ATENCAO: saldo D+30 cobre menos de 10% das saídas previstas");
        return JSON.stringify({ ...row, alertas_automaticos: alertas });
      }

      case "buscar_ncg_estimado": {
        const [crData, cpData] = await Promise.all([
          sbQuery("CR_Omie", [
            ["select", "valor_documento,status_titulo"],
            ["status_titulo", "in.(A RECEBER,ATRASADO)"],
            ["limit", "10000"],
          ]),
          sbQuery("CP_Omie", [
            ["select", "valor_documento,status_titulo"],
            ["status_titulo", "eq.A VENCER"],
            ["limit", "10000"],
          ]),
        ]);
        const cr_total = (crData as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const cp_total = (cpData as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const ncg = cr_total - cp_total;
        const alertas: string[] = [];
        if (ncg > cr_total * 0.6)  alertas.push("NCG elevada: empresa financia o ciclo com capital próprio — risco de squeeze de caixa");
        if (ncg < 0)               alertas.push("NCG negativa: fornecedores financiam o ciclo — posição de capital de giro favorável");
        if (cr_total > cp_total * 3) alertas.push("CR muito maior que CP: verifique inadimplência — parte do CR pode não se converter em caixa");
        return JSON.stringify({
          cr_total_aberto: Math.round(cr_total),
          cp_total_aberto: Math.round(cp_total),
          ncg_estimado: Math.round(ncg),
          nota: "NCG calculado como CR_aberto - CP_aberto. Para NCG completo (com estoque monetário), inclua o valor de custo do estoque via ERP.",
          alertas_automaticos: alertas,
        });
      }

      case "buscar_curva_abc_produtos": {
        const data = await sbQuery("vw_estoque_inteligente", {
          select: "codigo,descricao,descricao_familia,total_vendido_12m,media_mensal_saidas,quantidade_estoque",
          order: "total_vendido_12m.desc",
          limit: "5000",
        });
        const rows = data as any[];
        const totalVol = rows.reduce((s, r) => s + Number(r.total_vendido_12m ?? 0), 0);
        let cumVol = 0;
        const classificados = rows.map((r) => {
          cumVol += Number(r.total_vendido_12m ?? 0);
          const pct = totalVol > 0 ? cumVol / totalVol : 0;
          const curva = pct <= 0.80 ? "A" : pct <= 0.95 ? "B" : "C";
          return {
            codigo:        r.codigo,
            descricao:     r.descricao,
            familia:       r.descricao_familia,
            volume_12m:    Math.round(Number(r.total_vendido_12m ?? 0)),
            media_mensal:  Math.round(Number(r.media_mensal_saidas ?? 0)),
            estoque_atual: Number(r.quantidade_estoque ?? 0),
            curva,
          };
        });
        const filtroClasse = typeof input.classe === "string" ? input.classe.toUpperCase() : null;
        const limite = Number(input.limite ?? 50);
        const filtrados = filtroClasse
          ? classificados.filter((r) => r.curva === filtroClasse).slice(0, limite)
          : classificados.slice(0, limite);
        const dist = { A: 0, B: 0, C: 0 };
        for (const r of classificados) dist[r.curva as "A" | "B" | "C"]++;
        return JSON.stringify({
          total_produtos: classificados.length,
          distribuicao: dist,
          total_volume_12m: Math.round(totalVol),
          nota: "Volume em unidades saídas. A = top 80% do volume (maior giro). B = 80-95%. C = 95-100% (baixo giro).",
          produtos: filtrados,
        });
      }

      case "buscar_risco_clientes": {
        const limite = Number(input.limite ?? 20);
        const [concData, crData] = await Promise.all([
          sbQuery("vw_concentracao_clientes", {
            select: "codigo_cliente_omie,nome_cliente,receita_total,qtd_titulos,pct_receita",
            order: "receita_total.desc",
            limit: String(limite),
          }),
          sbQuery("CR_Omie", [
            ["select", "codigo_cliente_omie,valor_documento,status_titulo"],
            ["status_titulo", "eq.ATRASADO"],
            ["limit", "10000"],
          ]),
        ]);
        const inadMap: Record<number, number> = {};
        for (const r of crData as any[]) {
          const cid = Number(r.codigo_cliente_omie);
          inadMap[cid] = (inadMap[cid] ?? 0) + Number(r.valor_documento ?? 0);
        }
        const enriched = (concData as any[]).map((c) => {
          const inadVal = inadMap[Number(c.codigo_cliente_omie)] ?? 0;
          const recTotal = Number(c.receita_total ?? 0);
          const inadPct  = recTotal > 0 ? Math.round((inadVal / recTotal) * 1000) / 10 : 0;
          const nivelRisco = inadPct > 20 ? "CRITICO" : inadPct > 5 ? "ALTO" : inadVal > 0 ? "MODERADO" : "BAIXO";
          return { ...c, inadimplencia_valor: Math.round(inadVal), inadimplencia_pct_receita: inadPct, nivel_risco: nivelRisco };
        });
        return JSON.stringify({
          total_clientes_analisados: enriched.length,
          clientes: enriched.sort((a: any, b: any) => b.receita_total - a.receita_total),
        });
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
        const { question, context, history } = (await request.json()) as {
          question: string;
          context: string;
          history?: { role: "user" | "assistant"; content: string }[];
        };

        const apiKey = getEnv("ANTHROPIC_API_KEY");
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const client = new Anthropic({ apiKey });

        // Monta histórico completo: turnos anteriores + nova pergunta
        // Garante alternância user/assistant válida para a API Anthropic
        const priorTurns: Anthropic.MessageParam[] = (history ?? [])
          .filter((m) => m.content.trim() !== "")
          .map((m) => ({ role: m.role, content: m.content }));

        const messages: Anthropic.MessageParam[] = [
          ...priorTurns,
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
