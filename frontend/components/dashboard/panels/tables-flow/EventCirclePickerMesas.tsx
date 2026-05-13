"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { PublicEventDetail } from "@/lib/publicApi";
import { SymmetricEventCircleGrid } from "@/components/dashboard/panels/shared/SymmetricEventCircleGrid";
import { getEventCoverImageUrl } from "@/lib/eventCoverImage";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";

function coverFor(ev: UpcomingEventModel): string | null {
  return getEventCoverImageUrl(ev as unknown as PublicEventDetail);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

export type EventMesasMetrics = {
  reserved: number;
  total: number;
  /** Ingresos estimados por reservas del evento (panel). */
  revenue: number;
};

type Props = {
  events: UpcomingEventModel[];
  nearestEventId: string | null;
  metricsByEventId: Map<string, EventMesasMetrics>;
  onSelect: (ev: UpcomingEventModel) => void;
};

function MesaEventCell({
  ev,
  pulse,
  metrics,
  onSelect,
}: {
  ev: UpcomingEventModel;
  pulse: boolean;
  metrics: EventMesasMetrics;
  onSelect: (ev: UpcomingEventModel) => void;
}) {
  const cover = coverFor(ev);
  const { reserved, total } = metrics;
  const pct = total > 0 ? Math.round((reserved / total) * 100) : 0;
  const paused = ev.status === "paused";
  const hasActive = reserved > 0 && !paused;
  const borderClass = hasActive ? "border-emerald-500" : "border-zinc-500";
  const mini =
    total > 0 ? (
      pct > 60 ? (
        <span className="text-amber-400">🔥 {pct}%</span>
      ) : (
        <span className="tabular-nums text-slate-500">
          {reserved}/{total} mesas
        </span>
      )
    ) : (
      <span className="text-[10px] text-slate-600">Sin mesas</span>
    );

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(ev)}
      className="flex w-[104px] flex-col items-center gap-1.5 text-center touch-manipulation"
    >
      <div
        className={`relative h-[90px] w-[90px] shrink-0 overflow-hidden rounded-full border-2 bg-zinc-800 shadow-lg transition duration-300 ease-out hover:scale-105 hover:brightness-110 active:scale-[1.02] ${borderClass} ring-0 hover:ring-2 hover:ring-emerald-400/35 ${
          pulse ? "motion-safe:animate-pulse motion-reduce:animate-none" : ""
        } `}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl text-slate-600">🪑</span>
        )}
      </div>
      <p className="line-clamp-2 max-w-[104px] text-sm font-medium leading-tight text-white">{ev.title}</p>
      <p className="text-[11px] capitalize text-slate-500">{shortDate(ev.startAt)}</p>
      {mini ? <p className="text-[10px] leading-tight">{mini}</p> : null}
    </motion.button>
  );
}

export function EventCirclePickerMesas({
  events,
  nearestEventId,
  metricsByEventId,
  onSelect,
}: Props) {
  const cells = useMemo(
    () =>
      events.map((ev) => (
        <MesaEventCell
          key={ev.id}
          ev={ev}
          pulse={nearestEventId === ev.id}
          metrics={metricsByEventId.get(ev.id) ?? { reserved: 0, total: 0, revenue: 0 }}
          onSelect={onSelect}
        />
      )),
    [events, nearestEventId, metricsByEventId, onSelect]
  );

  return <SymmetricEventCircleGrid cells={cells} />;
}
