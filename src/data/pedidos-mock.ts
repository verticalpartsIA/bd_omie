export type StatusPedido = "novo" | "separacao" | "faturado" | "transito" | "entregue" | "problema" | "bloqueado";

export const statusLabel: Record<StatusPedido, string> = {
  novo: "Novo",
  separacao: "Em separação",
  faturado: "Faturado",
  transito: "Em trânsito",
  entregue: "Entregue",
  problema: "Com problema",
  bloqueado: "Bloqueado",
};

export const statusColor: Record<StatusPedido, string> = {
  novo: "#0288D1",
  separacao: "#F5C400",
  faturado: "#7B1FA2",
  transito: "#1976D2",
  entregue: "#2E7D32",
  problema: "#C62828",
  bloqueado: "#616161",
};

export interface Pedido {
  id: string;
  numero: string;
  cliente: string;
  vendedor: string;
  data: string;
  valor: number;
  itens: number;
  status: StatusPedido;
  prazoHoras: number;
  ageingHoras: number;
  faturaVencimento: string;
  faturaPaga: boolean;
}

function pseudo(i: number, salt: number): number {
  return Math.abs(Math.sin((i + 1) * (salt + 1) * 12.9898) * 43758.5453) % 1;
}

const clientesArr = ["Manutenção Vertical", "ConstruTorre", "TopLift Service", "EleManutec", "ProElevador", "Vertical Tech", "ElevaSP", "SkyLift", "MoveUp Engenharia", "Predial Service"];
const vendedoresArr = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Eduarda Pires"];
const statusArr: StatusPedido[] = ["novo", "separacao", "faturado", "transito", "entregue", "entregue", "entregue", "problema", "bloqueado"];

export const pedidos: Pedido[] = Array.from({ length: 60 }, (_, i) => {
  const status = statusArr[i % statusArr.length];
  const ageingHoras = status === "entregue" ? Math.floor(pseudo(i, 1) * 72) : Math.floor(pseudo(i, 1) * 96);
  const prazoHoras = 48;
  const valor = 1500 + Math.round(pseudo(i, 2) * 28000);
  const dataOff = Math.floor(pseudo(i, 3) * 30);
  const faturaPaga = pseudo(i, 4) > 0.35;
  return {
    id: `p-${i + 1}`,
    numero: `PED-${20000 + i}`,
    cliente: clientesArr[i % clientesArr.length],
    vendedor: vendedoresArr[i % vendedoresArr.length],
    data: new Date(Date.now() - dataOff * 86400000).toISOString(),
    valor,
    itens: 1 + Math.floor(pseudo(i, 5) * 12),
    status,
    prazoHoras,
    ageingHoras,
    faturaVencimento: new Date(Date.now() + (15 - dataOff) * 86400000).toISOString(),
    faturaPaga,
  };
});

export function formatBRL(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

const entregues = pedidos.filter((p) => p.status === "entregue");
const noPrazo = entregues.filter((p) => p.ageingHoras <= p.prazoHoras).length;
const problema = pedidos.filter((p) => p.status === "problema").length;
const carteira = pedidos.filter((p) => p.status !== "entregue").reduce((s, p) => s + p.valor, 0);
const faturado = pedidos.filter((p) => p.status === "faturado" || p.status === "transito" || p.status === "entregue").reduce((s, p) => s + p.valor, 0);
const atraso = pedidos.filter((p) => !p.faturaPaga && new Date(p.faturaVencimento).getTime() < Date.now()).length;

export const kpisPedidos = {
  slaEntrega: entregues.length ? Math.round((noPrazo / entregues.length) * 1000) / 10 : 0,
  slaDelta: 1.4,
  cicloMedio: 36,
  cicloDelta: -3.2,
  taxaProblema: Math.round((problema / pedidos.length) * 1000) / 10,
  problemaDelta: 0.6,
  emAberto: pedidos.filter((p) => ["novo", "separacao", "faturado", "transito", "bloqueado"].includes(p.status)).length,
  emAbertoDelta: -2,
  carteira,
  faturado,
  faturasAtraso: atraso,
  atrasoDelta: -1.8,
};

export const slaHistorico = [
  { mes: "Dez/24", sla: 91.2 },
  { mes: "Jan/25", sla: 93.5 },
  { mes: "Fev/25", sla: 90.8 },
  { mes: "Mar/25", sla: 94.1 },
  { mes: "Abr/25", sla: 95.4 },
  { mes: "Mai/25", sla: kpisPedidos.slaEntrega },
];

export const cicloEtapas = [
  { etapa: "Entrada", horas: 2 },
  { etapa: "Separação", horas: 12 },
  { etapa: "Faturamento", horas: 4 },
  { etapa: "Coleta", horas: 8 },
  { etapa: "Trânsito", horas: 10 },
];

export const ageingDistribuicao = [
  { faixa: "0-12h", count: pedidos.filter((p) => p.ageingHoras <= 12 && p.status !== "entregue").length, color: "#2E7D32" },
  { faixa: "12-24h", count: pedidos.filter((p) => p.ageingHoras > 12 && p.ageingHoras <= 24 && p.status !== "entregue").length, color: "#A4C639" },
  { faixa: "24-48h", count: pedidos.filter((p) => p.ageingHoras > 24 && p.ageingHoras <= 48 && p.status !== "entregue").length, color: "#F5C400" },
  { faixa: "48-72h", count: pedidos.filter((p) => p.ageingHoras > 48 && p.ageingHoras <= 72 && p.status !== "entregue").length, color: "#E65100" },
  { faixa: "72h+", count: pedidos.filter((p) => p.ageingHoras > 72 && p.status !== "entregue").length, color: "#C62828" },
];

export const distribuicaoStatus = (Object.keys(statusLabel) as StatusPedido[]).map((s) => ({
  status: statusLabel[s],
  key: s,
  count: pedidos.filter((p) => p.status === s).length,
  color: statusColor[s],
}));