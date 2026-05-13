"use client";

import { ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { deriveZoneUiEstado, zoneInsightSpanish, type ZoneAggregate } from "@/lib/tableFlowLogic";

const zoneBadge: Record<
  "activo" | "agotado" | "inactivo",
  { label: string; dot: string; text: string }
> = {
  activo: { label: "ACTIVO", dot: "bg-emerald-500", text: "text-emerald-400" },
  agotado: { label: "AGOTADO", dot: "bg-red-500", text: "text-red-400" },
  inactivo: { label: "INACTIVO", dot: "bg-zinc-500", text: "text-zinc-400" },
};

type Props = {
  zoneAgg: ZoneAggregate;
  onOpen: () => void;
};

export function ZoneCard({ zoneAgg: agg, onOpen }: Props) {
  const estado = deriveZoneUiEstado(agg);
  const b = zoneBadge[estado];
  const insight = zoneInsightSpanish(agg, estado);
  const pct = agg.totalMesas > 0 ? Math.round((agg.reservadasCount / agg.totalMesas) * 100) : 0;
  const sample = agg.tables[0];
  const minSample = sample?.minPrice != null ? formatMoney(Number(sample.minPrice)) : "—";
  const capSample = sample?.capacity ?? "—";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 text-left shadow-lg backdrop-blur-sm transition hover:bg-zinc-800/90 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${b.dot}`} aria-hidden />
          <span className="truncate font-display text-base font-semibold text-white">{agg.zone}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className={`rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase ${b.text}`}>
            {b.label}
          </span>
          <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden />
        </div>
      </div>
      <p className="mt-1 pl-4 text-xs text-slate-400">
        {capSample} personas/mesa • {minSample} mín.
      </p>
      <div className="mt-2 pl-4">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-500/90" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">
          {agg.reservadasCount}/{agg.totalMesas} ({pct}%) · 💰 {formatMoney(agg.revenueRd)} · 👥{" "}
          {agg.personasConfirmadas} personas
        </p>
      </div>
      {insight ? <p className="mt-2 border-t border-white/[0.06] pt-2 text-[11px] text-slate-400">{insight}</p> : null}
    </button>
  );
}
