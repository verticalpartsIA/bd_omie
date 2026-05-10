export type EtapaFunil = "lead" | "qualificado" | "proposta" | "negociacao" | "fechado";
export type CanalAquisicao = "ativa" | "whatsapp" | "indicacao" | "site" | "evento";

export const etapaLabel: Record<EtapaFunil, string> = {
  lead: "Leads abordados",
  qualificado: "Qualificados",
  proposta: "Propostas",
  negociacao: "Negociação",
  fechado: "Fechados",
};

export const canalLabel: Record<CanalAquisicao, string> = {
  ativa: "Ligação Ativa",
  whatsapp: "WhatsApp",
  indicacao: "Indicação",
  site: "Site",
  evento: "Evento",
};

export interface Vendedor {
  id: string;
  nome: string;
  meta: number;
  realizado: number;
  ticketMedio: number;
  pedidos: number;
  comissao: number;
  diasUteis: number;
  diaAtual: number;
  evolucao: number[]; // dia a dia (acumulado)
}

export function formatBRL(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

const nomes = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Eduarda Pires", "Fábio Castro", "Gisele Tavares", "Henrique Alves"];

function pseudo(i: number, salt: number): number {
  return Math.abs(Math.sin((i + 1) * (salt + 1) * 12.9898) * 43758.5453) % 1;
}

const DIAS_UTEIS = 22;
const DIA_ATUAL = 16;

export const vendedores: Vendedor[] = nomes.map((nome, i) => {
  const meta = 180_000 + Math.round(pseudo(i, 1) * 220_000);
  const fator = 0.5 + pseudo(i, 2) * 0.7; // 50%-120% no dia atual proporcional
  const realizado = Math.round((meta * (DIA_ATUAL / DIAS_UTEIS)) * fator);
  const pedidos = 18 + Math.floor(pseudo(i, 3) * 30);
  const ticketMedio = Math.round(realizado / Math.max(1, pedidos));
  const comissao = Math.round(realizado * (0.018 + pseudo(i, 4) * 0.012));
  const evolucao = Array.from({ length: DIA_ATUAL }, (_, d) => {
    const ratio = (d + 1) / DIA_ATUAL;
    const noise = 0.85 + pseudo(i, 10 + d) * 0.3;
    return Math.round(realizado * ratio * noise * (1 / (1 + pseudo(i, d) * 0.05)));
  });
  return { id: `v-${i + 1}`, nome, meta, realizado, ticketMedio, pedidos, comissao, diasUteis: DIAS_UTEIS, diaAtual: DIA_ATUAL, evolucao };
});

export const totalMeta = vendedores.reduce((s, v) => s + v.meta, 0);
export const totalRealizado = vendedores.reduce((s, v) => s + v.realizado, 0);
export const totalComissao = vendedores.reduce((s, v) => s + v.comissao, 0);
export const ticketMedioGeral = Math.round(totalRealizado / vendedores.reduce((s, v) => s + v.pedidos, 0));

// Pipeline por etapa (volume e valor)
export const funil: Array<{ etapa: EtapaFunil; quantidade: number; valor: number }> = [
  { etapa: "lead", quantidade: 480, valor: 4_800_000 },
  { etapa: "qualificado", quantidade: 220, valor: 3_300_000 },
  { etapa: "proposta", quantidade: 96, valor: 1_920_000 },
  { etapa: "negociacao", quantidade: 41, valor: 1_025_000 },
  { etapa: "fechado", quantidade: 18, valor: 612_000 },
];

export const conversaoEtapas = funil.slice(0, -1).map((f, i) => {
  const next = funil[i + 1];
  return {
    de: etapaLabel[f.etapa],
    para: etapaLabel[next.etapa],
    taxa: Math.round((next.quantidade / f.quantidade) * 1000) / 10,
  };
});

export const cacPorCanal: Array<{ canal: CanalAquisicao; clientes: number; investimento: number; cac: number }> = [
  { canal: "ativa", clientes: 32, investimento: 28_000, cac: 0 },
  { canal: "whatsapp", clientes: 41, investimento: 12_500, cac: 0 },
  { canal: "indicacao", clientes: 28, investimento: 4_200, cac: 0 },
  { canal: "site", clientes: 19, investimento: 22_000, cac: 0 },
  { canal: "evento", clientes: 9, investimento: 18_000, cac: 0 },
].map((c) => ({ ...c, cac: Math.round(c.investimento / Math.max(1, c.clientes)) }));

export const comissaoMensal = [
  { mes: "Dez/24", comissao: 28_400 },
  { mes: "Jan/25", comissao: 31_200 },
  { mes: "Fev/25", comissao: 29_800 },
  { mes: "Mar/25", comissao: 34_900 },
  { mes: "Abr/25", comissao: 37_500 },
  { mes: "Mai/25", comissao: totalComissao },
];

export const kpisComercial = {
  atingimentoMedio: Math.round((totalRealizado / (totalMeta * (DIA_ATUAL / DIAS_UTEIS))) * 100),
  atingimentoDelta: 4.1,
  pipelineValor: funil.reduce((s, f) => s + f.valor, 0),
  pipelineDelta: 6.8,
  conversaoGeral: Math.round((funil[4].quantidade / funil[0].quantidade) * 1000) / 10,
  conversaoDelta: -1.2,
  cacMedio: Math.round(cacPorCanal.reduce((s, c) => s + c.investimento, 0) / cacPorCanal.reduce((s, c) => s + c.clientes, 0)),
  cacDelta: -3.4,
  ticketMedio: ticketMedioGeral,
  ticketDelta: 2.1,
  comissaoMes: totalComissao,
  comissaoDelta: 8.2,
};