import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Item { mes: string; abordados: number; reativados: number }

export function ReativacaoChart({ data }: { data: Item[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v: unknown) => String(v)} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="abordados" name="Abordados" fill="#E5E5E5" radius={[4, 4, 0, 0]} />
        <Bar dataKey="reativados" name="Reativados" fill="#F5C400" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}