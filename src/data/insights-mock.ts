import type { AlertItem } from "@/components/app/AlertasRecomendacoes";
import { clientes, formatBRL } from "./clientes-mock";
import { vendedores } from "./comercial-mock";
import { produtos } from "./estoque-mock";

// ===== Analytical =====
export const forecastMes = {
  realizado: 4_120_000,
  projetado: 5_280_000,
  meta: 5_500_000,
  pctMeta: 96,
  delta: 4.2,
};

export const oportunidades: AlertItem[] = [
  { level: "info", title: "Cliente Manutec sem compra há 45 dias", detail: "Histórico mensal de R$ 18k — receita potencial recuperável.", acao: "Agendar visita comercial." },
  { level: "atencao", title: "Categoria Painéis com margem caindo", detail: "Margem 22% (-6pp em 60d) — investigar custo do fornecedor.", acao: "Renegociar contrato anual." },
  { level: "info", title: "Pico de demanda previsto em Dez", detail: "Histórico mostra +28% no volume — preparar estoque de Polias e Cabos.", acao: "Antecipar compra estratégica." },
];

export const cohortClientes = [
  { mes: "Jun/24", novos: 14, m1: 11, m2: 9, m3: 8, m4: 7, m5: 6 },
  { mes: "Jul/24", novos: 18, m1: 15, m2: 12, m3: 10, m4: 9, m5: 8 },
  { mes: "Ago/24", novos: 22, m1: 19, m2: 15, m3: 13, m4: 11 },
  { mes: "Set/24", novos: 17, m1: 14, m2: 11, m3: 9 },
  { mes: "Out/24", novos: 25, m1: 21, m2: 18 },
  { mes: "Nov/24", novos: 19, m1: 16 },
];

// ===== Customers =====
export function clienteRisco(c: typeof clientes[number]): "alto" | "medio" | "baixo" {
  if (c.diasSemComprar > 180) return "alto";
  if (c.diasSemComprar > 90) return "medio";
  return "baixo";
}

export const churnRate = (() => {
  const inativos = clientes.filter((c) => c.status === "inativo").length;
  return Math.round((inativos / clientes.length) * 1000) / 10;
})();

export const riscoAlto = clientes.filter((c) => clienteRisco(c) === "alto").length;

export const clientesAcaoHoje: AlertItem[] = clientes
  .filter((c) => c.diasSemComprar > 60 && c.receitaTotal > 200_000)
  .slice(0, 5)
  .map((c) => ({
    level: c.diasSemComprar > 120 ? "critico" : "atencao",
    title: `${c.nome} — ${c.diasSemComprar} dias sem comprar`,
    detail: `LTV ${formatBRL(c.ltv)} · Receita histórica ${formatBRL(c.receitaTotal)} · Vendedor ${c.vendedor}`,
    acao: c.diasSemComprar > 120 ? "Reativação urgente — ligação direta." : "Agendar contato esta semana.",
  }));

// ===== RFM playbooks =====
export const playbooksRFM: Record<string, { acao: string; canal: string; meta: string }> = {
  campeao: { acao: "Programa de fidelidade premium", canal: "Visita + benefício exclusivo", meta: "Aumentar ticket em 15%" },
  leal: { acao: "Cross-sell de categorias complementares", canal: "WhatsApp + e-mail", meta: "Adicionar 1 categoria/cliente" },
  potencial: { acao: "Educação de produto + amostra", canal: "Vídeo demo + ligação", meta: "Subir para Leal em 90d" },
  novo: { acao: "Onboarding e segunda compra", canal: "Sequência de e-mails 30d", meta: "Garantir 2ª compra em 45d" },
  em_risco: { acao: "Reativação com desconto", canal: "Ligação direta do vendedor", meta: "Recuperar 25% em 30d" },
  hibernando: { acao: "Pesquisa de satisfação + oferta", canal: "WhatsApp", meta: "Reabrir 15% em 60d" },
  perdido: { acao: "Win-back agressivo ou descarte", canal: "E-mail + ligação final", meta: "10% reativação ou arquivar" },
};

export const receitaRecuperavel = clientes
  .filter((c) => c.status === "em_risco" || c.status === "inativo")
  .reduce((s, c) => s + c.ticketMedio * 6, 0);

// ===== Sellers =====
export const vendedoresAcao: AlertItem[] = vendedores
  .filter((v) => v.realizado / (v.meta * (v.diaAtual / v.diasUteis)) < 0.85)
  .map((v) => ({
    level: "atencao" as const,
    title: `${v.nome} abaixo do ritmo esperado`,
    detail: `Realizado ${formatBRL(v.realizado)} de ${formatBRL(v.meta)} — ${Math.round((v.realizado / v.meta) * 100)}% no dia ${v.diaAtual}/${v.diasUteis}.`,
    acao: "1:1 esta semana para destravar oportunidades.",
  }));

// ===== Estoque (Onda 3) =====
export const agingEstoque = [
  { faixa: "0-30d", skus: 1820, valor: 580_000, cor: "#2E7D32" },
  { faixa: "31-90d", skus: 1240, valor: 640_000, cor: "#558B2F" },
  { faixa: "91-180d", skus: 620, valor: 380_000, cor: "#F5C400" },
  { faixa: "181-365d", skus: 310, valor: 180_000, cor: "#E65100" },
  { faixa: "365d+", skus: 138, valor: 60_000, cor: "#C62828" },
];
export const capitalParado = agingEstoque.filter((a) => a.faixa === "181-365d" || a.faixa === "365d+").reduce((s, a) => s + a.valor, 0);
export const compraSugerida = produtos.filter((p) => p.diasCobertura < 15).reduce((s, p) => s + p.custoUnitario * Math.max(0, p.estoqueMinimo - p.estoqueAtual + 50), 0);

export const reposicaoSugerida = produtos
  .filter((p) => p.diasCobertura < 20)
  .map((p) => {
    const qtd = Math.max(20, p.estoqueMinimo * 2 - p.estoqueAtual);
    return {
      sku: p.sku,
      nome: p.nome,
      atual: p.estoqueAtual,
      sugerido: qtd,
      impactoCaixa: qtd * p.custoUnitario,
      cobertura: p.diasCobertura,
      fornecedor: p.fornecedor ?? "—",
      leadTime: 7,
    };
  })
  .sort((a, b) => a.cobertura - b.cobertura)
  .slice(0, 10);

export const estoqueAlertas: AlertItem[] = [
  { level: "critico", title: "6 SKUs em ruptura iminente", detail: "Cobertura abaixo de 7 dias — risco de parada de venda.", acao: "Aprovar compra emergencial hoje." },
  { level: "atencao", title: `Capital parado ${formatBRL(capitalParado)}`, detail: "Estoque acima de 180 dias sem giro relevante.", acao: "Liquidar via promoção ou revenda B2B." },
  { level: "info", title: "Cobertura média de 38 dias dentro da meta", detail: "Saudável — manter monitoramento semanal." },
];

// ===== Movimentações anomalia =====
export const movimentacoesAlertas: AlertItem[] = [
  { level: "critico", title: "Saída de 340 un de CAB-6X19 sem pedido vinculado", detail: "Anomalia detectada · responsável: Carlos M. · 14:32", acao: "Auditar movimento e validar baixa." },
  { level: "atencao", title: "Ajuste manual recorrente em POL-1803", detail: "5 ajustes em 30d — possível erro de inventário cíclico.", acao: "Revisar processo de contagem." },
];

// ===== Categorias =====
export const categoriaAcao: AlertItem[] = [
  { level: "critico", title: "Painéis: giro 2.3x abaixo da meta 3.0x", detail: "5 SKUs com cobertura > 60d. Capital imobilizado.", acao: "Promover venda casada com Motores." },
  { level: "atencao", title: "Motores: 4 SKUs em estado crítico", detail: "Lead time de 21d e demanda em alta — risco de ruptura.", acao: "Compra antecipada já." },
];