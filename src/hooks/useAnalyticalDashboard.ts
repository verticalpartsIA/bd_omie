import { useQuery } from "@tanstack/react-query";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CohortRow {
  mes: string;
  novos: number;
  m1?: number;
  m2?: number;
  m3?: number;
  m4?: number;
  m5?: number;
}

export interface AnalyticalData {
  ticketMedio: number;
  recompraPct: number;
  itensPorPedido: number;
  topVendedor: { nome: string; pedidos: number };
  topClientes: { name: string; v: number }[];
  topProdutos: { sku: string; desc: string; qty: number; rev: number }[];
  vendedores: { name: string; v: number }[];
  seasonality: { m: string; v: number }[];
  peakMonth: string;
  cohort: CohortRow[];
  totalPedidos12m: number;
  mesAtual: string;
}

const DEFAULT: AnalyticalData = {
  ticketMedio: 0,
  recompraPct: 0,
  itensPorPedido: 0,
  topVendedor: { nome: "—", pedidos: 0 },
  topClientes: [],
  topProdutos: [],
  vendedores: [],
  seasonality: [],
  peakMonth: "—",
  cohort: [],
  totalPedidos12m: 0,
  mesAtual: "—",
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAnalyticalDashboard() {
  const q = useQuery<AnalyticalData>({
    queryKey: ["analytical-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/analytical");
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`analytical API ${res.status}: ${body.slice(0, 200)}`);
      }
      const json = await res.json() as AnalyticalData & { error?: string };
      if (json.error) throw new Error(`analytical API: ${json.error}`);
      return json;
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });

  return {
    data: q.data ?? DEFAULT,
    isLoading: q.isLoading,
    isError: q.isError,
  };
}
