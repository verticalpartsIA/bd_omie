import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { StrategicKpis, ConcentracaoData } from "./useStrategicDashboard";

// ── Raw CR/CP sums query ───────────────────────────────────────────────────────

function useCRCPSums() {
  return useQuery({
    queryKey: ["strategic_finance_sums"],
    queryFn: async () => {
      const [cr, cp, inad] = await Promise.all([
        supabase
          .from("CR_Omie")
          .select("valor_documento")
          .in("status_titulo", ["A RECEBER", "ATRASADO"])
          .limit(5000),
        supabase
          .from("CP_Omie")
          .select("valor_documento")
          .eq("status_titulo", "A VENCER")
          .limit(5000),
        supabase
          .from("CR_Omie")
          .select("valor_documento")
          .eq("status_titulo", "ATRASADO")
          .limit(5000),
      ]);

      const sum = (rows: { valor_documento: number | null }[] | null) =>
        (rows ?? []).reduce((s, r) => s + Number(r.valor_documento ?? 0), 0);

      return {
        crAberto:      sum((cr.data   ?? []) as { valor_documento: number | null }[]),
        cpAberto:      sum((cp.data   ?? []) as { valor_documento: number | null }[]),
        inadimplencia: sum((inad.data ?? []) as { valor_documento: number | null }[]),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ── Public types ──────────────────────────────────────────────────────────────

export type FinanceStatus = "saudavel" | "atencao" | "critico";
export type HealthStatus  = "excelente" | "saudavel" | "atencao" | "critico";

export interface HealthDimension {
  score: number;   // 0–100
  peso:  number;   // weight (sum = 1.0)
  label: string;
}

export interface StrategicFinanceData {
  // Base
  crAberto:      number;
  cpAberto:      number;
  inadimplencia: number;
  inadPct:       number; // % de CR

  // NCG
  ncg:       number;
  ncgStatus: FinanceStatus;

  // Ciclo Financeiro
  pmr:             number; // dias
  pmp:             number; // dias
  pme:             number; // dias (estimado: benchmark 45d distribuidora)
  cicloFinanceiro: number;

  // Liquidez
  liquidezCorrente: number;
  liquidezImediata: number;
  liquidezStatus:   FinanceStatus;

  // Caixa de Segurança
  mediaDiariaSaidas: number;
  caixaSeguranca30:  number;
  caixaSeguranca60:  number;
  caixaSeguranca90:  number;
  diasCobertura:     number;

  // Endividamento Operacional
  dividaOperacional: number;
  dividaEbitdaRatio: number;
  dividaStatus:      FinanceStatus;

  // Ponto de Equilíbrio (estimado)
  pontoEquilibrio:     number;
  margemContribuicao:  number; // %
  margemSeguranca:     number; // % = (receita - PE) / receita

  // ROE / ROA / ROI — parcial (sem balanço patrimonial completo)
  roeDisponivel: boolean;
  roaDisponivel: boolean;
  // ROI do estoque (estimado): volume / capital imobilizado proxy
  roiEstoque: number | null;

  // Executive Health Score
  healthScore:    number;  // 0–100
  healthStatus:   HealthStatus;
  healthBreakdown: Record<string, HealthDimension>;

  isLoading: boolean;
  isError:   boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number) { return Math.max(0, Math.min(100, v)); }

// ── Main hook ─────────────────────────────────────────────────────────────────

export function useStrategicFinance(
  kpis:         StrategicKpis,
  concentracao: ConcentracaoData,
): StrategicFinanceData {
  const sumsQ = useCRCPSums();
  const sums  = sumsQ.data;

  return useMemo<StrategicFinanceData>(() => {
    const isLoading = sumsQ.isLoading;
    const isError   = !!sumsQ.error;

    const crAberto      = sums?.crAberto      ?? 0;
    const cpAberto      = sums?.cpAberto      ?? 0;
    const inadimplencia = sums?.inadimplencia ?? 0;
    const inadPct = crAberto > 0 ? Math.round((inadimplencia / crAberto) * 1000) / 10 : 0;

    // Receita / EBITDA últimos 12 meses
    const receita12m = kpis.ebitda12m.reduce((s, m) => s + m.receita, 0);
    const ebitda12m  = kpis.ebitda12m.reduce((s, m) => s + m.ebitda,  0);
    // Referência de período (mês corrente ou último completo)
    const receita = kpis.receita > 0 ? kpis.receita : receita12m / 12;
    const ebitda  = kpis.ebitda;

    // ── NCG ───────────────────────────────────────────────────────────────────
    const ncg = crAberto - cpAberto;
    const ncgStatus: FinanceStatus =
      ncg < 0              ? "saudavel" :
      ncg < crAberto * 0.5 ? "atencao"  : "critico";

    // ── Ciclo Financeiro ──────────────────────────────────────────────────────
    const pmr = receita12m > 0
      ? Math.round(crAberto / (receita12m / 365))
      : 0;
    // COGS ≈ receita12m * (1 - margemBruta/100)
    const cogsAnual = receita12m * (1 - Math.max(0, kpis.margemBruta) / 100);
    const pmp = cogsAnual > 0
      ? Math.round(cpAberto / (cogsAnual / 365))
      : 0;
    const pme = 45; // benchmark: distribuidora de peças importadas
    const cicloFinanceiro = pmr + pme - pmp;

    // ── Liquidez ──────────────────────────────────────────────────────────────
    const liquidezCorrente = cpAberto > 0
      ? Math.round((crAberto / cpAberto) * 100) / 100
      : 9.99;
    const liquidezImediata = cpAberto > 0
      ? Math.round((Math.max(0, kpis.caixa30) / cpAberto) * 100) / 100
      : 0;
    const liquidezStatus: FinanceStatus =
      liquidezCorrente < 1.0 ? "critico" :
      liquidezCorrente < 1.3 ? "atencao"  : "saudavel";

    // ── Caixa de Segurança ────────────────────────────────────────────────────
    // Saída diária estimada: CP total dividido por 90 dias de janela
    const mediaDiariaSaidas = cpAberto > 0 ? Math.round(cpAberto / 90) : 0;
    const caixaSeguranca30  = mediaDiariaSaidas * 30;
    const caixaSeguranca60  = mediaDiariaSaidas * 60;
    const caixaSeguranca90  = mediaDiariaSaidas * 90;
    const diasCobertura = mediaDiariaSaidas > 0
      ? Math.round(Math.max(0, kpis.caixa30) / mediaDiariaSaidas)
      : 0;

    // ── Endividamento ─────────────────────────────────────────────────────────
    const dividaOperacional = cpAberto;
    const dividaEbitdaRatio = ebitda12m > 0
      ? Math.round((dividaOperacional / ebitda12m) * 100) / 100
      : 0;
    const dividaStatus: FinanceStatus =
      dividaEbitdaRatio > 3   ? "critico" :
      dividaEbitdaRatio > 1.5 ? "atencao"  : "saudavel";

    // ── Ponto de Equilíbrio ───────────────────────────────────────────────────
    const margemContribuicao = kpis.margemBruta > 0 ? kpis.margemBruta : 35;
    // Custos fixos estimados = receita - EBITDA (total de despesas operacionais)
    const custosFixos = receita > ebitda && ebitda > 0 ? receita - ebitda : receita * 0.7;
    const pontoEquilibrio = margemContribuicao > 0
      ? Math.round(custosFixos / (margemContribuicao / 100))
      : 0;
    const margemSeguranca = receita > 0 && pontoEquilibrio > 0
      ? Math.round(((receita - pontoEquilibrio) / receita) * 1000) / 10
      : 0;

    // ── ROI de Estoque (estimado) ─────────────────────────────────────────────
    // Sem custo unitário disponível — não calculável com precisão
    const roiEstoque: number | null = null;

    // ── Executive Health Score ────────────────────────────────────────────────
    const forecastPct = kpis.forecastMes.meta > 0
      ? (kpis.forecastMes.projetado / kpis.forecastMes.meta) * 100
      : 80;

    const breakdown: Record<string, HealthDimension> = {
      ebitda: {
        score: clamp(Math.round((kpis.ebitdaPct / 15) * 100)),
        peso:  0.15,
        label: "EBITDA",
      },
      margemBruta: {
        score: clamp(Math.round((kpis.margemBruta / 50) * 100)),
        peso:  0.10,
        label: "Margem Bruta",
      },
      caixa: {
        score: kpis.caixa30 < 0
          ? 0
          : kpis.caixa30 < caixaSeguranca30 * 0.5 ? 40
          : kpis.caixa30 < caixaSeguranca30        ? 70 : 100,
        peso:  0.15,
        label: "Caixa D+30",
      },
      liquidez: {
        score: liquidezCorrente < 0.8 ? 0 : liquidezCorrente < 1.0 ? 30 : liquidezCorrente < 1.3 ? 70 : 100,
        peso:  0.10,
        label: "Liquidez",
      },
      inadimplencia: {
        score: inadPct > 30 ? 0 : inadPct > 15 ? 40 : inadPct > 5 ? 70 : 100,
        peso:  0.10,
        label: "Inadimplência",
      },
      estoque: {
        score: 70, // neutro — sem contagem de críticos direto aqui
        peso:  0.10,
        label: "Estoque",
      },
      concentracao: {
        score: concentracao.top5Pct > 70 ? 0 : concentracao.top5Pct > 50 ? 40 : concentracao.top5Pct > 35 ? 70 : 100,
        peso:  0.10,
        label: "Concentração",
      },
      forecast: {
        score: forecastPct >= 100 ? 100 : forecastPct >= 90 ? 80 : forecastPct >= 75 ? 60 : 40,
        peso:  0.10,
        label: "Forecast",
      },
      ncg: {
        score: ncg < 0 ? 100 : ncg < crAberto * 0.3 ? 90 : ncg < crAberto * 0.6 ? 70 : 50,
        peso:  0.10,
        label: "Capital de Giro",
      },
    };

    const healthScore = Math.round(
      Object.values(breakdown).reduce((s, d) => s + d.score * d.peso, 0),
    );
    const healthStatus: HealthStatus =
      healthScore >= 85 ? "excelente" :
      healthScore >= 70 ? "saudavel"  :
      healthScore >= 50 ? "atencao"   : "critico";

    return {
      crAberto, cpAberto, inadimplencia, inadPct,
      ncg, ncgStatus,
      pmr, pmp, pme, cicloFinanceiro,
      liquidezCorrente, liquidezImediata, liquidezStatus,
      mediaDiariaSaidas, caixaSeguranca30, caixaSeguranca60, caixaSeguranca90, diasCobertura,
      dividaOperacional, dividaEbitdaRatio, dividaStatus,
      pontoEquilibrio, margemContribuicao, margemSeguranca,
      roeDisponivel: false,
      roaDisponivel: false,
      roiEstoque,
      healthScore, healthStatus, healthBreakdown: breakdown,
      isLoading, isError,
    };
  }, [sums, sumsQ.isLoading, sumsQ.error, kpis, concentracao]);
}
