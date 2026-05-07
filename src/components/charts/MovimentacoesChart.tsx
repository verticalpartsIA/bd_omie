import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function MovimentacoesChart({ data }: { data: { dia: string; entradas: number; saidas: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="dia" tick={{ fontSize: 10 }} interval={2} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip formatter={(v: unknown) => `${v} un`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="entradas" fill="#2E7D32" radius={[3, 3, 0, 0]} />
        <Bar dataKey="saidas" fill="#C62828" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}