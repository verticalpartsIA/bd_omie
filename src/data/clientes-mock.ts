export type SegmentoCliente = "manutencao" | "construtora" | "sindico" | "revenda" | "industria";
export type StatusCliente = "ativo" | "em_risco" | "inativo" | "novo";
export type RFMSegment = "campeao" | "leal" | "potencial" | "novo" | "em_risco" | "hibernando" | "perdido";

export interface Cliente {
  id: string;
  codigo: string;
  nome: string;
  cnpj: string;
  cidade: string;
  uf: string;
  segmento: SegmentoCliente;
  status: StatusCliente;
  primeiraCompra: string;
  ultimaCompra: string;
  diasSemComprar: number;
  totalPedidos: number;
  receitaTotal: number;
  ticketMedio: number;
  ltv: number;
  rfm: { r: number; f: number; m: number; segmento: RFMSegment };
  vendedor: string;
}

export const segmentosLabel: Record<SegmentoCliente, string> = {
  manutencao: "Manutenção",
  construtora: "Construtora",
  sindico: "Síndico/Cliente Final",
  revenda: "Revenda",
  industria: "Indústria",
};

export const rfmLabel: Record<RFMSegment, string> = {
  campeao: "Campeões",
  leal: "Leais",
  potencial: "Potenciais",
  novo: "Novos",
  em_risco: "Em Risco",
  hibernando: "Hibernando",
  perdido: "Perdidos",
};

export const rfmColor: Record<RFMSegment, string> = {
  campeao: "#2E7D32",
  leal: "#558B2F",
  potencial: "#F5C400",
  novo: "#0288D1",
  em_risco: "#E65100",
  hibernando: "#6A1B9A",
  perdido: "#C62828",
};

const cidadesUF: Array<[string, string]> = [
  ["São Paulo", "SP"], ["Campinas", "SP"], ["Rio de Janeiro", "RJ"], ["Belo Horizonte", "MG"],
  ["Curitiba", "PR"], ["Porto Alegre", "RS"], ["Salvador", "BA"], ["Recife", "PE"],
  ["Fortaleza", "CE"], ["Brasília", "DF"], ["Goiânia", "GO"], ["Florianópolis", "SC"],
];

const nomesEmpresa = [
  "Manutenção Vertical", "Elevadores Premium", "ConstruTorre", "Síndicos Unidos",
  "TopLift Service", "EleManutec", "ProElevador", "Vertical Tech", "ElevaSP",
  "Construtora Aurora", "SkyLift", "Verticália", "MoveUp Engenharia", "RJ Elevadores",
  "BH Vertical", "Sul Elevadores", "Norte Lift", "Predial Service", "Conserva Elev",
  "Master Elevadores", "Unilift", "Brasília Vertical", "PortoLift", "RecifeLift",
  "Industrial Movimentação", "MetalForte Indústria", "RevendaPeças BR", "Distribuidora Verti",
  "ConstruRio", "Elev MG", "ProSindico", "VerticalCenter", "EleManut Norte",
  "Sky Construções", "TopFix Service", "Lift Solutions", "Elevações SP", "Verticalle",
  "FastLift", "Seguro Eleva",
];

const segmentosArr: SegmentoCliente[] = ["manutencao", "construtora", "sindico", "revenda", "industria"];
const vendedores = ["Ana Souza", "Bruno Lima", "Carla Mendes", "Diego Rocha", "Eduarda Pires"];

function rfmToSegment(r: number, f: number, m: number): RFMSegment {
  const score = r + f + m;
  if (r >= 4 && f >= 4 && m >= 4) return "campeao";
  if (f >= 4 && m >= 3 && r >= 3) return "leal";
  if (r >= 4 && f <= 2) return "novo";
  if (r <= 2 && f >= 3 && m >= 3) return "em_risco";
  if (r <= 2 && f <= 2 && m <= 2) return "perdido";
  if (r <= 3 && f <= 2 && m >= 3) return "hibernando";
  if (score >= 9) return "potencial";
  return "potencial";
}

function pseudo(i: number, salt: number): number {
  return Math.abs(Math.sin((i + 1) * (salt + 1) * 12.9898) * 43758.5453) % 1;
}

export const clientes: Cliente[] = Array.from({ length: 80 }, (_, i) => {
  const seg = segmentosArr[i % segmentosArr.length];
  const cidade = cidadesUF[i % cidadesUF.length];
  const nome = nomesEmpresa[i % nomesEmpresa.length] + (i >= nomesEmpresa.length ? ` ${Math.floor(i / nomesEmpresa.length) + 1}` : "");
  const diasSemComprar = Math.floor(pseudo(i, 1) * 365);
  const totalPedidos = 1 + Math.floor(pseudo(i, 2) * 60);
  const ticketBase = seg === "construtora" ? 18000 : seg === "industria" ? 25000 : seg === "manutencao" ? 4800 : seg === "revenda" ? 9200 : 2200;
  const ticketMedio = Math.round(ticketBase * (0.6 + pseudo(i, 3) * 0.9));
  const receitaTotal = totalPedidos * ticketMedio;
  const ltv = Math.round(receitaTotal * (1 + pseudo(i, 4) * 1.5));
  const r = diasSemComprar < 30 ? 5 : diasSemComprar < 60 ? 4 : diasSemComprar < 120 ? 3 : diasSemComprar < 200 ? 2 : 1;
  const f = totalPedidos > 30 ? 5 : totalPedidos > 18 ? 4 : totalPedidos > 10 ? 3 : totalPedidos > 4 ? 2 : 1;
  const m = receitaTotal > 800000 ? 5 : receitaTotal > 350000 ? 4 : receitaTotal > 120000 ? 3 : receitaTotal > 40000 ? 2 : 1;
  const status: StatusCliente =
    diasSemComprar < 30 && totalPedidos <= 2 ? "novo" :
    diasSemComprar < 90 ? "ativo" :
    diasSemComprar < 180 ? "em_risco" : "inativo";
  const primeiraCompraDays = 200 + Math.floor(pseudo(i, 5) * 1500);
  return {
    id: `c-${i + 1}`,
    codigo: `CLI-${String(1000 + i)}`,
    nome,
    cnpj: `${10 + (i % 89)}.${100 + (i * 3) % 899}.${100 + (i * 7) % 899}/0001-${10 + (i % 89)}`,
    cidade: cidade[0],
    uf: cidade[1],
    segmento: seg,
    status,
    primeiraCompra: new Date(Date.now() - primeiraCompraDays * 86400000).toISOString(),
    ultimaCompra: new Date(Date.now() - diasSemComprar * 86400000).toISOString(),
    diasSemComprar,
    totalPedidos,
    receitaTotal,
    ticketMedio,
    ltv,
    rfm: { r, f, m, segmento: rfmToSegment(r, f, m) },
    vendedor: vendedores[i % vendedores.length],
  };
});

export function getClienteById(id: string) {
  return clientes.find((c) => c.id === id);
}

export function formatBRL(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

// KPIs
const ativos = clientes.filter((c) => c.status === "ativo" || c.status === "novo");
const inativos = clientes.filter((c) => c.status === "inativo");
const emRisco = clientes.filter((c) => c.status === "em_risco");
const receitaTotal = clientes.reduce((s, c) => s + c.receitaTotal, 0);
const top10 = [...clientes].sort((a, b) => b.receitaTotal - a.receitaTotal).slice(0, 10);
const receitaTop10 = top10.reduce((s, c) => s + c.receitaTotal, 0);

export const kpisClientes = {
  baseAtiva: ativos.length,
  baseAtivaDelta: 4.2,
  baseInativa: inativos.length,
  baseInativaDelta: -3.1,
  emRisco: emRisco.length,
  emRiscoDelta: 2.5,
  receitaTotal,
  receitaTotalDelta: 6.3,
  ticketMedio: Math.round(receitaTotal / clientes.reduce((s, c) => s + c.totalPedidos, 0)),
  ticketMedioDelta: 1.8,
  taxaReativacao: 18.4,
  taxaReativacaoDelta: 3.2,
  concentracaoTop10: Math.round((receitaTop10 / receitaTotal) * 1000) / 10,
  ltvMedio: Math.round(clientes.reduce((s, c) => s + c.ltv, 0) / clientes.length),
};

export const top10Clientes = top10.map((c) => ({
  id: c.id,
  codigo: c.codigo,
  nome: c.nome,
  receita: c.receitaTotal,
  pctTotal: Math.round((c.receitaTotal / receitaTotal) * 1000) / 10,
  segmento: c.segmento,
}));

export const ticketPorSegmento = segmentosArr.map((s) => {
  const cs = clientes.filter((c) => c.segmento === s);
  const tm = cs.reduce((sum, c) => sum + c.ticketMedio, 0) / Math.max(1, cs.length);
  const ltv = cs.reduce((sum, c) => sum + c.ltv, 0) / Math.max(1, cs.length);
  return {
    segmento: segmentosLabel[s],
    key: s,
    clientes: cs.length,
    ticketMedio: Math.round(tm),
    ltvMedio: Math.round(ltv),
    receita: cs.reduce((sum, c) => sum + c.receitaTotal, 0),
  };
});

export const distribuicaoRFM = (Object.keys(rfmLabel) as RFMSegment[]).map((seg) => ({
  segmento: rfmLabel[seg],
  key: seg,
  count: clientes.filter((c) => c.rfm.segmento === seg).length,
  color: rfmColor[seg],
}));

export const reativacaoMensal = [
  { mes: "Dez/24", abordados: 42, reativados: 7 },
  { mes: "Jan/25", abordados: 51, reativados: 9 },
  { mes: "Fev/25", abordados: 48, reativados: 11 },
  { mes: "Mar/25", abordados: 56, reativados: 12 },
  { mes: "Abr/25", abordados: 60, reativados: 14 },
  { mes: "Mai/25", abordados: 58, reativados: 13 },
];

export const historicoComprasCliente = (id: string) => {
  const c = getClienteById(id);
  if (!c) return [];
  return Array.from({ length: 12 }, (_, i) => ({
    mes: ["Jun/24","Jul/24","Ago/24","Set/24","Out/24","Nov/24","Dez/24","Jan/25","Fev/25","Mar/25","Abr/25","Mai/25"][i],
    valor: Math.max(0, Math.round(c.ticketMedio * (0.4 + pseudo(parseInt(c.id.slice(2)), i + 10) * 1.6) * (i > 9 - Math.floor(c.diasSemComprar / 30) ? 0 : 1))),
  }));
};

export const pedidosCliente = (id: string) => {
  const c = getClienteById(id);
  if (!c) return [];
  return Array.from({ length: Math.min(8, c.totalPedidos) }, (_, i) => ({
    id: `PED-${2000 + parseInt(c.id.slice(2)) * 10 + i}`,
    data: new Date(Date.now() - (c.diasSemComprar + i * 38) * 86400000).toISOString(),
    valor: Math.round(c.ticketMedio * (0.7 + pseudo(parseInt(c.id.slice(2)), i + 30) * 0.7)),
    itens: 1 + Math.floor(pseudo(parseInt(c.id.slice(2)), i + 50) * 8),
    status: i === 0 ? "Em separação" : "Entregue",
  }));
};

export const concentracaoPareto = (() => {
  const sorted = [...clientes].sort((a, b) => b.receitaTotal - a.receitaTotal);
  let acc = 0;
  return sorted.slice(0, 20).map((c, i) => {
    acc += c.receitaTotal;
    return {
      pos: i + 1,
      nome: c.nome,
      receita: c.receitaTotal,
      acumuladoPct: Math.round((acc / receitaTotal) * 1000) / 10,
    };
  });
})();