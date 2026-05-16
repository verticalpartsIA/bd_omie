import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { NfeResponse, NfeItemProduto } from "@/routes/api/nfe";

const DEFAULT: NfeResponse = {
  custos: [],
  status: { totalEntradas: 0, totalSaidas: 0, syncedAt: "", tabelaExiste: false },
};

export type { NfeItemProduto };

export function useNfeDashboard() {
  const q = useQuery<NfeResponse>({
    queryKey: ["nfe-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/nfe");
      if (!res.ok) throw new Error(`nfe API: ${res.status}`);
      const json = await res.json() as NfeResponse & { error?: string };
      if (json.error) throw new Error(json.error);
      return json;
    },
    staleTime: 10 * 60 * 1000, // 10 min — custo muda raramente
    retry: false, // se tabela não existe, não tenta de novo
  });

  const qc = useQueryClient();

  async function triggerSync(): Promise<string> {
    const res = await fetch("/api/nfe?sync=1");
    const json = await res.json() as NfeResponse & { syncMsg?: string; syncDebug?: string; error?: string };
    if (json.error) throw new Error(json.error);
    await qc.invalidateQueries({ queryKey: ["nfe-dashboard"] });
    await qc.invalidateQueries({ queryKey: ["estoque-dashboard"] });
    const msg = json.syncMsg ?? "Sincronização concluída";
    // Se houve erros parciais, inclui no retorno para o toast mostrar
    return json.syncDebug ? `${msg} | ${json.syncDebug}` : msg;
  }

  // Build a lookup map for quick access by sku/codigo
  const custoMap = new Map<string, NfeItemProduto>(
    (q.data?.custos ?? []).map((c) => [c.codigo, c])
  );

  return {
    data: q.data ?? DEFAULT,
    custoMap,
    isLoading: q.isLoading,
    isError: q.isError,
    tabelaExiste: q.data?.status.tabelaExiste ?? false,
    triggerSync,
  };
}
