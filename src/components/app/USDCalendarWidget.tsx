import { useState, useEffect, useRef } from "react";
import { CalendarDays } from "lucide-react";

export function USDCalendarWidget() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const isToday = date === today;

  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

  useEffect(() => {
    setLoading(true);
    setRate(null);
    const controller = new AbortController();

    async function fetchRate() {
      try {
        if (isToday) {
          // Cotação em tempo real
          const res = await fetch(
            "https://economia.awesomeapi.com.br/json/last/USD-BRL",
            { signal: controller.signal },
          );
          const json = await res.json();
          setRate(Number(json.USDBRL.bid));
        } else {
          // Cotação histórica: busca o fechamento do dia selecionado
          const d = new Date(date + "T12:00:00");
          const startTs = Math.floor(d.getTime() / 1000);
          const endTs = startTs + 86_400;
          const res = await fetch(
            `https://economia.awesomeapi.com.br/json/daily/USD-BRL/1?start_timestamp=${startTs}&end_timestamp=${endTs}`,
            { signal: controller.signal },
          );
          const json = await res.json();
          if (Array.isArray(json) && json[0]) {
            setRate(Number(json[0].bid));
          } else {
            setRate(null);
          }
        }
      } catch {
        /* abortado ou sem rede */
      } finally {
        setLoading(false);
      }
    }

    fetchRate();

    // Atualiza a cotação ao vivo a cada 5 minutos quando for hoje
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isToday) {
      interval = setInterval(fetchRate, 5 * 60 * 1000);
    }

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [date, isToday]);

  function openPicker() {
    const el = inputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); } catch { el.click(); }
    } else {
      el.click();
    }
  }

  return (
    <div className="flex items-center gap-0 rounded-lg border border-border bg-muted/40 text-sm overflow-hidden">
      {/* Lado esquerdo — Data + calendário */}
      <button
        type="button"
        onClick={openPicker}
        title="Selecionar data"
        className="relative flex items-center gap-1.5 px-3 py-1.5 hover:bg-muted/80 transition-colors"
      >
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[12px] font-semibold capitalize tracking-tight">
          {displayDate}
        </span>
        {!isToday && (
          <span className="ml-0.5 rounded bg-primary/10 px-1 py-px text-[9px] font-bold text-primary">
            histórico
          </span>
        )}
        <input
          ref={inputRef}
          type="date"
          value={date}
          max={today}
          onChange={(e) => { if (e.target.value) setDate(e.target.value); }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          tabIndex={-1}
          aria-label="Selecionar data para cotação do dólar"
        />
      </button>

      {/* Divisor */}
      <div className="h-5 w-px bg-border" />

      {/* Lado direito — Cotação USD */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          USD
        </span>
        {loading ? (
          <span className="animate-pulse font-mono text-[13px] font-extrabold text-muted-foreground">
            ···
          </span>
        ) : rate ? (
          <span className="font-mono text-[13px] font-extrabold text-foreground">
            R$ {rate.toFixed(2)}
          </span>
        ) : (
          <span className="font-mono text-[13px] text-muted-foreground">—</span>
        )}
        {isToday && (
          <span
            title="Cotação ao vivo"
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"
          />
        )}
      </div>

      {/* Botão "Hoje" visível só quando estiver em data passada */}
      {!isToday && (
        <>
          <div className="h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => setDate(today)}
            className="px-2.5 py-1.5 text-[10px] font-bold text-primary hover:bg-muted/80 transition-colors"
          >
            Hoje
          </button>
        </>
      )}
    </div>
  );
}
