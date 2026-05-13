import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, Copy, Check } from "lucide-react";
import type { StrategicKpis, ConcentracaoData } from "@/hooks/useStrategicDashboard";
import type { AlertItem } from "@/components/app/AlertasRecomendacoes";
import { formatBRL } from "@/data/executive-mock";

export interface ClaudeChatHandle {
  ask: (question: string) => void;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  kpis: StrategicKpis;
  alertas: AlertItem[];
  concentracao: ConcentracaoData;
}

// ── Suggested questions ───────────────────────────────────────────────────────

function buildSuggestions(kpis: StrategicKpis, alertas: AlertItem[]): string[] {
  const suggestions: string[] = [
    "Por que o caixa D+90 está negativo e o que fazer?",
    "Como melhorar o forecast que está em " +
      Math.round((kpis.forecastMes.projetado / kpis.forecastMes.meta) * 100) +
      "% da meta?",
    "Qual é o risco da concentração de receita nos top clientes?",
  ];
  const criticos = alertas.filter((a) => a.level === "critico");
  if (criticos.length > 0) {
    suggestions.unshift(`Explique o alerta: "${criticos[0].title}"`);
  }
  return suggestions.slice(0, 4);
}

// ── Context builder ───────────────────────────────────────────────────────────

function buildContext(
  kpis: StrategicKpis,
  alertas: AlertItem[],
  concentracao: ConcentracaoData,
): string {
  const top5 = concentracao.top5
    .map((c, i) => `  #${i + 1} ${c.nome}: ${formatBRL(c.receita)}`)
    .join("\n");

  const alertList = alertas
    .map((a) => `  [${a.level.toUpperCase()}] ${a.title}: ${a.detail ?? ""}`)
    .join("\n");

  const trend = kpis.ebitda12m
    .map((m) => `  ${m.mes}: Receita ${formatBRL(m.receita)} | EBITDA ${formatBRL(m.ebitda)}`)
    .join("\n");

  return `Você é o analista de inteligência de negócios da VerticalParts, empresa brasileira especializada em peças e serviços de manutenção para elevadores.

Você tem acesso aos dados em tempo real do Strategic Dashboard e responde perguntas de forma concisa, direta e com foco em ações práticas.

=== INDICADORES DO MÊS ATUAL ===

RESULTADO FINANCEIRO:
- Receita do mês: ${formatBRL(kpis.receita)}
- Margem Bruta: ${kpis.margemBruta}%
- EBITDA: ${formatBRL(kpis.ebitda)} (${kpis.ebitdaPct}% margem, delta MoM: ${kpis.ebitdaDelta > 0 ? "+" : ""}${kpis.ebitdaDelta}%)
- Resultado Líquido: ${formatBRL(kpis.resultadoLiquido)} (${kpis.margemLiquida}% margem)
- Receita Recorrente (contratos): ${formatBRL(kpis.receitaRecorrente)}
- Receita Avulsa (não recorrente): ${formatBRL(kpis.receitaNaoRecorrente)}

CAIXA PROJETADO:
- Saldo D+30: ${formatBRL(kpis.caixa30)}${kpis.caixa30 < 0 ? " ⚠️ NEGATIVO" : ""}
- Saldo D+90: ${formatBRL(kpis.caixa90)}${kpis.caixa90 < 0 ? " ⚠️ NEGATIVO" : ""}

FORECAST DO MÊS:
- Realizado até agora: ${formatBRL(kpis.forecastMes.realizado)}
- Projeção para o mês: ${formatBRL(kpis.forecastMes.projetado)}
- Meta: ${formatBRL(kpis.forecastMes.meta)}
- % atingido da meta: ${Math.round((kpis.forecastMes.projetado / kpis.forecastMes.meta) * 100)}%
- Gap da meta: ${formatBRL(Math.max(0, kpis.forecastMes.meta - kpis.forecastMes.projetado))}

CONCENTRAÇÃO DE RECEITA (últimos 12 meses):
- Top 5 clientes representam ${concentracao.top5Pct}% da receita
- Top 10 clientes representam ${concentracao.top10Pct}% da receita
${top5}

=== ALERTAS ATIVOS (${alertas.length} alertas) ===
${alertList}

=== TENDÊNCIA 12 MESES (Receita × EBITDA) ===
${trend}

=== INSTRUÇÕES ===
- Responda sempre em português brasileiro
- Seja conciso (máximo 4 parágrafos curtos)
- Use marcadores (•) para listas
- Sempre sugira 1-2 ações práticas concretas
- Baseie suas análises nos dados acima
- Se o dado solicitado não está disponível, informe claramente`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ClaudeChat = forwardRef<ClaudeChatHandle, Props>(function ClaudeChat(
  { kpis, alertas, concentracao }: Props,
  ref,
) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    ask(question: string) {
      setOpen(true);
      // defer so the panel is rendered before sending
      setTimeout(() => send(question), 0);
    },
  }));

  const copyMessage = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  }, []);

  const suggestions = buildSuggestions(kpis, alertas);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && messages.length === 0) {
      inputRef.current?.focus();
    }
  }, [open, messages.length]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    const context = buildContext(kpis, alertas, concentracao);
    let answer = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, context }),
      });

      if (!res.ok || !res.body) throw new Error("Erro na API");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: answer,
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Desculpe, ocorreu um erro. Tente novamente.",
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-all duration-200 ${
          open
            ? "bg-neutral-900 text-white"
            : "bg-primary text-primary-foreground hover:scale-105"
        }`}
        title="Perguntar ao Claude"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-border bg-neutral-950 px-4 py-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-bold text-white">Analista IA</p>
              <p className="text-[10px] text-neutral-400">
                Powered by Claude · dados em tempo real
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground">
                  Sugestões baseadas no dashboard atual:
                </p>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-left text-[11px] text-foreground transition hover:border-primary/50 hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`group relative max-w-[88%] ${msg.role === "assistant" ? "w-full" : ""}`}>
                  <div
                    className={`rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-muted/60 text-foreground"
                    }`}
                  >
                    {msg.content || (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                  </div>
                  {msg.role === "assistant" && msg.content && (
                    <button
                      onClick={() => copyMessage(msg.content, i)}
                      className="absolute -bottom-5 right-0 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
                      title="Copiar resposta"
                    >
                      {copiedIdx === i ? (
                        <><Check className="h-3 w-3 text-green-500" /><span className="text-green-500">Copiado</span></>
                      ) : (
                        <><Copy className="h-3 w-3" /><span>Copiar</span></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="mb-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                ← Nova conversa
              </button>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Pergunte sobre qualquer indicador…"
                className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[12px] placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
});
