import { createFileRoute, Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { Topbar } from "@/components/app/Topbar";
import { RoleGuard } from "@/components/app/RoleGuard";
import { useSidebarToggle } from "../_app";
import { RFMScatter } from "@/components/charts/RFMScatter";
import { SegmentoLTVChart } from "@/components/charts/SegmentoLTVChart";
import {
  clientes, distribuicaoRFM, formatBRL, rfmColor, rfmLabel, segmentosLabel, ticketPorSegmento,
  type RFMSegment,
} from "@/data/clientes-mock";

export const Route = createFileRoute("/_app/segmentos")({
  head: () => ({ meta: [{ title: "Segmentação RFM — VerticalParts" }] }),
  component: () => (
    <RoleGuard allow={["admin", "gestor", "vendedor"]}>
      <SegmentosPage />
    </RoleGuard>
  ),
});

function SegmentosPage() {
  const toggle = useSidebarToggle();

  return (
    <>
      <Topbar crumb="CADASTROS · SEGMENTAÇÃO" title="Segmentação RFM" icon={<Tag className="h-3.5 w-3.5" />} onToggleSidebar={toggle} />
      <main className="flex-1 px-7 pb-16 pt-6">
        <div className="mb-5">
          <h2 className="text-[26px] font-extrabold tracking-tight">Segmentação Comportamental</h2>
          <p className="mt-1 text-sm text-muted-foreground">RFM (Recência, Frequência, Monetário), ticket e LTV por segmento de negócio.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h4 className="text-sm font-bold">Mapa RFM</h4>
            <p className="text-[11px] text-muted-foreground">Eixo X: Recência · Eixo Y: Frequência · Tamanho: Monetário</p>
            <div className="mt-2"><RFMScatter data={clientes} /></div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Distribuição por Segmento</h4>
            <p className="text-[11px] text-muted-foreground">Quantidade de clientes</p>
            <div className="mt-3 space-y-2">
              {distribuicaoRFM.map((d) => {
                const total = clientes.length;
                const pct = Math.round((d.count / total) * 1000) / 10;
                return (
                  <div key={d.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                        {d.segmento}
                      </span>
                      <span className="font-mono">{d.count} <span className="text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h4 className="text-sm font-bold">Ticket Médio vs LTV por Segmento</h4>
            <p className="text-[11px] text-muted-foreground">Compare retorno imediato com valor de longo prazo</p>
            <div className="mt-3"><SegmentoLTVChart data={ticketPorSegmento} /></div>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h4 className="text-sm font-bold">Resumo por Segmento de Negócio</h4>
              <p className="text-[11px] text-muted-foreground">Manutenção, construtora, síndico, revenda, indústria</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Segmento</th>
                    <th className="px-3 py-2 text-right">Clientes</th>
                    <th className="px-3 py-2 text-right">Ticket</th>
                    <th className="px-3 py-2 text-right">LTV</th>
                    <th className="px-3 py-2 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketPorSegmento.map((s) => (
                    <tr key={s.key} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{s.segmento}</td>
                      <td className="px-3 py-2 text-right font-mono">{s.clientes}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(s.ticketMedio)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{formatBRL(s.ltvMedio)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatBRL(s.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(rfmLabel) as RFMSegment[]).map((seg) => {
            const list = clientes.filter((c) => c.rfm.segmento === seg).slice(0, 5);
            return (
              <div key={seg} className="rounded-xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: rfmColor[seg] }} />
                  <h4 className="text-xs font-bold">{rfmLabel[seg]}</h4>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{clientes.filter((c) => c.rfm.segmento === seg).length}</span>
                </div>
                <ul className="divide-y divide-border text-xs">
                  {list.length === 0 && <li className="px-4 py-4 text-muted-foreground">Sem clientes</li>}
                  {list.map((c) => (
                    <li key={c.id} className="px-4 py-2">
                      <Link to="/clientes/$id" params={{ id: c.id }} className="font-medium hover:text-primary">{c.nome}</Link>
                      <div className="text-[10px] text-muted-foreground">{segmentosLabel[c.segmento]} · {formatBRL(c.receitaTotal)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}