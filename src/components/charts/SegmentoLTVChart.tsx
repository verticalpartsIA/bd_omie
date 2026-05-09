import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Item { segmento: string; ticketMedio: number; ltvMedio: number }

export function SegmentoLTVChart({ data }: { data: Item[] }) {
  const fmt = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="segmento" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={fmt} />
        <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="ticketMedio" name="Ticket Médio" fill="#808080" radius={[4, 4, 0, 0]} />
        <Bar dataKey="ltvMedio" name="LTV Médio" fill="#F5C400" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}