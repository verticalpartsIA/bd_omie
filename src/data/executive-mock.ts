import { dre, ebitda12m, forecastMes, cenariosCaixa, fluxoFaixas, receitaRecorrente, receitaNaoRecorrente, rentabilidadeClientes, margemEbitdaPct, margemLiquidaPct, resultadoLiquido, formatBRL } from "./financeiro-mock";
import { kpisPedidos } from "./pedidos-mock";
import type { AlertItem } from "@/components/app/AlertasRecomendacoes";

export { formatBRL };

// Concentração top 5 / top 10 clientes
const totalReceitaClientes = rentabilidadeClientes.reduce((s, c) => s + c.receita, 0);
const top5 = rentabilidadeClientes.slice().sort((a, b) => b.receita - a.receita).slice(0, 5);
const top10 = rentabilidadeClientes.slice().sort((a, b) => b.receita - a.receita).slice(0, 10);
export const concentracao = {
  top5Pct: Math.round((top5.reduce((s, c) => s + c.receita, 0) / totalReceitaClientes) * 1000) / 10,
  top10Pct: Math.round((top10.reduce((s, c) => s + c.receita, 0) / totalReceitaClientes) * 1000) / 10,
  top5,
  top10,
};

// "Atenção do CEO hoje"
export const cockpitCEO: AlertItem[] = [
  {
    level: "critico",
    title: "3 clientes Top-10 com risco de churn",
    detail: "ConstruTorre, ProElevador e SkyLift sem pedido há 60+ dias — exposição de R$ 1,2M/ano.",
    acao: "Acionar Diretor Comercial para visita esta semana.",
  },
  {
    level: "critico",
    title: "Painel CCM-V2 com ruptura prevista em 5 dias",
    detail: "Apenas 2 unidades · 12 pedidos pendentes vinculados · impacto R$ 142k.",
    acao: "Aprovar compra emergencial do fornecedor alternativo.",
  },
  {
    level: "atencao",
    title: `SLA logístico em ${kpisPedidos.slaEntrega}% (meta 95%)`,
    detail: "Gargalo na etapa de Separação (12h vs 6h padrão).",
    acao: "Realocar 2 colaboradores para o turno da tarde.",
  },
  {
    level: "atencao",
    title: "Margem da categoria Painéis Eletrônicos em 22%",
    detail: "Queda de 6pp em 60 dias — pressão de custo do fornecedor importado.",
    acao: "Renegociar contrato anual ou ajustar lista de preços.",
  },
  {
    level: "info",
    title: "Inadimplência controlada em 2,1%",
    detail: "Abaixo da meta de 3,5% — política de cobrança eficaz.",
  },
];

export const kpisStrategic = {
  receita: dre.receitaBruta,
  receitaDelta: 5.2,
  margemBruta: Math.round((dre.margemBruta / dre.receitaLiquida) * 1000) / 10,
  margemDelta: 1.4,
  ebitda: dre.ebitda,
  ebitdaPct: margemEbitdaPct,
  ebitdaDelta: 6.7,
  resultadoLiquido,
  margemLiquida: margemLiquidaPct,
  receitaRecorrente,
  receitaNaoRecorrente,
  caixa30: fluxoFaixas.d30,
  caixa60: fluxoFaixas.d60,
  caixa90: fluxoFaixas.d90,
  forecastMes,
  cenariosCaixa,
  ebitda12m,
};