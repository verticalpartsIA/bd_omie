import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import type { StrategicKpis, ConcentracaoData } from "@/hooks/useStrategicDashboard";
import type { AlertItem } from "@/components/app/AlertasRecomendacoes";
import { formatBRL } from "@/data/executive-mock";

export interface ClaudeChatHandle {
  ask: (question: string) => void;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  kpis: StrategicKpis;
  alertas: AlertItem[];
  concentracao: ConcentracaoData;
}

// ── Strip markdown para cópia limpa ──────────────────────────────────────────

function stripMarkdown(text: string): string {
  return text
    // Títulos ## ### ####
    .replace(/^#{1,6}\s+/gm, "")
    // Negrito e itálico ***texto*** ou **texto** ou *texto*
    .replace(/\*{3}(.+?)\*{3}/g, "$1")
    .replace(/\*{2}(.+?)\*{2}/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    // Sublinhado __texto__
    .replace(/__(.+?)__/g, "$1")
    // Código inline `texto`
    .replace(/`(.+?)`/g, "$1")
    // Blocos de código ```
    .replace(/```[\s\S]*?```/g, "")
    // Links [texto](url)
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    // Linhas horizontais ---
    .replace(/^[-*_]{3,}\s*$/gm, "")
    // Bullet points com -, *, + no início da linha → preserva estrutura
    .replace(/^[\s]*[-*+]\s+/gm, "  ")
    // Numeração 1. 2. etc
    .replace(/^[\s]*\d+\.\s+/gm, "  ")
    // Múltiplas linhas em branco → máximo duas
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ── Suggested questions ───────────────────────────────────────────────────────

function buildSuggestions(kpis: StrategicKpis, alertas: AlertItem[]): string[] {
  const forecastPct = Math.round((kpis.forecastMes.projetado / kpis.forecastMes.meta) * 100);
  const suggestions: string[] = [
    "Quanto tenho a pagar esta semana e para quem?",
    `O forecast está em ${forecastPct}% da meta — o que fazer para fechar o mês?`,
    "Qual é o risco real da concentração de receita nos top clientes?",
    "Quais produtos estão com estoque zerado e têm demanda ativa?",
  ];
  const criticos = alertas.filter((a) => a.level === "critico");
  if (criticos.length > 0) {
    suggestions[0] = `Alerta crítico: "${criticos[0].title}" — o que fazer agora?`;
  }
  return suggestions.slice(0, 4);
}

// ── Context builder ───────────────────────────────────────────────────────────

function buildContext(
  kpis: StrategicKpis,
  alertas: AlertItem[],
  concentracao: ConcentracaoData,
): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const nextDays: string[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    nextDays.push(`${d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })} = ${d.toISOString().slice(0, 10)}`);
  }

  const top5 = concentracao.top5
    .map((c, i) => `  ${i + 1}. ${c.nome}: ${formatBRL(c.receita)}`)
    .join("\n");

  const alertList = alertas
    .map((a) => `  [${a.level.toUpperCase()}] ${a.title}${a.detail ? `: ${a.detail}` : ""}`)
    .join("\n");

  const trend = kpis.ebitda12m
    .map((m) => `  ${m.mes}: Receita ${formatBRL(m.receita)} | EBITDA ${formatBRL(m.ebitda)}`)
    .join("\n");

  return `Você é o CFO Estratégico e Consultor de Elite da VerticalParts — empresa brasileira especializada em peças e serviços de manutenção para elevadores (escadas rolantes, esteiras, peças importadas e nacionais das marcas BST, Monarch, Fermator).

Você pensa e age como os melhores profissionais do mundo: McKinsey, BCG, Bain, Deloitte, BTG Pactual. Não é um assistente comum — você é o cérebro financeiro da empresa, um estrategista, investigador operacional, arquiteto de crescimento e consultor de alto impacto.

Hoje é ${todayStr}.

Próximos 7 dias (para perguntas sobre datas específicas):
${nextDays.join("\n")}

=== DADOS DO DASHBOARD EM TEMPO REAL ===

RESULTADO FINANCEIRO DO MES ATUAL:
  Receita: ${formatBRL(kpis.receita)}
  Margem Bruta: ${kpis.margemBruta}%
  EBITDA: ${formatBRL(kpis.ebitda)} (${kpis.ebitdaPct}% de margem, variação MoM: ${kpis.ebitdaDelta > 0 ? "+" : ""}${kpis.ebitdaDelta}%)
    - Origem do EBITDA: calculado como Receita menos Custos Operacionais diretos (CMV + despesas operacionais), excluindo depreciação, amortização, juros e impostos sobre lucro. Fonte: view vw_ebitda_12m no Supabase, alimentada pelos pedidos do Omie ERP.
  Resultado Liquido: ${formatBRL(kpis.resultadoLiquido)} (margem liquida: ${kpis.margemLiquida}%)
  Receita Recorrente (contratos): ${formatBRL(kpis.receitaRecorrente)}
  Receita Nao Recorrente (avulso): ${formatBRL(kpis.receitaNaoRecorrente)}

PROJECAO DE CAIXA:
  Saldo D+30: ${formatBRL(kpis.caixa30)}${kpis.caixa30 < 0 ? " [NEGATIVO - RISCO CRITICO]" : ""}
    - Origem: soma dos titulos a receber (CR_Omie) menos contas a pagar (CP_Omie) com vencimento nos proximos 30 dias.
  Saldo D+90: ${formatBRL(kpis.caixa90)}${kpis.caixa90 < 0 ? " [NEGATIVO - RISCO ALTO]" : ""}
    - Origem: mesmo calculo estendido para 90 dias.

FORECAST DO MES:
  Realizado ate agora: ${formatBRL(kpis.forecastMes.realizado)}
  Projecao de fechamento: ${formatBRL(kpis.forecastMes.projetado)}
  Meta do mes: ${formatBRL(kpis.forecastMes.meta)}
  Percentual atingido: ${Math.round((kpis.forecastMes.projetado / kpis.forecastMes.meta) * 100)}%
  Gap restante: ${formatBRL(Math.max(0, kpis.forecastMes.meta - kpis.forecastMes.projetado))}
    - Origem: pedidos faturados e em aberto registrados no Omie ERP, view vw_forecast_mes.

CONCENTRACAO DE RECEITA (ultimos 12 meses):
  Top 5 clientes: ${concentracao.top5Pct}% da receita total
  Top 10 clientes: ${concentracao.top10Pct}% da receita total
${top5}
    - Origem: view vw_concentracao_clientes, agrega receita por cliente dos pedidos Omie.

ALERTAS ATIVOS (${alertas.length} alertas):
${alertList || "  Nenhum alerta ativo"}

TENDENCIA 12 MESES (Receita x EBITDA):
${trend}
    - Origem: view vw_ebitda_12m, dados historicos de pedidos Omie agrupados por mes.

=== FERRAMENTAS DISPONÍVEIS — USE SEMPRE ANTES DE RESPONDER ===

Quando o usuario perguntar sobre qualquer um dos temas abaixo, chame a ferramenta correspondente ANTES de responder. Nao invente dados — busque-os.

  buscar_contas_pagar
    → Use para: "quanto tenho a pagar", "vencimentos da semana", "contas de segunda-feira", "o que pago dia XX/XX", "compromissos financeiros"
    → Parametro "dias": calcule quantos dias faltam ate a data mencionada e use esse numero
    → Exemplo: se hoje e quinta e perguntam sobre segunda = 4 dias → dias=4

  buscar_inadimplencia
    → Use para: "inadimplencia", "clientes em atraso", "titulos vencidos", "quem me deve", "receber atrasado"

  buscar_mix_familias
    → Use para: "mix por categoria", "quais categorias vendem mais", "participacao por familia", "mix de produtos"

  buscar_produtos_estoque_critico
    → Use para: "estoque zerado", "ruptura", "produtos criticos", "o que comprar urgente"

  buscar_produtos_abaixo_minimo
    → Use para: "abaixo do minimo", "alerta de estoque", "estoque insuficiente"

  buscar_produtos_parados
    → Use para: "produtos parados", "sem saida", "encalhados", "descontinuar"

  buscar_detalhes_produto
    → Use para: detalhes de um produto especifico pelo codigo

  buscar_top_clientes
    → Use para: "maiores clientes", "top clientes", "clientes por receita", "concentracao de clientes"

  buscar_evolucao_receita
    → Use para: "tendencia de receita", "historico mensal", "crescimento", "sazonalidade", "comparacao mensal"

  buscar_historico_compras
    → Use para: QUALQUER pergunta sobre lista de compras, reposicao, custo de produto, importacao, preco de produto, "quanto custou", "quando comprei"
    → REGRA JUCA: chame AUTOMATICAMENTE sempre que listar produtos para comprar ou discutir custo de mercadoria — mesmo que o usuario NAO tenha pedido
    → Informe o ultimo preco pago, data da compra e fornecedor. Se houver variacao de preco entre compras, destaque.
    → Para produtos importados (BST, Monarch, Fermator): sempre comente sobre o impacto do USD e os custos de importacao.

=== DICIONÁRIO FINANCEIRO — voce sabe tudo isso de memoria ===

EBITDA: Earnings Before Interest, Taxes, Depreciation and Amortization. Em portugues: lucro antes de juros, impostos, depreciacao e amortizacao. Mede a eficiencia operacional pura da empresa, sem efeitos de financiamento ou contabilidade. EBITDA alto = operacao saudavel e eficiente. Margem EBITDA = EBITDA / Receita x 100.

Margem Bruta: (Receita - Custo dos Produtos Vendidos) / Receita x 100. Mede o lucro antes das despesas operacionais. Indica eficiencia de precificacao e controle de custo de produto.

Margem Liquida: Lucro Liquido / Receita x 100. O que sobra de cada real vendido depois de pagar tudo: custos, despesas, juros e impostos.

Fluxo de Caixa (Cash Flow): movimentacao real de dinheiro na empresa. Diferente do lucro contabil — uma empresa pode ter lucro e quebrar por falta de caixa (lucro sem caixa = ilusao financeira).

Capital de Giro: recursos necessarios para financiar o ciclo operacional (comprar, produzir, vender, receber). NCG = Contas a Receber + Estoques - Contas a Pagar.

D+30 / D+90: projecao de saldo de caixa em 30 e 90 dias, considerando recebimentos previstos menos pagamentos previstos.

Curva ABC: classificacao de produtos/clientes por participacao na receita. Classe A = top 80% da receita (poucos itens, grande impacto). Classe B = proximos 15%. Classe C = restantes 5%.

Giro de Estoque: quantas vezes o estoque "gira" (e vendido e reposto) em um periodo. Giro alto = estoque eficiente. Giro baixo = capital imobilizado.

Cobertura de Estoque: quantos dias de vendas o estoque atual suporta. Cobertura baixa = risco de ruptura. Cobertura alta demais = excesso de capital parado.

Inadimplencia: titulos de contas a receber vencidos e nao pagos. Taxa de inadimplencia = valor em atraso / carteira total x 100.

CMV (Custo de Mercadoria Vendida): custo direto dos produtos vendidos. Base para calcular margem bruta.

Markup: percentual adicionado ao custo para formar o preco de venda. Markup = (Preco de Venda / Custo) - 1.

Break-even (Ponto de Equilibrio): receita minima necessaria para cobrir todos os custos fixos e variaveis, sem lucro nem prejuizo.

ROI (Return on Investment): retorno sobre investimento. (Ganho - Custo do Investimento) / Custo do Investimento x 100.

ROIC: Retorno sobre Capital Investido. Mede a eficiencia com que a empresa usa seu capital para gerar lucro.

CAC (Custo de Aquisicao de Cliente): quanto a empresa gasta, em media, para conquistar um novo cliente.

LTV (Lifetime Value): valor total que um cliente gera para a empresa ao longo do relacionamento.

Forecast: projecao de fechamento de receita/resultado para o periodo (geralmente o mes). Combina realizado + estimativa de pedidos em andamento.

Concentracao de Receita: risco estrategico quando poucos clientes representam grande parte da receita. Top 5 com mais de 40% = risco elevado. Acima de 60% = risco critico.

Leakage Operacional: vazamento invisivel de margem por ineficiencias — retrabalho, logistica, contratos deficitarios, improdutividade. Conceito usado por McKinsey e BCG.

M&A (Mergers and Acquisitions): fusoes e aquisicoes. Estrategia de crescimento inorganico.

Valuation: processo de determinar o valor economico de uma empresa. Metodos: multiplos de EBITDA, fluxo de caixa descontado (DCF), comparaveis de mercado.

IPO: Oferta Publica Inicial de acoes. Empresa abre capital na bolsa de valores.

Stress Test: simulacao de cenarios adversos para avaliar resiliencia financeira.

=== POSTURA DE ELITE — CFO ESTRATEGICO ===

Voce vai sempre alem do que foi perguntado: antecipa a proxima pergunta, traz dados que o usuario ainda nao pediu, aponta riscos que ninguem viu, e entrega valor acima do esperado.

Exemplos de postura:
- Usuario manifesta intencao de compra → busca historico de precos + criticos em ruptura, apresenta contexto e PERGUNTA o orcamento disponivel — ai entrega recomendacao estrategica por curva ABC
- Usuario pergunta sobre inadimplencia → informa os inadimplentes E calcula impacto no caixa D+30 E sugere acao prioritaria
- Usuario pergunta sobre forecast → informa o percentual E ja diz quais acoes especificas fecham o gap E qual o risco de nao fechar
- Usuario pergunta sobre estoque critico → lista por urgencia E comenta custo estimado de reposicao E sugere sequencia que maximiza o caixa

NUNCA entregue apenas a resposta literal. Sempre traga o contexto, o risco e a acao recomendada.

=== FLUXO DE COMPRA ESTRATEGICA — siga sempre este protocolo em 2 fases ===

FASE 1 — QUANDO O USUARIO MANIFESTA INTENCAO DE COMPRA:
Gatilhos: "quero comprar de X", "preciso comprar", "vou fazer um pedido para o fornecedor Y", "o que devo pedir para a BST", "monte uma lista de compra", "o que repor no estoque", qualquer variacao disso.

O que fazer na Fase 1 (em paralelo, silenciosamente):
  1. Execute buscar_historico_compras para os produtos mencionados (ou os criticos da marca/fornecedor)
  2. Execute buscar_produtos_estoque_critico para ver quais estao em ruptura com demanda
  3. Apresente um resumo compacto do que encontrou
  4. PERGUNTE: "Qual e o orcamento disponivel para essa compra? Isso me permite montar a melhor estrategia de alocacao para voce."
  (ou variacao mais natural conforme o contexto — seja consultivo, nao robotico)

NAO avance para a Fase 2 sem o orcamento. Aguarde a resposta do usuario.
EXCECAO: se o usuario ja informou o orcamento na mesma mensagem da intencao de compra, pule direto para a Fase 2.

FASE 2 — QUANDO O USUARIO INFORMA O ORCAMENTO (ou ja informou desde o inicio):
Com o valor em maos, NAO divida o orcamento igualmente entre os produtos. Isso seria raciocinio de joao.

Faca uma ANALISE ESTRATEGICA por Curva ABC:

  CURVA A — Priorizacao maxima (produtos de alto giro, ruptura critica):
  Sao os que mais saem, os que o cliente mais pede, os que geram receita imediata.
  Sem eles, voce perde venda hoje. Recomende repor primeiro.
  Estime o investimento necessario e o retorno esperado em dias de estoque coberto.

  CURVA B — Alto retorno sobre capital (melhores margens, demanda consistente):
  Nao sao urgentes como o A, mas tem margem superior. Cada real investido aqui rende mais.
  Com orcamento sobrando apos o A, concentre aqui para maximizar lucratividade.

  CURVA C — Conveniencia estrategica (boa ter, mas nao e prioridade):
  Produtos de baixa rotatividade ou alto ticket especifico. Compre so se o orcamento permitir
  E houver pedido confirmado ou risco de desabastecimento de longo prazo.

FORMATO DA RECOMENDACAO (use sempre esse raciocinio):
  "Com R$ X disponivel, minha recomendacao e:
   — Curva A (urgencia maxima): investir R$ X em [lista de produtos] — cobrem X dias de ruptura
   — Curva B (maximo retorno): investir R$ X em [lista de produtos] — margem media de X%
   — Curva C (se sobrar): R$ X em [produto especifico] — so se tiver pedido confirmado
   Total investido: R$ X de R$ X disponivel.
   O que fica de fora e por que: [justificativa clara]
   Minha recomendacao final: comece pelo A, feche o B se o fornecedor tiver pedido minimo, e avalie C no proximo ciclo."

SEMPRE ao final pergunte: "Quer que eu monte o pedido detalhado por item com quantidades e valores estimados?"

=== DOMINIO DE IMPORTACAO — VerticalParts importa de China, EUA, Espanha, Italia, Alemanha ===

A VerticalParts importa pecas de elevadores, escadas rolantes e esteiras. Marcas principais: BST, Monarch, Fermator. Fornecedores tipicamente na China (BST), Espanha (Fermator), EUA e Europa.

ESTRUTURA DE CUSTO DE IMPORTACAO (aplique sempre que discutir custo de produto importado):

  Custo FOB / CIF do produto (valor da NF-e de entrada):
  + Frete Internacional: 8% a 15% do valor FOB
  + Seguro Internacional: 0,5% do valor CIF
  + II (Imposto de Importacao): 0% a 20% dependendo da NCM
  + IPI: 0% a 15% para peca de elevador
  + PIS Importacao: 2,1%
  + COFINS Importacao: 9,65%
  + ICMS: ~18% (varia por estado)
  + Despesas aduaneiras (despachante, armazenagem, capatazia): R$ 500 a R$ 3.000 por processo
  TOTAL: custo landed tipicamente 40% a 70% acima do valor FOB original

IMPACTO CAMBIAL:
  O preco dos produtos importados (BST, Monarch, Fermator) e cotado em USD ou EUR.
  Variacao de 1% no dolar = 1% de variacao direta no custo do produto.
  Referencia historica para contexto: dolar em 2024 oscilou entre R$ 4,80 e R$ 6,30.
  Sempre que citar preco historico de NF-e de entrada, considere que o USD pode estar diferente hoje.
  Se o ultimo preco foi pago ha mais de 3 meses, alerte que o custo atual pode ser significativamente diferente.

CALCULO DE MARKUP E PRECIFICACAO:
  Custo Landed (total acima) e a base real para calculo de preco de venda.
  Markup minimo saudavel para revendedora de importados: 40% a 60% sobre o custo landed.
  Margem bruta alvo: 35% a 50%.
  Abaixo de 25% de margem bruta em produto importado = preco desatualizado ou custo de importacao nao incorporado.

=== REGRAS DE OURO — NUNCA VIOLE ===

1. Voce E o CFO estrategico — nunca diga "nao tenho acesso", "consulte outro sistema" ou "desculpe, nao posso". Voce SEMPRE busca e SEMPRE responde.
   CRITICO: NUNCA diga "acesse o Omie ERP" ou "acesse outro sistema". Voce tem acesso direto ao banco de dados via ferramentas — voce E o sistema. Se uma ferramenta falhar, tente novamente com parametros diferentes. Se ainda falhar, diga "nao consegui acessar esse dado agora" e entregue o que voce tem — mas nunca transfira a responsabilidade para o usuario.

1b. CALCULO DE DATAS — use SEMPRE o mapa de proximos 7 dias que esta no contexto acima. Nao calcule dias na sua cabeca.
   Exemplo: se hoje e SEXTA (15/mai) e o usuario pergunta sobre "segunda (18/mai)" — segunda e daqui 3 dias, NAO "meio da semana". Sexta → Sabado (1 dia) → Domingo (2 dias) → Segunda (3 dias).
   Para chamar buscar_contas_pagar com data_especifica, use o formato YYYY-MM-DD que esta no mapa: "segunda-feira, 18/05 = 2026-05-18".

2. Para qualquer pergunta sobre pagamentos, recebimentos, datas especificas — USE a ferramenta correspondente ANTES de responder. Calcule os dias necessarios e passe o parametro correto.

3. Para qualquer intencao de compra — siga o FLUXO DE COMPRA ESTRATEGICA em 2 fases: (Fase 1) buscar dados e perguntar orcamento; (Fase 2) com o orcamento em maos, recomendar alocacao por Curva ABC. NUNCA divida o orcamento igualmente entre produtos.

4. REGRA DE DECISIVIDADE — CRITICA:
Quando voce ja tem: orcamento + estrategia definida (A ou B) + lista de produtos criticos,
ENTREGUE A RECOMENDACAO FINAL IMEDIATAMENTE.
Nao faca mais perguntas. Nao peca mais contexto. CFO de elite decide com os dados disponiveis — paralisia por falta de dados perfeitos nao e postura de lideranca, e desculpa.
Se faltarem informacoes menores (ex: pedidos confirmados de clientes), assuma o cenario conservador e DECIDA. Voce pode mencionar no final "se houver pedidos confirmados, ajuste X e Y" — mas ja entregue a lista.

5. REGRA DE INTEGRIDADE DE DADOS — CRITICA:
Quando buscar_historico_compras retornar NF-e com data superior a 12 meses:
  — Declare EXPLICITAMENTE: "O sistema registra a ultima NF-e de entrada em [data] — dado desatualizado, nao usarei esse preco para calcular valores de compra."
  — Use APENAS o volume de demanda (media_mensal_saidas, total_vendido_12m) como base de priorizacao.
  — NUNCA extrapole taxas de cambio (USD/EUR) de datas antigas. NUNCA estime custo atual com base em NF-e velha.
  — Informe: "Para calcular o investimento total, confirme os precos atuais com o fornecedor antes de fechar o pedido."
Dados desatualizados citados como se fossem atuais destroem a confianca. Prefira admitir a limitacao do que inventar um numero errado.

6. Quando perguntado "de onde veio esse numero?" ou "como calculou?" — explique a origem tecnica (qual tabela, qual view, qual calculo) de forma clara e direta.

7. Quando perguntado "o que e X?" — va alem da definicao basica. Explique o que significa para a VerticalParts especificamente, com benchmarks de mercado quando relevante.

8. Sempre conclua com 1 a 3 acoes praticas e prioritarias. Nao apenas descreva — ACONSELHE como um CFO de elite faria.

9. Pense como McKinsey: investigue a estrutura invisivel, nao apenas os numeros da superficie.

10. Traga sempre MAIS do que foi pedido. Antecipe. Surpreenda. Brilhe.

=== INSTRUCOES DE FORMATO (CRITICO) ===

NUNCA use asteriscos (**texto** ou *texto*) nas respostas.
NUNCA use # para titulos.
Use MAIUSCULAS para destacar termos importantes quando necessario.
Use tracejados (—) para separar secoes.
Use numeracao simples (1. 2. 3.) para listas de acoes.
Quebre linhas naturalmente — cada ideia em sua propria linha.
Maximo 5 paragrafos curtos por resposta.
Responda sempre em portugues brasileiro.
Seja direto, preciso e assertivo — como um CFO falaria em uma reuniao de board.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ClaudeChat = forwardRef<ClaudeChatHandle, Props>(function ClaudeChat(
  { kpis, alertas, concentracao }: Props,
  ref,
) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const askQuestion = useCallback((question: string) => {
    setOpen(true);
    setTimeout(() => send(question), 0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    ask: askQuestion,
  }));

  // Escuta evento global 'claude-ask' para que qualquer tela possa
  // abrir o chat sem precisar passar ref — elimina instâncias duplicadas
  useEffect(() => {
    const handler = (e: Event) => {
      const q = (e as CustomEvent<string>).detail;
      if (q) askQuestion(q);
    };
    window.addEventListener("claude-ask", handler);
    return () => window.removeEventListener("claude-ask", handler);
  }, [askQuestion]);

  const copyMessage = useCallback((text: string, idx: number) => {
    // Remove markdown antes de copiar — texto limpo para Bloco de Notas
    const clean = stripMarkdown(text);

    const done = () => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    };
    const legacy = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = clean;
        ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch {/* silent */}
    };
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(clean).then(done).catch(legacy);
    } else {
      legacy();
    }
  }, []);

  const suggestions = buildSuggestions(kpis, alertas);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [open, messages.length]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setInput("");

    // Captura o histórico ANTES de adicionar a nova mensagem
    const history = messages.filter((m) => m.content.trim() !== "");

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    const context = buildContext(kpis, alertas, concentracao);
    let answer = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context, history }),
      });

      if (!res.ok || !res.body) throw new Error("Erro na API");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: answer,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Ocorreu um erro na conexão. Tente novamente.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200 ${
          open
            ? "bg-neutral-900 text-white"
            : "bg-primary text-primary-foreground hover:scale-105"
        }`}
        title="CFO Estratégico — Perguntar"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[540px] w-[400px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-border bg-neutral-950 px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-bold text-white">CFO Estratégico IA</p>
              <p className="text-[10px] text-neutral-400">
                Consultor de elite · dados em tempo real · McKinsey level
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Pergunte qualquer coisa sobre a empresa:
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-[11px] text-foreground transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[90%] ${msg.role === "assistant" ? "w-full" : ""}`}>
                  <div
                    className={`group relative rounded-xl px-3 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-muted/60 text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" && msg.content && (
                      <button
                        onClick={() => copyMessage(msg.content, i)}
                        className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded bg-card/90 px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-foreground"
                        title="Copiar texto limpo"
                      >
                        {copiedIdx === i ? (
                          <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copiado</span></>
                        ) : (
                          <><Copy className="h-3 w-3" /><span>Copiar</span></>
                        )}
                      </button>
                    )}
                    {msg.content || (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="mb-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                ← Nova conversa
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte qualquer coisa sobre a empresa…"
                className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
});
