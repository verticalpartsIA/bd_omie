export type ClasseABC = "A" | "B" | "C";
export type StatusProduto = "ativo" | "critico" | "inativo";
export type TipoMovimentacao = "entrada" | "saida" | "ajuste";
export type SeverityAlerta = "alto" | "medio" | "baixo";
export type TipoAlerta = "ruptura" | "excesso" | "anomalia";

export interface Produto {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  unidade: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  custoUnitario: number;
  giro: number;
  diasCobertura: number;
  classeABC: ClasseABC;
  status: StatusProduto;
  ultimaMovimentacao: string;
  fornecedor?: string;
}

export interface Movimentacao {
  id: string;
  data: string;
  tipo: TipoMovimentacao;
  produtoId: string;
  sku: string;
  nomeProduto: string;
  quantidade: number;
  saldoApos: number;
  origem: string;
  responsavel: string;
}

export interface AlertaEstoque {
  id: string;
  produtoId: string;
  sku: string;
  nomeProduto: string;
  tipo: TipoAlerta;
  severity: SeverityAlerta;
  variacao: number;
  estoqueAtual: number;
  acaoSugerida: string;
}

export const categorias = ["Polias", "Cabos", "Painéis", "Motores", "Degraus", "Outros"] as const;

const seed: Array<Partial<Produto> & { sku: string; nome: string; categoria: string }> = [
  { sku: "POL-2230", nome: "Polia Raiada 220mm", categoria: "Polias", estoqueAtual: 284, estoqueMinimo: 50, custoUnitario: 240, giro: 4.8, diasCobertura: 42, classeABC: "A" },
  { sku: "CAB-6X19", nome: "Cabo Aço 6x19 ST", categoria: "Cabos", estoqueAtual: 12, estoqueMinimo: 80, custoUnitario: 95, giro: 6.1, diasCobertura: 4, classeABC: "A", status: "critico" },
  { sku: "POL-1803", nome: "Polia 180mm", categoria: "Polias", estoqueAtual: 847, estoqueMinimo: 100, custoUnitario: 180, giro: 1.2, diasCobertura: 210, classeABC: "B" },
  { sku: "MOT-0750", nome: "Motor 0,75kW", categoria: "Motores", estoqueAtual: 8, estoqueMinimo: 25, custoUnitario: 1840, giro: 3.2, diasCobertura: 9, classeABC: "A", status: "critico" },
  { sku: "CCM-V2", nome: "Painel CCM-V2", categoria: "Painéis", estoqueAtual: 2, estoqueMinimo: 10, custoUnitario: 4250, giro: 2.1, diasCobertura: 5, classeABC: "A", status: "critico" },
  { sku: "DEG-400", nome: "Degrau 400mm", categoria: "Degraus", estoqueAtual: 142, estoqueMinimo: 60, custoUnitario: 320, giro: 6.4, diasCobertura: 35, classeABC: "B" },
  { sku: "POL-2640", nome: "Polia 264mm", categoria: "Polias", estoqueAtual: 96, estoqueMinimo: 40, custoUnitario: 280, giro: 4.0, diasCobertura: 38, classeABC: "B" },
  { sku: "CAB-8X19", nome: "Cabo Aço 8x19", categoria: "Cabos", estoqueAtual: 220, estoqueMinimo: 50, custoUnitario: 142, giro: 4.7, diasCobertura: 44, classeABC: "A" },
  { sku: "MOT-1500", nome: "Motor 1,5kW", categoria: "Motores", estoqueAtual: 18, estoqueMinimo: 12, custoUnitario: 2980, giro: 3.8, diasCobertura: 32, classeABC: "A" },
  { sku: "MOT-2200", nome: "Motor 2,2kW", categoria: "Motores", estoqueAtual: 31, estoqueMinimo: 15, custoUnitario: 3650, giro: 3.5, diasCobertura: 40, classeABC: "B" },
  { sku: "PAN-SLM", nome: "Painel Slim", categoria: "Painéis", estoqueAtual: 22, estoqueMinimo: 10, custoUnitario: 2150, giro: 2.8, diasCobertura: 51, classeABC: "B" },
  { sku: "DEG-600", nome: "Degrau 600mm", categoria: "Degraus", estoqueAtual: 48, estoqueMinimo: 30, custoUnitario: 380, giro: 5.9, diasCobertura: 28, classeABC: "B" },
  { sku: "POL-2400", nome: "Polia 240mm", categoria: "Polias", estoqueAtual: 410, estoqueMinimo: 80, custoUnitario: 220, giro: 3.6, diasCobertura: 62, classeABC: "B" },
  { sku: "CAB-5MM", nome: "Cabo 5mm", categoria: "Cabos", estoqueAtual: 0, estoqueMinimo: 40, custoUnitario: 78, giro: 4.2, diasCobertura: 0, classeABC: "C", status: "critico" },
  { sku: "RLM-6204", nome: "Rolamento 6204", categoria: "Outros", estoqueAtual: 280, estoqueMinimo: 60, custoUnitario: 42, giro: 5.2, diasCobertura: 38, classeABC: "B" },
  { sku: "RLM-6206", nome: "Rolamento 6206", categoria: "Outros", estoqueAtual: 95, estoqueMinimo: 40, custoUnitario: 58, giro: 4.4, diasCobertura: 41, classeABC: "C" },
  { sku: "POL-1605", nome: "Polia 160mm", categoria: "Polias", estoqueAtual: 540, estoqueMinimo: 100, custoUnitario: 140, giro: 2.4, diasCobertura: 95, classeABC: "C" },
  { sku: "CAB-10MM", nome: "Cabo 10mm", categoria: "Cabos", estoqueAtual: 88, estoqueMinimo: 30, custoUnitario: 165, giro: 4.0, diasCobertura: 47, classeABC: "B" },
  { sku: "PAN-LCD", nome: "Painel LCD", categoria: "Painéis", estoqueAtual: 14, estoqueMinimo: 8, custoUnitario: 1850, giro: 2.5, diasCobertura: 38, classeABC: "B" },
  { sku: "MOT-3700", nome: "Motor 3,7kW", categoria: "Motores", estoqueAtual: 6, estoqueMinimo: 8, custoUnitario: 5240, giro: 2.9, diasCobertura: 22, classeABC: "A", status: "critico" },
  { sku: "DEG-800", nome: "Degrau 800mm", categoria: "Degraus", estoqueAtual: 25, estoqueMinimo: 20, custoUnitario: 460, giro: 4.8, diasCobertura: 30, classeABC: "C" },
  { sku: "POL-3200", nome: "Polia 320mm", categoria: "Polias", estoqueAtual: 4, estoqueMinimo: 20, custoUnitario: 420, giro: 5.0, diasCobertura: 3, classeABC: "A", status: "critico" },
  { sku: "CAB-12MM", nome: "Cabo 12mm", categoria: "Cabos", estoqueAtual: 320, estoqueMinimo: 80, custoUnitario: 195, giro: 3.9, diasCobertura: 50, classeABC: "B" },
  { sku: "RLM-6304", nome: "Rolamento 6304", categoria: "Outros", estoqueAtual: 60, estoqueMinimo: 30, custoUnitario: 64, giro: 3.8, diasCobertura: 44, classeABC: "C" },
  { sku: "PAN-TFT", nome: "Painel TFT", categoria: "Painéis", estoqueAtual: 9, estoqueMinimo: 6, custoUnitario: 2380, giro: 2.7, diasCobertura: 36, classeABC: "C" },
  { sku: "MOT-5500", nome: "Motor 5,5kW", categoria: "Motores", estoqueAtual: 3, estoqueMinimo: 4, custoUnitario: 7820, giro: 2.4, diasCobertura: 18, classeABC: "A", status: "critico" },
  { sku: "DEG-1000", nome: "Degrau 1000mm", categoria: "Degraus", estoqueAtual: 18, estoqueMinimo: 12, custoUnitario: 540, giro: 4.1, diasCobertura: 38, classeABC: "C" },
  { sku: "POL-2800", nome: "Polia 280mm", categoria: "Polias", estoqueAtual: 78, estoqueMinimo: 30, custoUnitario: 310, giro: 4.3, diasCobertura: 45, classeABC: "C" },
  { sku: "CAB-16MM", nome: "Cabo 16mm", categoria: "Cabos", estoqueAtual: 140, estoqueMinimo: 40, custoUnitario: 245, giro: 3.4, diasCobertura: 55, classeABC: "C" },
  { sku: "RLM-6308", nome: "Rolamento 6308", categoria: "Outros", estoqueAtual: 42, estoqueMinimo: 25, custoUnitario: 88, giro: 3.5, diasCobertura: 40, classeABC: "C" },
];

export const produtos: Produto[] = seed.map((p, i) => ({
  id: `p-${i + 1}`,
  unidade: "un",
  status: "ativo",
  ultimaMovimentacao: new Date(Date.now() - i * 86400000).toISOString(),
  fornecedor: ["MetalSul", "FioForte", "Eletrocom", "RodaTech"][i % 4],
  ...p,
} as Produto));

const origens = ["NF 004821", "NF 004822", "Pedido #1847", "Pedido #1851", "Ajuste Manual"];
const responsaveis = ["Carlos M.", "Beatriz A.", "Marcos L.", "Renata S."];

export const movimentacoes: Movimentacao[] = Array.from({ length: 120 }, (_, i) => {
  const p = produtos[i % produtos.length];
  const tipo: TipoMovimentacao = i % 3 === 0 ? "entrada" : i % 7 === 0 ? "ajuste" : "saida";
  const qty = tipo === "entrada" ? 50 + ((i * 7) % 200) : -(5 + ((i * 3) % 60));
  return {
    id: `m-${i + 1}`,
    data: new Date(Date.now() - i * 3600000 * 4).toISOString(),
    tipo,
    produtoId: p.id,
    sku: p.sku,
    nomeProduto: p.nome,
    quantidade: qty,
    saldoApos: Math.max(0, p.estoqueAtual + ((i * 13) % 80) - 40),
    origem: origens[i % origens.length],
    responsavel: responsaveis[i % responsaveis.length],
  };
});

export const alertasEstoque: AlertaEstoque[] = [
  { id: "a-1", produtoId: "p-2", sku: "CAB-6X19", nomeProduto: "Cabo Aço 6x19 ST", tipo: "anomalia", severity: "alto", variacao: -340, estoqueAtual: 12, acaoSugerida: "Repor urgente" },
  { id: "a-2", produtoId: "p-3", sku: "POL-1803", nomeProduto: "Polia 180mm", tipo: "excesso", severity: "medio", variacao: 180, estoqueAtual: 847, acaoSugerida: "Investigar saída" },
  { id: "a-3", produtoId: "p-4", sku: "MOT-0750", nomeProduto: "Motor 0,75kW", tipo: "anomalia", severity: "medio", variacao: -120, estoqueAtual: 8, acaoSugerida: "Verificar demanda" },
  { id: "a-4", produtoId: "p-5", sku: "CCM-V2", nomeProduto: "Painel CCM-V2", tipo: "ruptura", severity: "alto", variacao: -90, estoqueAtual: 2, acaoSugerida: "Repor urgente" },
  { id: "a-5", produtoId: "p-22", sku: "POL-3200", nomeProduto: "Polia 320mm", tipo: "ruptura", severity: "alto", variacao: -85, estoqueAtual: 4, acaoSugerida: "Repor urgente" },
  { id: "a-6", produtoId: "p-14", sku: "CAB-5MM", nomeProduto: "Cabo 5mm", tipo: "ruptura", severity: "alto", variacao: -100, estoqueAtual: 0, acaoSugerida: "Repor urgente" },
  { id: "a-7", produtoId: "p-26", sku: "MOT-5500", nomeProduto: "Motor 5,5kW", tipo: "ruptura", severity: "medio", variacao: -75, estoqueAtual: 3, acaoSugerida: "Repor" },
  { id: "a-8", produtoId: "p-17", sku: "POL-1605", nomeProduto: "Polia 160mm", tipo: "excesso", severity: "baixo", variacao: 95, estoqueAtual: 540, acaoSugerida: "Promover venda" },
];

export const kpisEstoque = {
  giroMedio: 4.2,
  giroMedioDelta: 0.3,
  diasCobertura: 38,
  diasCoberturaDelta: -4,
  rupturaPercentual: 3.2,
  rupturaPercentualDelta: 1.1,
  valorInventario: 1840000,
  valorInventarioDelta: 2.8,
  skusAtivos: 4128,
  skusAtivosDelta: -47,
};

export const abcTop15 = produtos
  .map((p) => ({ sku: p.sku, nome: p.nome, receita: Math.round(p.custoUnitario * p.giro * p.estoqueAtual * 0.05), classe: p.classeABC }))
  .sort((a, b) => b.receita - a.receita)
  .slice(0, 15);

export const giroPorCategoria = [
  { categoria: "Polias", giro: 5.1, meta: 4.0 },
  { categoria: "Cabos", giro: 4.7, meta: 4.0 },
  { categoria: "Painéis", giro: 2.3, meta: 3.0 },
  { categoria: "Motores", giro: 3.8, meta: 4.0 },
  { categoria: "Degraus", giro: 6.2, meta: 5.0 },
];

export function formatBRL(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

export function getProdutoById(id: string): Produto | undefined {
  return produtos.find((p) => p.id === id);
}

export const estoqueHistoricoMock = [
  { mes: "Nov/24", saldo: 320 },
  { mes: "Dez/24", saldo: 290 },
  { mes: "Jan/25", saldo: 415 },
  { mes: "Fev/25", saldo: 360 },
  { mes: "Mar/25", saldo: 295 },
  { mes: "Abr/25", saldo: 284 },
];

export const movimentacoesPorDia = Array.from({ length: 30 }, (_, i) => ({
  dia: `${String(((i % 28) + 1)).padStart(2, "0")}/05`,
  entradas: 80 + ((i * 17) % 200),
  saidas: 60 + ((i * 23) % 180),
}));