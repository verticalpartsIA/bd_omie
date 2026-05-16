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
  {
    name: "buscar_ciclo_financeiro",
    description:
      "Calcula PMR (Prazo Médio de Recebimento), PMP (Prazo Médio de Pagamento), PME estimado e Ciclo Financeiro = PMR + PME - PMP. Use para 'meu ciclo financeiro está saudável?', 'demoro para receber?', 'pago antes de receber?', 'ciclo operacional'. Ciclo alto = empresa precisa de mais capital de giro.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "buscar_liquidez",
    description:
      "Calcula índices de liquidez estimados: Liquidez Corrente (CR/CP), Liquidez Imediata (caixa/CP). Use para 'tenho liquidez?', 'consigo pagar meus compromissos?', 'minha liquidez é suficiente?'. Liquidez < 1 = crítico.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "buscar_endividamento",
    description:
      "Analisa endividamento operacional e capacidade de alavancagem. Calcula Dívida Operacional (CP total), Dívida/EBITDA ratio, e capacidade de alavancagem. Use para 'posso pegar empréstimo?', 'endividamento perigoso?', 'capacidade de alavancagem', 'vale usar capital de terceiros?'.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "buscar_ponto_equilibrio",
    description:
      "Calcula o ponto de equilíbrio estimado (faturamento mínimo para cobrir custos), margem de contribuição e margem de segurança. Use para 'quanto preciso faturar?', 'ponto de equilíbrio', 'break-even', 'estou acima do equilíbrio?', 'o que acontece se a receita cair?'.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "buscar_roe_equity",
    description:
      "Analisa retorno sobre capital e geração de valor patrimonial (Equity Score). ROE e ROA são estimados — patrimônio líquido e ativos totais não estão disponíveis no sistema ainda. Retorna Equity Score qualitativo baseado em crescimento, margem, recorrência e concentração. Use para 'o negócio gera valor?', 'ROE', 'ROA', 'retorno sobre capital', 'vale manter capital neste negócio?'.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "simular_crescimento",
    description:
      "Simula cenários what-if de crescimento: impacto no caixa, NCG, estoque e risco de liquidez para crescimento de 10%, 30% ou 50%. Use SEMPRE que o usuário perguntar sobre crescer, expandir, escalar, ou 'o que preciso para crescer X%'. Retorna análise por cenário com recomendação.",
    input_schema: {
      type: "object" as const,
      properties: {
        crescimento_pct: {
          type: "number",
          description: "Percentual de crescimento a simular (ex: 30 para 30%). Se não informado, simula 10%, 30% e 50%.",
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

      case "buscar_ciclo_financeiro": {
        const [crData, cpData, ebitdaData] = await Promise.all([
          sbQuery("CR_Omie", [
            ["select", "valor_documento"],
            ["status_titulo", "in.(A RECEBER,ATRASADO)"],
            ["limit", "10000"],
          ]),
          sbQuery("CP_Omie", [
            ["select", "valor_documento"],
            ["status_titulo", "eq.A VENCER"],
            ["limit", "10000"],
          ]),
          sbQuery("vw_ebitda_12m", {
            select: "receita,margem",
            order: "mes_dt.asc",
          }),
        ]);
        const crTotal = (crData as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const cpTotal = (cpData as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const receita12m = (ebitdaData as any[]).reduce((s, r) => s + Number(r.receita ?? 0), 0);
        const margem12m  = (ebitdaData as any[]).reduce((s, r) => s + Number(r.margem  ?? 0), 0);
        const margemBrutaPct = receita12m > 0 ? (margem12m / receita12m * 100) : 35;
        const cogsAnual = receita12m * (1 - margemBrutaPct / 100);

        const pmr = receita12m > 0 ? Math.round(crTotal / (receita12m / 365)) : 0;
        const pmp = cogsAnual  > 0 ? Math.round(cpTotal / (cogsAnual  / 365)) : 0;
        const pme = 45;
        const ciclo = pmr + pme - pmp;

        const diagnostico = ciclo < 0
          ? "FAVORAVEL: fornecedores financiam o ciclo — empresa recebe antes de pagar"
          : ciclo < 30 ? "SAUDAVEL: ciclo curto, baixa necessidade de capital de giro"
          : ciclo < 60 ? "ATENCAO: ciclo moderado — monitorar prazo de recebimento"
          : "CRITICO: ciclo longo — empresa financia muitos dias com capital proprio";

        return JSON.stringify({
          pmr_dias: pmr,
          pmp_dias: pmp,
          pme_dias_estimado: pme,
          ciclo_financeiro_dias: ciclo,
          diagnostico,
          interpretacao: {
            pmr_alto: pmr > 45 ? "Clientes demoram para pagar — considere reduzir prazo de recebimento" : null,
            pmp_baixo: pmp < 30 ? "Empresa paga fornecedores muito rápido — tente negociar prazos maiores" : null,
            ciclo_impacto: `Para cada R$ 1M de aumento de receita, a empresa precisa de ~R$ ${Math.round(ciclo * 1000000 / 365).toLocaleString("pt-BR")} a mais de capital de giro`,
          },
          nota: "PME estimado em 45 dias (benchmark distribuidora de peças). PMR e PMP calculados com base em CR/CP total dividido pela taxa diária de receita/COGS.",
        });
      }

      case "buscar_liquidez": {
        const [crData, cpData, caixaData] = await Promise.all([
          sbQuery("CR_Omie", [
            ["select", "valor_documento"],
            ["status_titulo", "in.(A RECEBER,ATRASADO)"],
            ["limit", "10000"],
          ]),
          sbQuery("CP_Omie", [
            ["select", "valor_documento"],
            ["status_titulo", "eq.A VENCER"],
            ["limit", "10000"],
          ]),
          sbQuery("vw_caixa_projetado", {
            select: "saldo_d30,saldo_d90",
            limit: "1",
          }),
        ]);
        const crTotal = (crData as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const cpTotal = (cpData as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const caixa30 = (caixaData as any[])[0]?.saldo_d30 ?? 0;

        const liquidezCorrente = cpTotal > 0 ? Math.round((crTotal / cpTotal) * 100) / 100 : 9.99;
        const liquidezImediata = cpTotal > 0 ? Math.round((Math.max(0, Number(caixa30)) / cpTotal) * 100) / 100 : 0;

        const status = liquidezCorrente < 1.0 ? "CRITICO" : liquidezCorrente < 1.3 ? "ATENCAO" : "SAUDAVEL";
        const alertas: string[] = [];
        if (liquidezCorrente < 1.0) alertas.push("CRITICO: passivo circulante supera ativo circulante — empresa depende de novas vendas para honrar compromissos");
        if (liquidezCorrente < 1.3) alertas.push("ATENCAO: margem de liquidez estreita — qualquer atraso de recebimento pode pressionar pagamentos");
        if (liquidezImediata < 0.1) alertas.push("CRITICO: caixa imediato insuficiente — menos de 10% do passivo coberto por caixa disponível");

        return JSON.stringify({
          ativo_circulante_estimado: Math.round(crTotal),
          passivo_circulante_estimado: Math.round(cpTotal),
          caixa_d30: Math.round(Number(caixa30)),
          liquidez_corrente: liquidezCorrente,
          liquidez_imediata: liquidezImediata,
          status,
          alertas,
          benchmarks: {
            corrente_saudavel: ">1.3x",
            corrente_aceitavel: "1.0x a 1.3x",
            corrente_critico: "<1.0x",
            imediata_saudavel: ">0.3x",
          },
          nota: "Ativo circulante estimado = CR em aberto. Passivo circulante estimado = CP a vencer. Sem estoque valorizado, liquidez seca = liquidez corrente.",
        });
      }

      case "buscar_endividamento": {
        const [cpData, ebitdaData] = await Promise.all([
          sbQuery("CP_Omie", [
            ["select", "valor_documento"],
            ["status_titulo", "eq.A VENCER"],
            ["limit", "10000"],
          ]),
          sbQuery("vw_ebitda_12m", {
            select: "ebitda",
            order: "mes_dt.asc",
          }),
        ]);
        const cpTotal   = (cpData    as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const ebitda12m = (ebitdaData as any[]).reduce((s, r) => s + Number(r.ebitda ?? 0), 0);

        const dividaEbitda = ebitda12m > 0 ? Math.round((cpTotal / ebitda12m) * 100) / 100 : 0;
        const status = dividaEbitda > 3 ? "CRITICO" : dividaEbitda > 1.5 ? "ATENCAO" : "SAUDAVEL";

        // Capacidade de alavancagem: até 3x EBITDA é benchmark de mercado
        const capacidadeAlavancagem = Math.max(0, Math.round(ebitda12m * 3 - cpTotal));

        return JSON.stringify({
          divida_operacional: Math.round(cpTotal),
          ebitda_12m: Math.round(ebitda12m),
          divida_ebitda_ratio: dividaEbitda,
          status,
          capacidade_alavancagem_estimada: capacidadeAlavancagem,
          benchmarks: {
            saudavel: "até 1.5x EBITDA",
            atencao: "1.5x a 3.0x EBITDA",
            critico: "acima de 3.0x EBITDA",
            mercado_referencia: "Empresas de distribuição saudáveis: 0.5x a 1.5x",
          },
          interpretacao: dividaEbitda <= 1.5
            ? "Endividamento saudável. Há espaço para alavancagem estratégica — captar para estoque de alto giro, importação ou expansão pode fazer sentido se o retorno superar o custo da dívida."
            : dividaEbitda <= 3
            ? "Endividamento moderado. Antes de captar mais, priorize reduzir prazo de pagamento ou aumentar EBITDA."
            : "Endividamento elevado. Foque em reduzir dívida antes de qualquer nova alavancagem.",
          nota: "Dívida operacional = CP total a vencer. Sem dados de dívida bancária/financeira no sistema atual.",
        });
      }

      case "buscar_ponto_equilibrio": {
        const ebitdaData = await sbQuery("vw_ebitda_12m", {
          select: "mes,receita,margem,ebitda",
          order: "mes_dt.desc",
          limit: "3",
        });
        const meses = ebitdaData as any[];
        if (!meses.length) return JSON.stringify({ erro: "Sem dados de receita/EBITDA" });

        // Usa média dos últimos 3 meses completos
        const n = meses.length;
        const avgReceita = meses.reduce((s, m) => s + Number(m.receita ?? 0), 0) / n;
        const avgMargem  = meses.reduce((s, m) => s + Number(m.margem  ?? 0), 0) / n;
        const avgEbitda  = meses.reduce((s, m) => s + Number(m.ebitda  ?? 0), 0) / n;

        const margemBrutaPct = avgReceita > 0 ? (avgMargem / avgReceita * 100) : 35;
        // Custos fixos estimados = receita - ebitda (todas as despesas antes do EBITDA)
        const custosFixos = avgReceita - avgEbitda;
        const pontoEquilibrio = margemBrutaPct > 0
          ? Math.round(custosFixos / (margemBrutaPct / 100))
          : 0;
        const margemSeguranca = avgReceita > 0 && pontoEquilibrio > 0
          ? Math.round(((avgReceita - pontoEquilibrio) / avgReceita) * 1000) / 10
          : 0;
        const status = margemSeguranca > 20 ? "SAUDAVEL" : margemSeguranca > 10 ? "ATENCAO" : "CRITICO";

        return JSON.stringify({
          receita_media_3m: Math.round(avgReceita),
          ebitda_medio_3m:  Math.round(avgEbitda),
          margem_contribuicao_pct: Math.round(margemBrutaPct * 10) / 10,
          custos_fixos_estimados: Math.round(custosFixos),
          ponto_equilibrio_mensal: pontoEquilibrio,
          margem_seguranca_pct: margemSeguranca,
          status,
          interpretacao: margemSeguranca > 20
            ? `Operação com folga: receita ${margemSeguranca}% acima do equilíbrio. A empresa aguenta queda de até ${margemSeguranca}% na receita antes de entrar no vermelho.`
            : margemSeguranca > 10
            ? `Margem de segurança estreita: apenas ${margemSeguranca}% acima do ponto de equilíbrio. Monitore custos fixos.`
            : `Risco elevado: a empresa está muito próxima do equilíbrio. Qualquer queda de receita ou aumento de custo pode gerar prejuízo.`,
          nota: "Cálculo estimado. Margem de contribuição proxy = margem bruta. Custos fixos estimados = receita - EBITDA (inclui todas despesas operacionais).",
        });
      }

      case "buscar_roe_equity": {
        // ROE e ROA não disponíveis sem balanço patrimonial completo
        // Equity Score qualitativo baseado em dados disponíveis
        const ebitdaData = await sbQuery("vw_ebitda_12m", {
          select: "receita,ebitda,margem",
          order: "mes_dt.asc",
        });
        const meses = ebitdaData as any[];
        const receita12m = meses.reduce((s, m) => s + Number(m.receita ?? 0), 0);
        const ebitda12m  = meses.reduce((s, m) => s + Number(m.ebitda  ?? 0), 0);
        const margemMedia = receita12m > 0 ? Math.round((ebitda12m / receita12m) * 1000) / 10 : 0;

        // Crescimento: H2 vs H1
        const mid = Math.floor(meses.length / 2);
        const h1 = meses.slice(0, mid).reduce((s, m) => s + Number(m.receita ?? 0), 0);
        const h2 = meses.slice(mid).reduce((s, m) => s + Number(m.receita ?? 0), 0);
        const crescimentoHH = h1 > 0 ? Math.round(((h2 - h1) / h1) * 1000) / 10 : 0;

        // Equity Score: 0–100
        const scoreGrowth = crescimentoHH > 30 ? 100 : crescimentoHH > 15 ? 80 : crescimentoHH > 0 ? 60 : 30;
        const scoreMargin = margemMedia > 15 ? 100 : margemMedia > 8 ? 80 : margemMedia > 3 ? 60 : 30;
        const equityScore = Math.round((scoreGrowth * 0.5 + scoreMargin * 0.5));

        return JSON.stringify({
          roe_disponivel: false,
          roa_disponivel: false,
          motivo_indisponibilidade: "Patrimônio líquido e ativos totais não estão mapeados no sistema. Necessário integrar balanço patrimonial para calcular ROE e ROA.",
          equity_score: equityScore,
          equity_status: equityScore >= 80 ? "FORTE" : equityScore >= 60 ? "MODERADO" : "FRACO",
          dados_disponiveis: {
            receita_12m: Math.round(receita12m),
            ebitda_12m:  Math.round(ebitda12m),
            margem_ebitda_media_pct: margemMedia,
            crescimento_h2_vs_h1_pct: crescimentoHH,
          },
          interpretacao: `Equity Score ${equityScore}/100. Com crescimento de ${crescimentoHH}% e margem EBITDA de ${margemMedia}%, ${equityScore >= 70 ? "o negócio está gerando valor patrimonial — reinvestir faz sentido se o custo de capital for controlado." : "há oportunidade de melhora na geração de valor. Foque em crescimento com margem antes de buscar capital externo."}`,
          proximos_passos: ["Mapear patrimônio líquido no Supabase para calcular ROE real", "Mapear ativos totais para calcular ROA real", "Implementar tabela de balanço patrimonial"],
        });
      }

      case "simular_crescimento": {
        const [crData, cpData, ebitdaData, caixaData] = await Promise.all([
          sbQuery("CR_Omie", [
            ["select", "valor_documento"],
            ["status_titulo", "in.(A RECEBER,ATRASADO)"],
            ["limit", "10000"],
          ]),
          sbQuery("CP_Omie", [
            ["select", "valor_documento"],
            ["status_titulo", "eq.A VENCER"],
            ["limit", "10000"],
          ]),
          sbQuery("vw_ebitda_12m", {
            select: "receita,margem,ebitda",
            order: "mes_dt.asc",
          }),
          sbQuery("vw_caixa_projetado", {
            select: "saldo_d30,saldo_d90",
            limit: "1",
          }),
        ]);
        const crTotal   = (crData    as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const cpTotal   = (cpData    as any[]).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);
        const receita12m = (ebitdaData as any[]).reduce((s, m) => s + Number(m.receita ?? 0), 0);
        const ebitda12m  = (ebitdaData as any[]).reduce((s, m) => s + Number(m.ebitda  ?? 0), 0);
        const margem12m  = (ebitdaData as any[]).reduce((s, m) => s + Number(m.margem  ?? 0), 0);
        const margemBrutaPct = receita12m > 0 ? (margem12m / receita12m * 100) : 35;
        const ebitdaPct = receita12m > 0 ? (ebitda12m / receita12m * 100) : 10;
        const caixa30 = Number((caixaData as any[])[0]?.saldo_d30 ?? 0);

        const cenarios = (input.crescimento_pct ? [Number(input.crescimento_pct)] : [10, 30, 50]).map((pct) => {
          const fator = 1 + pct / 100;
          const receitaProj = Math.round(receita12m * fator);
          const ebitdaProj  = Math.round(ebitda12m  * fator * (1 - pct * 0.002)); // crescimento comprime margem ligeiramente
          const crProj      = Math.round(crTotal * fator);
          const cpProj      = Math.round(cpTotal * fator);
          const ncgProj     = crProj - cpProj;
          const ncgAtual    = crTotal - cpTotal;
          const capitalAdicional = Math.max(0, ncgProj - ncgAtual);
          const caixaRisco  = caixa30 - capitalAdicional;
          const risco       = caixaRisco < 0 ? "CRITICO" : caixaRisco < caixa30 * 0.3 ? "ALTO" : caixaRisco < caixa30 * 0.6 ? "MODERADO" : "BAIXO";

          return {
            crescimento_pct: pct,
            receita_projetada_12m: receitaProj,
            ebitda_projetado_12m:  ebitdaProj,
            ncg_projetada:         ncgProj,
            capital_adicional_necessario: capitalAdicional,
            caixa_residual_estimado: caixaRisco,
            risco,
            recomendacao: risco === "CRITICO"
              ? `Crescimento de ${pct}% requer R$ ${capitalAdicional.toLocaleString("pt-BR")} de capital adicional que o caixa atual não cobre. Só avance com captação externa ou redução de ciclo financeiro.`
              : risco === "ALTO"
              ? `Crescimento de ${pct}% é viável mas exigirá R$ ${capitalAdicional.toLocaleString("pt-BR")} de capital adicional. Prepare a estrutura de caixa antes de acelerar.`
              : `Crescimento de ${pct}% parece viável com a estrutura atual. Monitore NCG e prazo de recebimento durante a expansão.`,
          };
        });

        return JSON.stringify({
          base_atual: {
            receita_12m: Math.round(receita12m),
            ebitda_12m:  Math.round(ebitda12m),
            margem_ebitda_pct: Math.round(ebitdaPct * 10) / 10,
            margem_bruta_pct: Math.round(margemBrutaPct * 10) / 10,
            ncg_atual: Math.round(crTotal - cpTotal),
            caixa_d30: Math.round(caixa30),
          },
          cenarios,
          nota: "Simulação baseada em crescimento proporcional de receita e ciclo financeiro. NCG projetada assume mesmos prazos PMR/PMP. Capital adicional = aumento de NCG. Margem comprimida 0.2pp por ponto percentual de crescimento (efeito de escala conservador).",
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
