import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Item { categoria: string; giro: number; meta: number }

export function GiroCategoryChart({ data }: { data: Item[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
        <XAxis dataKey="categoria" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(v: unknown, name: unknown, p: { payload?: Item }) => {
            const meta = p?.payload?.meta ?? 0;
            const val = Number(v);
            const diff = meta ? Math.round(((val - meta) / meta) * 100) : 0;
            return [`${val}x · meta ${meta}x · ${diff > 0 ? "+" : ""}${diff}%`, "Giro"];
          }}
        />
        <ReferenceLine y={data[0]?.meta ?? 4} stroke="#161616" strokeDasharray="4 4" label={{ value: "Meta", fontSize: 10, position: "right" }} />
        <Bar dataKey="giro" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.giro < d.meta ? "#C62828" : "#F5C400"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}