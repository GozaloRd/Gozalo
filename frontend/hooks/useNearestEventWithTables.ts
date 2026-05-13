import useSWR from "swr";
import { fetchDashboardEvents, fetchDashboardTables } from "@/lib/dashboardApi";

export type NearestEventWithTables = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
};

type EventRow = {
  id: string;
  title: string;
  startAt?: string;
  endAt?: string;
  publicado?: boolean;
  status?: string;
};

function isLive(startMs: number, endMs: number, now: number) {
  return now >= startMs && now < endMs;
}

export function useNearestEventWithTables(venueId: string | null) {
  return useSWR(venueId ? (["nearest-event-tables", venueId] as const) : null, async ([, vid]) => {
    const now = Date.now();
    const res = await fetchDashboardEvents("all", vid);
    const raw = (res as { data?: EventRow[] }).data ?? [];
    const events = raw.filter((e) => e.publicado ?? e.status === "published");

    const enriched = events
      .map((e) => {
        const startMs = e.startAt ? new Date(e.startAt).getTime() : 0;
        const endMs = e.endAt ? new Date(e.endAt).getTime() : startMs + 24 * 60 * 60 * 1000;
        return {
          ...e,
          startMs,
          endMs,
          live: isLive(startMs, endMs, now),
        };
      })
      .filter((e) => Number.isFinite(e.startMs) && e.startMs > 0);

    const live = enriched.filter((e) => e.live).sort((a, b) => a.startMs - b.startMs);
    const upcoming = enriched.filter((e) => !e.live && e.startMs > now).sort((a, b) => a.startMs - b.startMs);
    const candidates = [...live, ...upcoming];

    for (const ev of candidates) {
      const tb = await fetchDashboardTables(ev.id, vid, { tableScope: "event" });
      const mesas = ((tb as { mesas?: { active?: boolean }[] }).mesas ?? []).filter((m) => m.active !== false);
      if (mesas.length > 0) {
        return {
          id: ev.id,
          title: ev.title,
          startAt: ev.startAt ?? new Date(ev.startMs).toISOString(),
          endAt: ev.endAt ?? new Date(ev.endMs).toISOString(),
        } satisfies NearestEventWithTables;
      }
    }
    return null;
  }, {
    refreshInterval: 60_000,
    dedupingInterval: 10_000,
    revalidateOnFocus: true,
  });
}
