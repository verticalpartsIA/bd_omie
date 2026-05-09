import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Cell } from "recharts";
import { rfmColor, type Cliente } from "@/data/clientes-mock";

export function RFMScatter({ data }: { data: Cliente[] }) {
  const points = data.map((c) => ({
    x: c.rfm.r,
    y: c.rfm.f,
    z: c.rfm.m * 30,
    nome: c.nome,
    seg: c.rfm.segmento,
    receita: c.receitaTotal,
  }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" dataKey="x" name="Recência" domain={[0, 6]} tick={{ fontSize: 10 }} label={{ value: "Recência →", position: "insideBottom", offset: -4, fontSize: 10 }} />
        <YAxis type="number" dataKey="y" name="Frequência" domain={[0, 6]} tick={{ fontSize: 10 }} label={{ value: "Frequência →", angle: -90, position: "insideLeft", fontSize: 10 }} />
        <ZAxis type="number" dataKey="z" range={[40, 400]} name="Monetário" />
        <Tooltip
          cursor={{ strokeDasharray: "3 3" }}
          formatter={(v: unknown, name: unknown) => [String(v), String(name)]}
          labelFormatter={(_l: unknown, payload: unknown) => {
            const arr = payload as Array<{ payload?: { nome?: string; seg?: string } }> | undefined;
            const p = arr?.[0]?.payload;
            return p?.nome ? `${p.nome} · ${p.seg}` : "";
          }}
        />
        <Scatter data={points}>
          {points.map((p, i) => (
            <Cell key={i} fill={rfmColor[p.seg as keyof typeof rfmColor]} fillOpacity={0.75} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}