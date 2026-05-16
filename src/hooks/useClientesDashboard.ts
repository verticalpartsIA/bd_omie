import { useQuery } from "@tanstack/react-query";
import type { ClientesResponse } from "@/routes/api/clientes";

export type { ClienteRow, StatusCliente, RFMSegmento, RFMDist, ClientesKpis } from "@/routes/api/clientes";
export { RFM_COLORS, RFM_LABELS } from "@/routes/api/clientes";

const DEFAULT: ClientesResponse = {
  clientes: [],
  kpis: {
    baseAtiva: 0, baseInativa: 0, emRisco: 0,
    receitaTotal: 0, ticketMedio: 0,
    concentracaoTop10: 0, ltvMedio: 0, totalClientes: 0,
  },
  rfmDist: [],
  concentracaoPareto: [],
  top10: [],
  mesesNovos: [],
};

export function useClientesDashboard() {
  const q = useQuery<ClientesResponse>({
    queryKey: ["clientes-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/clientes");
      if (!res.ok) throw new Error(`clientes API: ${res.status}`);
      const json = await res.json() as ClientesResponse & { error?: string };
      if (json.error) throw new Error(json.error);
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { data: q.data ?? DEFAULT, isLoading: q.isLoading, isError: q.isError };
}
