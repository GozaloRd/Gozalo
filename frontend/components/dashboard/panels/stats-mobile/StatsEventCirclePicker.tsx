"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import type { PublicEventDetail } from "@/lib/publicApi";
import { getEventCoverImageUrl } from "@/lib/eventCoverImage";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { SymmetricEventCircleGrid } from "@/components/dashboard/panels/shared/SymmetricEventCircleGrid";

function coverFor(ev: UpcomingEventModel): string | null {
  return getEventCoverImageUrl(ev as unknown as PublicEventDetail);
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

function totalSold(ev: UpcomingEventModel) {
  return (ev.ticketTypes ?? []).reduce((a, t) => a + (t.soldCount ?? 0), 0);
}

function totalCap(ev: UpcomingEventModel) {
  return (ev.ticketTypes ?? []).reduce((a, t) => a + (t.quantityTotal ?? 0), 0);
}

type Props = {
  events: UpcomingEventModel[];
  nearestEventId: string | null;
  onSelect: (ev: UpcomingEventModel) => void;
};

function EventCell({
  ev,
  pulse,
  onSelect,
}: {
  ev: UpcomingEventModel;
  pulse: boolean;
  onSelect: (ev: UpcomingEventModel) => void;
}) {
  const cover = coverFor(ev);
  const sold = totalSold(ev);
  const cap = totalCap(ev);
  const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0;
  const mini =
    cap > 0 ? (
      <span className="tabular-nums text-zinc-500">
        {sold}/{cap}
        {pct >= 70 ? <span className="text-pink-400"> · {pct}%</span> : null}
      </span>
    ) : sold > 0 ? (
      <span className="tabular-nums text-zinc-500">{sold} vend.</span>
    ) : null;

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(ev)}
      className="flex w-[104px] flex-col items-center gap-1.5 text-center touch-manipulation"
    >
      <div
        className={`relative h-[90px] w-[90px] shrink-0 overflow-hidden rounded-full border-2 border-pink-500 bg-zinc-800 shadow-lg transition hover:scale-105 hover:brightness-110 active:scale-[1.02] motion-safe:duration-200 ring-0 hover:ring-2 hover:ring-pink-400/40 ${
          pulse ? "motion-safe:animate-pulse motion-reduce:animate-none" : ""
        } `}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl text-zinc-600">📊</span>
        )}
      </div>
      <p className="line-clamp-2 max-w-[104px] text-sm font-medium leading-tight text-white">{ev.title}</p>
      <p className="text-[11px] capitalize text-zinc-500">{shortDate(ev.startAt)}</p>
      {mini ? <p className="text-[10px] leading-tight text-zinc-400">{mini}</p> : null}
    </motion.button>
  );
}

export function StatsEventCirclePicker({ events, nearestEventId, onSelect }: Props) {
  const cells = useMemo(
    () =>
      events.map((ev) => (
        <EventCell key={ev.id} ev={ev} pulse={nearestEventId === ev.id} onSelect={onSelect} />
      )),
    [events, nearestEventId, onSelect]
  );

  return <SymmetricEventCircleGrid cells={cells} />;
}
