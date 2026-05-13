"use client";

import { MoreHorizontal } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { ZoneCard } from "@/components/dashboard/panels/tables-flow/ZoneCard";
import type { ZoneAggregate } from "@/lib/tableFlowLogic";

function shortWhen(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string, now: number) {
  const t = new Date(iso).getTime();
  return Math.ceil((t - now) / (24 * 60 * 60 * 1000));
}

type Props = {
  event: UpcomingEventModel;
  zoneAggregates: ZoneAggregate[];
  nowMs: number;
  onPickZone: (zone: string) => void;
};

export function ZonesListView({ event, zoneAggregates, nowMs, onPickZone }: Props) {
  const totalMesas = zoneAggregates.reduce((a, z) => a + z.totalMesas, 0);
  const reserved = zoneAggregates.reduce((a, z) => a + z.reservadasCount, 0);
  const revenue = zoneAggregates.reduce((a, z) => a + z.revenueRd, 0);
  const occ =
    totalMesas > 0 ? Math.round((reserved / totalMesas) * 100) : 0;
  const d = daysUntil(event.startAt, nowMs);
  const live = event.status === "published";

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${live ? "bg-emerald-500" : "bg-zinc-400"}`}
              aria-hidden
            />
            <h3 className="truncate font-display text-base font-semibold text-white">{event.title}</h3>
            <button
              type="button"
              className="ml-auto shrink-0 rounded-lg p-1.5 text-zinc-500 opacity-60"
              aria-label="Más opciones"
              disabled
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {shortWhen(event.startAt)}
            {d >= 0 ? ` · en ${d} día${d === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-zinc-950/50 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-white/90">
            {reserved} / {totalMesas || "—"} mesas
          </span>
          <span className="font-semibold text-emerald-300">{formatMoney(revenue)}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${occ}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{occ}% ocupación</p>
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Zonas</p>

      <ul className="space-y-2">
        {zoneAggregates.map((za) => (
          <li key={za.zone}>
            <ZoneCard zoneAgg={za} onOpen={() => onPickZone(za.zone)} />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 pt-1">
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled
            className="rounded-xl border border-dashed border-white/15 py-2.5 text-center text-xs text-slate-500"
          >
            ➕ Añadir zona
          </button>
        </div>
      </div>
    </div>
  );
}
