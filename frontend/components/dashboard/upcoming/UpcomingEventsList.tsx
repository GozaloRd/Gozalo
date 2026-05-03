"use client";

import Link from "next/link";
import { useMemo } from "react";
import { UpcomingEventCard, type UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";

type Stats = {
  occupancy: {
    activeEvent: { id: string; title: string } | null;
    currentAttendees: number;
    maxCapacity: number;
    ratio: number;
  };
};

type Analytics = {
  summary: { revenue: { total: number } };
};

export function UpcomingEventsList({
  events,
  loading,
  stats,
  analytics,
  nowMs,
  onEventUpdated,
}: {
  events: UpcomingEventModel[];
  loading: boolean;
  stats: Stats | null;
  analytics: Analytics | null;
  nowMs: number;
  onEventUpdated?: () => void;
}) {
  const sorted = useMemo(() => {
    return [...events]
      .filter((e) => e.status !== "cancelled")
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events]);

  if (loading && sorted.length === 0) {
    return (
      <div className="space-y-4" aria-busy>
        {[1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-900/90 shadow-lg backdrop-blur-sm">
            <div className="h-[140px] animate-pulse bg-white/[0.06]" />
            <div className="space-y-3 p-4">
              <div className="h-6 max-w-[75%] animate-pulse rounded bg-white/[0.06]" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.06]" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-14 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-14 animate-pulse rounded-lg bg-white/[0.06]" />
                <div className="h-14 animate-pulse rounded-lg bg-white/[0.06]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && sorted.length === 0) {
    return (
      <div className="flex flex-col items-center py-12">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/[0.04]">
          <svg className="h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="mt-4 text-center text-sm font-medium text-slate-300">No tienes próximos eventos</p>
        <Link
          href="/dashboard/eventos"
          className="mt-4 rounded-xl bg-[#2979FF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#1e6bef] active:scale-[0.98]"
        >
          Crear evento
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sorted.map((ev) => (
        <UpcomingEventCard
          key={ev.id}
          event={ev}
          stats={stats}
          analytics={analytics}
          nowMs={nowMs}
          onEventUpdated={onEventUpdated}
        />
      ))}
    </div>
  );
}
