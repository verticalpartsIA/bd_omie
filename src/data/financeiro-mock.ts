export function formatBRL(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function pseudo(i: number, salt: number): number {
  return Math.abs(Math.sin((i + 1) * (salt + 1) * 12.9898) * 43758.5453) % 1;
}

// Fluxo de caixa diário (90 dias projetados)
export const fluxoCaixa = Array.from({ length: 90 }, (_, i) => {
  const dia = i + 1;
  const entrada = 18000 + Math.round(pseudo(i, 1) * 42000);
  const saida = 12000 + Math.round(pseudo(i, 2) * 38000);
  return {
    dia: `D+${dia}`,
    entrada,
    saida,
    liquido: entrada - saida,
  };
});

let saldoAcc = 480_000;
export const fluxoAcumulado = fluxoCaixa.map((f) => {
  saldoAcc += f.liquido;
  return { dia: f.dia, saldo: saldoAcc };
});

export const fluxoFaixas = {
  hoje: 480_000,
  d30: fluxoAcumulado[29].saldo,
  d60: fluxoAcumulado[59].saldo,
  d90: fluxoAcumulado[89].saldo,
};

// Contas a Receber por aging
export const contasReceber = [
  { faixa: "Vence hoje", valor: 78_000, count: 8, color: "#F5C400" },
  { faixa: "1-7 dias", valor: 142_000, count: 22, color: "#A4C639" },
  { faixa: "8-30 dias", valor: 386_000, count: 41, color: "#0288D1" },
  { faixa: "31-60 dias", valor: 220_000, count: 19, color: "#7B1FA2" },
  { faixa: "Vencido 1-15", valor: 64_000, count: 11, color: "#E65100" },
  { faixa: "Vencido 16-30", valor: 42_000, count: 7, color: "#D84315" },
  { faixa: "Vencido 30+", valor: 38_000, count: 5, color: "#C62828" },
];

export const contasPagar = [
  { faixa: "Vence hoje", valor: 52_000, count: 6, color: "#F5C400" },
  { faixa: "1-7 dias", valor: 118_000, count: 14, color: "#A4C639" },
  { faixa: "8-30 dias", valor: 246_000, count: 28, color: "#0288D1" },
  { faixa: "31-60 dias", valor: 198_000, count: 22, color: "#7B1FA2" },
  { faixa: "Vencido", valor: 18_000, count: 3, color: "#C62828" },
];

const totalAR = contasReceber.reduce((s, c) => s + c.valor, 0);
const vencidoAR = contasReceber.filter((c) => c.faixa.startsWith("Vencido")).reduce((s, c) => s + c.valor, 0);

// DRE simplificado mês corrente
export const dre = {
  receitaBruta: 1_840_000,
  deducoes: -212_000,
  receitaLiquida: 1_628_000,
  cpv: -892_000,
  margemBruta: 736_000,
  despesasOperacionais: -348_000,
  ebitda: 388_000,
  resultadoLiquido: 268_000,
};

export const dreMargemPct = Math.round((dre.margemBruta / dre.receitaLiquida) * 1000) / 10;
export const dreEbitdaPct = Math.round((dre.ebitda / dre.receitaLiquida) * 1000) / 10;

// Margem por categoria
export const margemCategoria = [
  { categoria: "Polias", receita: 480_000, custo: 264_000, margemPct: 45 },
  { categoria: "Cabos", receita: 320_000, custo: 198_000, margemPct: 38 },
  { categoria: "Botoeiras", receita: 280_000, custo: 162_000, margemPct: 42 },
  { categoria: "Painéis Eletrônicos", receita: 410_000, custo: 320_000, margemPct: 22 },
  { categoria: "Motores", receita: 350_000, custo: 224_000, margemPct: 36 },
];

export const evolucaoReceitaCusto = [
  { mes: "Dez/24", receita: 1_520_000, custo: 822_000 },
  { mes: "Jan/25", receita: 1_640_000, custo: 894_000 },
  { mes: "Fev/25", receita: 1_580_000, custo: 858_000 },
  { mes: "Mar/25", receita: 1_720_000, custo: 932_000 },
  { mes: "Abr/25", receita: 1_780_000, custo: 956_000 },
  { mes: "Mai/25", receita: dre.receitaBruta, custo: -dre.cpv },
];

export const kpisFinanceiro = {
  saldoHoje: fluxoFaixas.hoje,
  saldo30: fluxoFaixas.d30,
  saldo90: fluxoFaixas.d90,
  contasReceber: totalAR,
  contasReceberDelta: 3.4,
  contasPagar: contasPagar.reduce((s, c) => s + c.valor, 0),
  contasPagarDelta: 1.8,
  inadimplencia: Math.round((vencidoAR / totalAR) * 1000) / 10,
  inadimplenciaDelta: -0.6,
  receita: dre.receitaBruta,
  receitaDelta: 5.2,
  margemBruta: dreMargemPct,
  margemDelta: 1.4,
  ebitda: dre.ebitda,
  ebitdaDelta: 6.7,
};

// Resultado / margem líquida (estimativa pós impostos)
export const resultadoLiquido = dre.resultadoLiquido;
export const margemLiquidaPct = Math.round((resultadoLiquido / dre.receitaLiquida) * 1000) / 10;
export const margemEbitdaPct = dreEbitdaPct;

// Capital de giro = AR + estoque - AP (estimado)
const estoqueValor = 1_240_000;
export const capitalGiro = totalAR + estoqueValor - contasPagar.reduce((s, c) => s + c.valor, 0);
export const necessidadeCapitalGiro = Math.max(0, contasPagar.reduce((s, c) => s + c.valor, 0) - fluxoFaixas.d30);

// Burn rate (despesas op médias mensais)
export const burnRate = Math.abs(dre.despesasOperacionais);

// Receita recorrente vs não recorrente (contratos de manutenção vs avulsa)
export const receitaRecorrente = Math.round(dre.receitaBruta * 0.58);
export const receitaNaoRecorrente = dre.receitaBruta - receitaRecorrente;
export const receitaRecorrenteSerie = evolucaoReceitaCusto.map((m, i) => ({
  mes: m.mes,
  recorrente: Math.round(m.receita * (0.55 + pseudo(i, 7) * 0.08)),
  naoRecorrente: m.receita - Math.round(m.receita * (0.55 + pseudo(i, 7) * 0.08)),
}));

// Cenários de caixa (90 dias)
export const cenariosCaixa = {
  conservador: Math.round(fluxoFaixas.d90 * 0.78),
  provavel: fluxoFaixas.d90,
  agressivo: Math.round(fluxoFaixas.d90 * 1.18),
};

// Rentabilidade por cliente (top/bottom)
const nomesCli = ["Manutenção Vertical", "ConstruTorre", "TopLift Service", "EleManutec", "ProElevador", "Vertical Tech", "ElevaSP", "SkyLift", "MoveUp Eng.", "Predial Service", "TorreSP", "ElevAlto", "Cabos&Cia", "MaxLift", "GiroMec"];
export const rentabilidadeClientes = nomesCli.map((nome, i) => {
  const receita = 40_000 + Math.round(pseudo(i, 11) * 280_000);
  const margemPct = 8 + pseudo(i, 12) * 38 - (i > 11 ? 30 : 0);
  const lucro = Math.round(receita * (margemPct / 100));
  return { nome, receita, margemPct: Math.round(margemPct * 10) / 10, lucro };
}).sort((a, b) => b.lucro - a.lucro);

// EBITDA / margem 12 meses
export const ebitda12m = [
  "Nov/24","Dez/24","Jan/25","Fev/25","Mar/25","Abr/25","Mai/25","Jun/25","Jul/25","Ago/25","Set/25","Out/25",
].map((mes, i) => {
  const receita = 1_400_000 + Math.round(pseudo(i, 21) * 600_000);
  const margem = Math.round(receita * (0.32 + pseudo(i, 22) * 0.12));
  const ebitda = Math.round(receita * (0.18 + pseudo(i, 23) * 0.10));
  return { mes, receita, margem, ebitda };
});

// Forecast fechamento mês corrente
const diasCorridos = 16;
const diasMes = 30;
export const forecastMes = {
  realizado: dre.receitaBruta,
  projetado: Math.round((dre.receitaBruta / diasCorridos) * diasMes),
  meta: 2_100_000,
};