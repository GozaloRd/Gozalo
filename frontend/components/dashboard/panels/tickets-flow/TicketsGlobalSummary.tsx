"use client";

import { formatMoney } from "@/lib/format";

type Props = {
  soldTotal: number;
  revenueRd: number;
  /** 0–100 ratio for progress bar (e.g. sold vs max tickets definidos). */
  occupancyPct: number;
  capacityLabel: string;
  conversionPct: number;
};

export function TicketsGlobalSummary({
  soldTotal,
  revenueRd,
  occupancyPct,
  capacityLabel,
  conversionPct,
}: Props) {
  const bar = Math.max(0, Math.min(100, occupancyPct));
  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{soldTotal}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">vendidos</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-emerald-300">{formatMoney(revenueRd)}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">recaudado</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{conversionPct.toFixed(1)}%</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">conver.</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${bar}%` }}
          />
        </div>
        <p className="mt-1.5 text-center text-[11px] text-slate-400">{capacityLabel}</p>
      </div>
    </div>
  );
}
