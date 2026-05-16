import { useQuery } from "@tanstack/react-query";
import type { VendedoresResponse } from "@/routes/api/vendedores";

export type { VendedorRow, EtapaItem, VendedoresKpis } from "@/routes/api/vendedores";

const DEFAULT: VendedoresResponse = {
  vendedores: [],
  kpis: { totalPedidos12m: 0, totalReceita12m: 0, ticketMedio: 0, totalVendedores: 0, topVendedor: "—" },
  etapas: [],
  evolucaoMensal: [],
  topVendedoresNomes: [],
};

export function useVendedoresDashboard() {
  const q = useQuery<VendedoresResponse>({
    queryKey: ["vendedores-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/vendedores");
      if (!res.ok) throw new Error(`vendedores API: ${res.status}`);
      const json = await res.json() as VendedoresResponse & { error?: string };
      if (json.error) throw new Error(json.error);
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { data: q.data ?? DEFAULT, isLoading: q.isLoading, isError: q.isError };
}
