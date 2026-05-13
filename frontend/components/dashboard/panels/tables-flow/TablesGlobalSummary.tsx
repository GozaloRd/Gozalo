"use client";

import { formatMoney } from "@/lib/format";

type Props = {
  reservedTotal: number;
  revenueRd: number;
  occupancyPct: number;
  capacityLabel: string;
};

export function TablesGlobalSummary({ reservedTotal, revenueRd, occupancyPct, capacityLabel }: Props) {
  const bar = Math.max(0, Math.min(100, occupancyPct));
  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg" aria-hidden>
          🪑
        </span>
        <h3 className="font-display text-base font-semibold tracking-tight text-white">Mesas</h3>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{reservedTotal}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">reservadas</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-emerald-300">{formatMoney(revenueRd)}</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">recaudado</p>
        </div>
        <div>
          <p className="text-lg font-bold tabular-nums text-white">{occupancyPct.toFixed(0)}%</p>
          <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">ocupac.</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-300 ease-out"
            style={{ width: `${bar}%` }}
          />
        </div>
        <p className="mt-1.5 text-center text-[11px] text-slate-400">{capacityLabel}</p>
      </div>
    </div>
  );
}
