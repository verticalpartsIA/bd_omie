import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AlertItem } from "@/components/app/AlertasRecomendacoes";

// ─── Raw view types ────────────────────────────────────────────────────────────

interface RawEbitda12m {
  mes_dt: string;
  mes: string;
  receita: number;
  margem: number;
  ebitda: number;
}

interface RawCaixaProjetado {
  data_base: string;
  entradas_d30: number;
  saidas_d30: number;
  saldo_d30: number;
  entradas_d90: number;
  saidas_d90: number;
  saldo_d90: number;
}

interface RawForecastMes {
  ano: number;
  mes: number;
  dia_atual: number;
  dias_no_mes: number;
  realizado: number;
  projetado: number;
  meta: number;
  pct_projetado_vs_meta: number;
  gap_meta: number;
}

interface RawAlertaCEO {
  prioridade: number;
  nivel: "critico" | "atencao" | "info";
  titulo: string;
  detalhe: string;
  acao: string;
}

interface RawReceitaRecorrente {
  codigo_cliente_omie: number;
  razao_social: string;
  classificacao: string;
  receita_recorrente: number;
}

interface RawConcentracao {
  codigo_cliente_omie: number;
  nome_cliente: string;
  receita_total: number;
  qtd_titulos: number;
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface Ebitda12mItem {
  mes: string;
  receita: number;
  margem: number;
  ebitda: number;
}

export interface ConcentracaoItem {
  nome: string;
  receita: number;
}

export interface StrategicKpis {
  // Receita / Margem
  receita: number;
  margemBruta: number;         // gross margin %
  // EBITDA
  ebitda: number;
  ebitdaPct: number;
  ebitdaDelta: number;
  // Resultado líquido (proxy: 65% of EBITDA)
  resultadoLiquido: number;
  margemLiquida: number;
  // Receita recorrente
  receitaRecorrente: number;
  receitaNaoRecorrente: number;
  // Caixa projetado
  caixa30: number;
  caixa60: number;
  caixa90: number;
  // Forecast
  forecastMes: { realizado: number; projetado: number; meta: number };
  // Chart data
  ebitda12m: Ebitda12mItem[];
}

export interface ConcentracaoData {
  top5: ConcentracaoItem[];
  top10: ConcentracaoItem[];
  top5Pct: number;
  top10Pct: number;
}

// ─── Individual hooks ─────────────────────────────────────────────────────────

function useEbitda12m() {
  return useQuery<Ebitda12mItem[]>({
    queryKey: ["ebitda_12m"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_ebitda_12m")
        .select("mes_dt,mes,receita,margem,ebitda")
        .order("mes_dt", { ascending: true });
      if (error) throw error;
      return (data as RawEbitda12m[]).map((r) => ({
        mes: r.mes,
        receita: Number(r.receita),
        margem: Number(r.margem),
        ebitda: Number(r.ebitda),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useCaixaProjetado() {
  return useQuery<RawCaixaProjetado | null>({
    queryKey: ["caixa_projetado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_caixa_projetado")
        .select("*")
        .single();
      if (error) throw error;
      return data as RawCaixaProjetado;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useForecastMes() {
  return useQuery<RawForecastMes | null>({
    queryKey: ["forecast_mes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_forecast_mes")
        .select("*")
        .single();
      if (error) throw error;
      return data as RawForecastMes;
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useAlertasCEO() {
  return useQuery<AlertItem[]>({
    queryKey: ["alertas_ceo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_alertas_ceo")
        .select("prioridade,nivel,titulo,detalhe,acao")
        .order("prioridade", { ascending: true })
        .limit(10);
      if (error) throw error;
      return (data as RawAlertaCEO[]).map((r) => ({
        level: r.nivel,
        title: r.titulo,
        detail: r.detalhe || undefined,
        acao: r.acao || undefined,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useReceitaRecorrente() {
  return useQuery<{ recorrente: number; total: number }>({
    queryKey: ["receita_recorrente"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_receita_recorrente")
        .select("receita_recorrente");
      if (error) throw error;
      const rows = data as Pick<RawReceitaRecorrente, "receita_recorrente">[];
      const recorrente = rows.reduce(
        (s, r) => s + Number(r.receita_recorrente),
        0,
      );
      return { recorrente, total: recorrente };
    },
    staleTime: 10 * 60 * 1000,
  });
}

function useConcentracao() {
  return useQuery<ConcentracaoData>({
    queryKey: ["concentracao_clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_concentracao_clientes")
        .select("nome_cliente,receita_total")
        .order("receita_total", { ascending: false })
        .limit(10);
      if (error) throw error;
      const rows = (data as RawConcentracao[]).map((r) => ({
        nome: r.nome_cliente,
        receita: Number(r.receita_total),
      }));
      const total = rows.reduce((s, r) => s + r.receita, 0);
      const top5 = rows.slice(0, 5);
      const top10 = rows.slice(0, 10);
      const pct = (arr: ConcentracaoItem[]) =>
        total > 0
          ? Math.round((arr.reduce((s, r) => s + r.receita, 0) / total) * 1000) / 10
          : 0;
      return { top5, top10, top5Pct: pct(top5), top10Pct: pct(top10) };
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Combined hook ────────────────────────────────────────────────────────────

export function useStrategicDashboard() {
  const ebitda12mQ = useEbitda12m();
  const caixaQ = useCaixaProjetado();
  const forecastQ = useForecastMes();
  const alertasQ = useAlertasCEO();
  const recorrenteQ = useReceitaRecorrente();
  const concentracaoQ = useConcentracao();

  const isLoading =
    ebitda12mQ.isLoading ||
    caixaQ.isLoading ||
    forecastQ.isLoading ||
    alertasQ.isLoading ||
    recorrenteQ.isLoading ||
    concentracaoQ.isLoading;

  const isError =
    !!ebitda12mQ.error ||
    !!caixaQ.error ||
    !!forecastQ.error ||
    !!alertasQ.error ||
    !!recorrenteQ.error ||
    !!concentracaoQ.error;

  // ── Derived KPIs from last completed month ──────────────────────────────────
  const ebitda12m = ebitda12mQ.data ?? [];
  // Pick second-to-last month as "completed" (last may be partial)
  const latestFull =
    ebitda12m.length >= 2
      ? ebitda12m[ebitda12m.length - 2]
      : ebitda12m[ebitda12m.length - 1];
  const prevMonth =
    ebitda12m.length >= 3 ? ebitda12m[ebitda12m.length - 3] : null;

  const currentEbitda = latestFull?.ebitda ?? 0;
  const currentReceita = latestFull?.receita ?? 0;
  const currentMargem = latestFull?.margem ?? 0;
  const prevEbitda = prevMonth?.ebitda ?? 0;

  const ebitdaPct =
    currentReceita > 0
      ? Math.round((currentEbitda / currentReceita) * 1000) / 10
      : 0;
  const margemBrutaPct =
    currentReceita > 0
      ? Math.round((currentMargem / currentReceita) * 1000) / 10
      : 0;
  const ebitdaDelta =
    prevEbitda > 0
      ? Math.round(((currentEbitda - prevEbitda) / prevEbitda) * 1000) / 10
      : 0;

  // Resultado líquido ≈ EBITDA – financial expenses (approx. 87%)
  const resultadoLiquido = Math.round(currentEbitda * 0.87);
  const margemLiquidaPct =
    currentReceita > 0
      ? Math.round((resultadoLiquido / currentReceita) * 1000) / 10
      : 0;

  // ── Receita recorrente ──────────────────────────────────────────────────────
  const recorrenteTotal = recorrenteQ.data?.recorrente ?? 0;
  const receitaNaoRecorrente = Math.max(0, currentReceita - recorrenteTotal);

  // ── Caixa ───────────────────────────────────────────────────────────────────
  const caixa = caixaQ.data;
  const caixa30 = caixa ? Number(caixa.saldo_d30) : 0;
  const caixa90 = caixa ? Number(caixa.saldo_d90) : 0;

  // ── Forecast ────────────────────────────────────────────────────────────────
  const fcast = forecastQ.data;
  const forecastMes = fcast
    ? {
        realizado: Number(fcast.realizado),
        projetado: Number(fcast.projetado),
        meta: Number(fcast.meta),
      }
    : { realizado: 0, projetado: 0, meta: 0 };

  const kpis: StrategicKpis = {
    receita: currentReceita,
    margemBruta: margemBrutaPct,
    ebitda: currentEbitda,
    ebitdaPct,
    ebitdaDelta,
    resultadoLiquido,
    margemLiquida: margemLiquidaPct,
    receitaRecorrente: recorrenteTotal,
    receitaNaoRecorrente,
    caixa30,
    caixa60: Math.round((caixa30 + caixa90) / 2), // linear interpolation
    caixa90,
    forecastMes,
    ebitda12m,
  };

  return {
    kpis,
    cockpitCEO: alertasQ.data ?? [],
    concentracao: concentracaoQ.data ?? {
      top5: [],
      top10: [],
      top5Pct: 0,
      top10Pct: 0,
    },
    isLoading,
    isError,
  };
}
