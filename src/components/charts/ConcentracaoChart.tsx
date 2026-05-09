import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Item { pos: number; nome: string; receita: number; acumuladoPct: number }

export function ConcentracaoChart({ data }: { data: Item[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 16, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="pos" tick={{ fontSize: 10 }} />
        <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
        <Tooltip
          formatter={(v: unknown, name: unknown) => {
            if (name === "acumuladoPct") return [`${v}%`, "% acumulado"];
            return [`R$ ${(Number(v) / 1000).toFixed(0)}k`, "Receita"];
          }}
          labelFormatter={(label: unknown) => {
            const it = data.find((d) => d.pos === Number(label));
            return it ? `#${it.pos} — ${it.nome}` : `#${label}`;
          }}
        />
        <Bar yAxisId="left" dataKey="receita" fill="#F5C400" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="acumuladoPct" stroke="#000" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}