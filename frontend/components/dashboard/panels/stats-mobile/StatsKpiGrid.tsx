"use client";

import type { StatsKpiDerived, StatsTrendKind } from "@/lib/statsMobileDerive";

function trendClass(kind: StatsTrendKind) {
  if (kind === "up") return "text-emerald-500";
  if (kind === "down") return "text-red-400";
  if (kind === "neutral") return "text-zinc-400";
  return "text-zinc-500";
}

export function StatsKpiGrid({ items }: { items: StatsKpiDerived[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
      {items.map((k) => {
        const Icon = k.Icon;
        return (
          <div
            key={k.key}
            className="rounded-2xl bg-zinc-900/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <Icon className="h-4 w-4 text-pink-500" aria-hidden />
            <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">{k.label}</p>
            <p className="mt-1 truncate text-base font-bold tabular-nums text-pink-400">{k.value}</p>
            {k.subLine ? <p className="mt-0.5 text-[10px] text-zinc-500">{k.subLine}</p> : null}
            <p className={`mt-1 text-xs font-medium tabular-nums ${trendClass(k.trendKind)}`}>{k.trendText}</p>
          </div>
        );
      })}
    </div>
  );
}
