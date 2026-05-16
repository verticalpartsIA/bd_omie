import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TVOrder {
  id: number;
  numero: string;
  cliente: string;
  valor: number;
  hora: string;
  etapa: string;
  dataRaw: string;
}

export interface TVNf {
  id: number;
  numero: string;
  valor: number;
  hora: string;
}

export interface TVCritico {
  codigo: string;
  descricao: string;
  familia: string;
  media: number;
}

export interface TVLiveData {
  recentOrders: TVOrder[];
  nfRecentes: TVNf[];
  criticos: TVCritico[];
  criticoCount: number;
  serverTime: string;
}

export interface TVEvent {
  id: string;
  type: "order" | "nf";
  label: string;
  valor: number;
  ts: number;
}

const DEFAULT_LIVE: TVLiveData = {
  recentOrders: [],
  nfRecentes: [],
  criticos: [],
  criticoCount: 0,
  serverTime: "",
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTVDashboard() {
  const prevOrderIds = useRef<Set<number>>(new Set());
  const prevNfIds = useRef<Set<number>>(new Set());
  const [events, setEvents] = useState<TVEvent[]>([]);
  const initialized = useRef(false);

  const liveQ = useQuery<TVLiveData>({
    queryKey: ["tv-live"],
    queryFn: async () => {
      const res = await fetch("/api/tv");
      if (!res.ok) throw new Error(`tv API: ${res.status}`);
      const json = await res.json() as TVLiveData & { error?: string };
      if (json.error) throw new Error(json.error);
      return json;
    },
    refetchInterval: 15_000,   // 15s polling
    staleTime: 10_000,
  });

  // Detect new orders / NFs since last fetch
  useEffect(() => {
    if (!liveQ.data) return;

    const { recentOrders, nfRecentes } = liveQ.data;
    const newEvts: TVEvent[] = [];

    if (initialized.current) {
      // New orders
      for (const o of recentOrders) {
        if (!prevOrderIds.current.has(o.id)) {
          newEvts.push({
            id: `order-${o.id}`,
            type: "order",
            label: `Novo pedido: ${o.cliente}`,
            valor: o.valor,
            ts: Date.now(),
          });
        }
      }
      // New NFs
      for (const n of nfRecentes) {
        if (!prevNfIds.current.has(n.id)) {
          newEvts.push({
            id: `nf-${n.id}`,
            type: "nf",
            label: `NF emitida #${n.numero}`,
            valor: n.valor,
            ts: Date.now(),
          });
        }
      }
      if (newEvts.length > 0) {
        setEvents((prev) => [...newEvts, ...prev].slice(0, 30));
      }
    } else {
      // First load — seed events with recent orders (last 3)
      const seed = recentOrders.slice(0, 3).map((o) => ({
        id: `order-${o.id}`,
        type: "order" as const,
        label: `Pedido: ${o.cliente}`,
        valor: o.valor,
        ts: Date.now() - (recentOrders.indexOf(o) * 60_000),
      }));
      setEvents(seed);
      initialized.current = true;
    }

    // Update seen IDs
    prevOrderIds.current = new Set(recentOrders.map((o) => o.id));
    prevNfIds.current = new Set(nfRecentes.map((n) => n.id));
  }, [liveQ.data]);

  // Rotating slot: changes every 30 min, aligned to clock boundaries
  const [rotateSlot, setRotateSlot] = useState(() =>
    Math.floor(Date.now() / (30 * 60 * 1000)) % 3,
  );

  useEffect(() => {
    const msUntilNextSlot =
      30 * 60 * 1000 - (Date.now() % (30 * 60 * 1000));
    const timeout = setTimeout(() => {
      setRotateSlot((s) => (s + 1) % 3);
    }, msUntilNextSlot);
    return () => clearTimeout(timeout);
  }, [rotateSlot]);

  return {
    live: liveQ.data ?? DEFAULT_LIVE,
    events,
    rotateSlot,
    isLoading: liveQ.isLoading,
  };
}
