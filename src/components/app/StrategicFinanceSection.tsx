/**
 * StrategicFinanceSection
 * Seção "Inteligência Financeira Estratégica" — 10 indicadores estratégicos
 * Inserida no Strategic Dashboard abaixo dos gráficos existentes.
 */
import { Sparkles, TrendingUp, Clock, Droplets, ShieldCheck, BarChart3, Target, Activity, Flame, Star } from "lucide-react";
import { formatBRL } from "@/data/executive-mock";
import type { StrategicFinanceData, FinanceStatus, HealthStatus } from "@/hooks/useStrategicFinance";

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(s: FinanceStatus | HealthStatus | string) {
  switch (s) {
    case "excelente": return "text-blue-500";
    case "saudavel":  return "text-emerald-500";
    case "atencao":   return "text-yellow-500";
    case "critico":   return "text-destructive";
    default:          return "text-muted-foreground";
  }
}
function statusBg(s: FinanceStatus | HealthStatus | string) {
  switch (s) {
    case "excelente": return "bg-blue-500/10 text-blue-500";
    case "saudavel":  return "bg-emerald-500/10 text-emerald-500";
    case "atencao":   return "bg-yellow-500/10 text-yellow-500";
    case "critico":   return "bg-destructive/10 text-destructive";
    default:          return "bg-muted text-muted-foreground";
  }
}
function statusLabel(s: FinanceStatus | HealthStatus | string) {
  const map: Record<string, string> = {
    excelente: "Excelente", saudavel: "Saudável",
    atencao: "Atenção",     critico: "Crítico",
  };
  return map[s] ?? s;
}

// ── Mini Card ─────────────────────────────────────────────────────────────────

interface CardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  status: FinanceStatus | HealthStatus | string;
  onAsk: () => void;
  partial?: boolean; // if data is partial/estimated
}

function FinanceCard({ icon, title, value, subtitle, status, onAsk, partial }: CardProps) {
  return (
    <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 shrink-0">{icon}</span>
          <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
        </div>
        <button
          onClick={onAsk}
          title="Perguntar ao Analista IA"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
        </button>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className={`font-mono text-xl font-extrabold leading-none ${statusColor(status)}`}>
          {value}
        </span>
        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusBg(status)}`}>
          {statusLabel(status)}
        </span>
      </div>
      <p className="text-[10px] leading-snug text-muted-foreground">
        {subtitle}
        {partial && <span className="ml-1 italic">(estimativa)</span>}
      </p>
    </div>
  );
}

// ── Executive Health Score Card ───────────────────────────────────────────────

function HealthScoreCard({ data, onAsk }: { data: StrategicFinanceData; onAsk: () => void }) {
  const dims = Object.values(data.healthBreakdown).sort((a, b) => a.score - b.score);
  const worst = dims.slice(0, 3);

  return (
    <div className="relative flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-4 w-4 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest">Executive Health Score</span>
        </div>
        <button
          onClick={onAsk}
          title="Perguntar ao Analista IA"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-primary hover:bg-primary/15 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center gap-5">
        {/* Score circle */}
        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 font-mono text-2xl font-black
          ${data.healthStatus === "excelente" ? "border-blue-500 text-blue-500"
          : data.healthStatus === "saudavel"  ? "border-emerald-500 text-emerald-500"
          : data.healthStatus === "atencao"   ? "border-yellow-500 text-yellow-500"
          : "border-destructive text-destructive"}`}
        >
          {data.healthScore}
        </div>
        {/* Score bar */}
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <span className={`text-sm font-bold ${statusColor(data.healthStatus)}`}>
              {statusLabel(data.healthStatus)}
            </span>
            <span className="text-[10px] text-muted-foreground">0 — 100</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-700
                ${data.healthStatus === "excelente" ? "bg-blue-500"
                : data.healthStatus === "saudavel"  ? "bg-emerald-500"
                : data.healthStatus === "atencao"   ? "bg-yellow-500"
                : "bg-destructive"}`}
              style={{ width: `${data.healthScore}%` }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground">85+ Excelente · 70–84 Saudável · 50–69 Atenção · &lt;50 Crítico</p>
        </div>
      </div>

      {/* Worst 3 dimensions */}
      {worst.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="mb-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Dimensões com menor score</p>
          <div className="grid grid-cols-3 gap-2">
            {worst.map((d) => (
              <div key={d.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{d.label}</span>
                  <span className={`text-[10px] font-bold ${d.score >= 70 ? "text-emerald-500" : d.score >= 50 ? "text-yellow-500" : "text-destructive"}`}>
                    {d.score}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${d.score >= 70 ? "bg-emerald-500" : d.score >= 50 ? "bg-yellow-500" : "bg-destructive"}`}
                    style={{ width: `${d.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────

interface Props {
  data: StrategicFinanceData;
}

function ask(q: string) {
  window.dispatchEvent(new CustomEvent("claude-ask", { detail: q }));
}

export function StrategicFinanceSection({ data }: Props) {
  if (data.isLoading) {
    return (
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <Star className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
            Inteligência Financeira Estratégica
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  const cicloStatus = data.cicloFinanceiro < 30 ? "saudavel" : data.cicloFinanceiro < 60 ? "atencao" : "critico";
  const peStatus = data.margemSeguranca > 20 ? "saudavel" : data.margemSeguranca > 10 ? "atencao" : "critico";
  const diasStatus = data.diasCobertura >= 60 ? "saudavel" : data.diasCobertura >= 30 ? "atencao" : "critico";

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Star className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
              Inteligência Financeira Estratégica
            </h3>
            <p className="text-[11px] text-muted-foreground">
              NCG · Ciclo · Liquidez · Endividamento · Equilíbrio · Família Rs · Health Score
            </p>
          </div>
        </div>
        <button
          onClick={() => ask("Faça um diagnóstico completo da saúde financeira estratégica da empresa: NCG, ciclo financeiro, liquidez, endividamento, ponto de equilíbrio e Executive Health Score. Use a estrutura SITUAÇÃO → DIAGNÓSTICO → RISCO → AÇÃO.")}
          className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Diagnóstico Completo
        </button>
      </div>

      {/* Row 1: NCG · Ciclo · Liquidez · Caixa Segurança · Endividamento */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <FinanceCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="NCG Estimada"
          value={formatBRL(data.ncg)}
          subtitle={`CR ${formatBRL(data.crAberto)} − CP ${formatBRL(data.cpAberto)}`}
          status={data.ncgStatus}
          partial
          onAsk={() => ask(`A NCG estimada da empresa é ${formatBRL(data.ncg)} (CR aberto ${formatBRL(data.crAberto)} − CP aberto ${formatBRL(data.cpAberto)}). O que isso indica sobre a necessidade de capital de giro? Estou crescendo com saúde ou consumindo caixa?`)}
        />
        <FinanceCard
          icon={<Clock className="h-4 w-4" />}
          title="Ciclo Financeiro"
          value={`${data.cicloFinanceiro}d`}
          subtitle={`PMR ${data.pmr}d + PME ${data.pme}d − PMP ${data.pmp}d`}
          status={cicloStatus}
          partial
          onAsk={() => ask(`Meu ciclo financeiro é de ${data.cicloFinanceiro} dias (PMR ${data.pmr}d + PME ${data.pme}d − PMP ${data.pmp}d). Isso é saudável para uma distribuidora de peças importadas? O que devo fazer para reduzir?`)}
        />
        <FinanceCard
          icon={<Droplets className="h-4 w-4" />}
          title="Liquidez Corrente"
          value={`${data.liquidezCorrente}x`}
          subtitle={`Imediata: ${data.liquidezImediata}x · CR/CP`}
          status={data.liquidezStatus}
          partial
          onAsk={() => ask(`A liquidez corrente está em ${data.liquidezCorrente}x e a liquidez imediata em ${data.liquidezImediata}x. Minha liquidez é suficiente para suportar os próximos meses? Quais ações melhoram esse indicador?`)}
        />
        <FinanceCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Caixa de Segurança"
          value={`${data.diasCobertura}d`}
          subtitle={`Recomendado 30d: ${formatBRL(data.caixaSeguranca30)}`}
          status={diasStatus}
          partial
          onAsk={() => ask(`Meu caixa atual cobre ${data.diasCobertura} dias de operação. O recomendado para uma empresa com importação e ciclo longo é 60–90 dias. Qual o risco atual e o que fazer para fortalecer o colchão de caixa?`)}
        />
        <FinanceCard
          icon={<BarChart3 className="h-4 w-4" />}
          title="Dívida / EBITDA 12M"
          value={`${data.dividaEbitdaRatio}x`}
          subtitle={`Dívida operacional: ${formatBRL(data.dividaOperacional)}`}
          status={data.dividaStatus}
          partial
          onAsk={() => ask(`O índice de dívida operacional / EBITDA 12m está em ${data.dividaEbitdaRatio}x com dívida operacional de ${formatBRL(data.dividaOperacional)}. Posso usar capital de terceiros para crescer sem aumentar o risco? Qual a capacidade de alavancagem atual?`)}
        />
      </div>

      {/* Row 2: Ponto de Equilíbrio · Margem Contribuição · ROE · ROA · ROI */}
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <FinanceCard
          icon={<Target className="h-4 w-4" />}
          title="Ponto de Equilíbrio"
          value={formatBRL(data.pontoEquilibrio)}
          subtitle={`Margem segurança: ${data.margemSeguranca}%`}
          status={peStatus}
          partial
          onAsk={() => ask(`O ponto de equilíbrio estimado é ${formatBRL(data.pontoEquilibrio)} por mês. A margem de segurança atual é de ${data.margemSeguranca}%. Quanto preciso faturar para cobrir minha estrutura? O que acontece se a receita cair?`)}
        />
        <FinanceCard
          icon={<Percent className="h-4 w-4" />}
          title="Margem Contribuição"
          value={`${data.margemContribuicao}%`}
          subtitle="Proxy: margem bruta (contribuição por venda)"
          status={data.margemContribuicao > 40 ? "saudavel" : data.margemContribuicao > 25 ? "atencao" : "critico"}
          partial
          onAsk={() => ask(`A margem de contribuição estimada é ${data.margemContribuicao}%. O que isso significa? Estou vendendo mais mas ganhando menos? Como melhorar a margem sem perder volume?`)}
        />
        <FinanceCard
          icon={<Star className="h-4 w-4" />}
          title="ROE"
          value="—"
          subtitle="Aguarda dado patrimonial (PL não mapeado)"
          status="atencao"
          onAsk={() => ask("O ROE (Retorno sobre Patrimônio Líquido) ainda não pode ser calculado pois o patrimônio líquido não está mapeado no sistema. O que é o ROE, como interpretá-lo e por que ele importa para a VerticalParts? O retorno do negócio compensa o capital investido?")}
        />
        <FinanceCard
          icon={<Flame className="h-4 w-4" />}
          title="ROA"
          value="—"
          subtitle="Aguarda mapeamento de ativos totais"
          status="atencao"
          onAsk={() => ask("O ROA (Retorno sobre Ativos) ainda não pode ser calculado pois os ativos totais não estão mapeados. O que é o ROA, como ele se aplica a uma distribuidora de peças importadas e como melhorar a eficiência dos ativos?")}
        />
        <FinanceCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="ROI do Estoque"
          value="—"
          subtitle="Aguarda custo unitário dos produtos"
          status="atencao"
          onAsk={() => ask("O ROI do estoque não pode ser calculado com precisão pois o custo unitário médio não está disponível. Quais categorias de produtos provavelmente entregam maior ROI? Vale a pena aumentar estoque agora ou o capital está preso?")}
        />
      </div>

      {/* Row 3: Executive Health Score (wide) + Simulador CTA */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <HealthScoreCard
          data={data}
          onAsk={() => ask(`Meu Executive Health Score é ${data.healthScore}/100 (${data.healthStatus}). Explique cada dimensão, por que puxam a nota para baixo, e o que o CEO deve decidir hoje para melhorar o score.`)}
        />
        <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Simulador Estratégico</span>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Simule cenários what-if: crescimento de 10%, 30% ou 50%.
              Impacto no caixa, NCG, capacidade de estoque e risco de liquidez.
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {[10, 30, 50].map((pct) => (
              <button
                key={pct}
                onClick={() => ask(`Simule o cenário de crescimento de ${pct}% ao ano para a VerticalParts. Mantendo o ciclo financeiro atual, qual seria o impacto no caixa, na NCG, na necessidade de estoque e no risco de liquidez? Preciso de capital adicional?`)}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-[11px] hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <span className="font-semibold">Crescer +{pct}%</span>
                <Sparkles className="h-3 w-3 text-primary" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Missing import ─────────────────────────────────────────────────────────────
// Needed inline because lucide-react Percent isn't imported above
function Percent({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}
