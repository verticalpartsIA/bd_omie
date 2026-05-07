import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ClasseABC } from "@/data/estoque-mock";

interface Item { sku: string; nome: string; receita: number; classe: ClasseABC }

const COLOR: Record<ClasseABC, string> = { A: "#F5C400", B: "#808080", C: "#E5E5E5" };

export function AbcBarchart({ data }: { data: Item[] }) {
  const fmt = (n: number) => `R$ ${Math.round(n / 1000)}k`;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 10 }} />
        <YAxis
          type="category"
          dataKey="sku"
          tick={{ fontSize: 10 }}
          width={70}
        />
        <Tooltip
          formatter={(v: unknown) => fmt(Number(v))}
          labelFormatter={(label: unknown) => {
            const it = data.find((d) => d.sku === label);
            return it ? `${it.sku} — ${it.nome} (${it.classe})` : String(label);
          }}
        />
        <Bar dataKey="receita" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={COLOR[d.classe]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}