import { useQuery } from "@tanstack/react-query";
import type { EstoqueResponse } from "@/routes/api/estoque";

export type {
  ProdutoRow,
  CategoriaRow,
  EstoqueKpis,
  AbcItem,
  GiroItem,
  MovimentacaoRow,
  DiaMove,
  AgingItem,
  ClasseABC,
  StatusEstoque,
} from "@/routes/api/estoque";

const DEFAULT: EstoqueResponse = {
  produtos: [],
  categorias: [],
  kpis: {
    giroMedio: 0,
    diasCobertura: 0,
    rupturaPercentual: 0,
    valorInventario: 0,
    skusAtivos: 0,
    skusCriticos: 0,
    totalSkus: 0,
  },
  abcTop15: [],
  giroPorCategoria: [],
  movimentacoes: [],
  movimentacoesPorDia: [],
  aging: [],
};

export function useEstoqueDashboard() {
  const q = useQuery<EstoqueResponse>({
    queryKey: ["estoque-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/estoque");
      if (!res.ok) throw new Error(`estoque API: ${res.status}`);
      const json = await res.json() as EstoqueResponse & { error?: string };
      if (json.error) throw new Error(json.error);
      return json;
    },
    staleTime: 5 * 60 * 1000,
  });
  return { data: q.data ?? DEFAULT, isLoading: q.isLoading, isError: q.isError };
}
