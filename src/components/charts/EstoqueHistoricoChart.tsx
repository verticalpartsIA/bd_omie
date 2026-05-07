import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EstoqueHistoricoChart({ data, minimo = 50 }: { data: { mes: string; saldo: number }[]; minimo?: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: unknown) => [`${v} un`, "Saldo"]} />
        <ReferenceLine y={minimo} stroke="#C62828" strokeDasharray="4 4" label={{ value: `Mínimo: ${minimo} un`, fontSize: 10, fill: "#C62828", position: "right" }} />
        <Area type="monotone" dataKey="saldo" stroke="#F5C400" strokeWidth={2.5} fill="#F5C400" fillOpacity={0.08} dot={{ fill: "#fff", stroke: "#F5C400", strokeWidth: 2, r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}