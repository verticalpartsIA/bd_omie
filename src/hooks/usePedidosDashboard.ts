import { useQuery } from "@tanstack/react-query";
import type { PedidosResponse } from "@/routes/api/pedidos";

export type { PedidoRow, PedidosKpis, StatusDistItem, AgingBucket, MonthlyItem, EtapaCicloItem } from "@/routes/api/pedidos";

const DEFAULT: PedidosResponse = {
  pedidos: [],
  kpis: { total: 0, emAberto: 0, carteira: 0, ticketMedio: 0, pedidosHoje: 0, pedidos30d: 0 },
  statusDist: [],
  agingDist: [],
  evolucaoMensal: [],
  etapasCiclo: [],
};

export function usePedidosDashboard() {
  const q = useQuery<PedidosResponse>({
    queryKey: ["pedidos-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/pedidos");
      if (!res.ok) throw new Error(`pedidos API: ${res.status}`);
      const json = await res.json() as PedidosResponse & { error?: string };
      if (json.error) throw new Error(json.error);
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { data: q.data ?? DEFAULT, isLoading: q.isLoading, isError: q.isError };
}
