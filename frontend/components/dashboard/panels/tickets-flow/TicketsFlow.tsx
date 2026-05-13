"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { fetchDashboardEvents } from "@/lib/dashboardApi";
import { EventCirclePicker } from "@/components/dashboard/panels/tickets-flow/EventCirclePicker";
import { EventTicketsDetail } from "@/components/dashboard/panels/tickets-flow/EventTicketsDetail";
import { TicketsGlobalSummary } from "@/components/dashboard/panels/tickets-flow/TicketsGlobalSummary";

type Phase = "list-events" | "event-detail";

const slide = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const } },
};

function publishedEvents(rows: UpcomingEventModel[]) {
  return rows.filter((e) => e.status === "published" || (e as { publicado?: boolean }).publicado === true);
}

function nearestUpcomingId(events: UpcomingEventModel[], nowMs: number) {
  const future = events
    .map((e) => ({ e, t: new Date(e.startAt).getTime() }))
    .filter(({ t }) => t >= nowMs)
    .sort((a, b) => a.t - b.t);
  return future[0]?.e.id ?? null;
}

type Props = {
  venueId: string;
  nowMs: number;
  onBackToVentas: () => void;
};

export function TicketsFlow({ venueId, nowMs, onBackToVentas }: Props) {
  const [phase, setPhase] = useState<Phase>("list-events");
  const [selected, setSelected] = useState<UpcomingEventModel | null>(null);
  const [events, setEvents] = useState<UpcomingEventModel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const res = (await fetchDashboardEvents("all", venueId)) as { data?: UpcomingEventModel[] };
      const rows = (res.data ?? []).filter((e) => e.status !== "cancelled");
      setEvents(publishedEvents(rows));
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void load();
    }, 20_000);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const nearestId = useMemo(() => nearestUpcomingId(events, nowMs), [events, nowMs]);

  const summary = useMemo(() => {
    let sold = 0;
    let cap = 0;
    let rev = 0;
    for (const ev of events) {
      for (const tt of ev.ticketTypes ?? []) {
        const s = tt.soldCount ?? 0;
        const c = tt.quantityTotal ?? 0;
        sold += s;
        if (c > 0) cap += c;
        rev += Number(tt.price || 0) * s;
      }
    }
    const conv = cap > 0 ? (sold / cap) * 100 : 0;
    return { sold, cap, rev, conv };
  }, [events]);

  return (
    <div className="space-y-3">
      {phase === "list-events" ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToVentas}
            className="shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Volver a Ventas"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
            <span aria-hidden>🎟️</span> Tickets — Selecciona evento
          </h2>
        </div>
      ) : null}

      {phase === "list-events" ? (
        <TicketsGlobalSummary
          soldTotal={summary.sold}
          revenueRd={summary.rev}
          occupancyPct={summary.cap > 0 ? (summary.sold / summary.cap) * 100 : 0}
          capacityLabel={`${summary.sold} / ${summary.cap || "—"} totales`}
          conversionPct={summary.conv}
        />
      ) : null}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            role="status"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={slide}
            className="py-8 text-center text-sm text-slate-500"
          >
            Cargando eventos…
          </motion.div>
        ) : phase === "list-events" ? (
          <motion.div key="list" initial="initial" animate="animate" exit="exit" variants={slide}>
            {events.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No hay eventos publicados.</p>
            ) : (
              <EventCirclePicker
                events={events}
                nearestEventId={nearestId}
                onSelect={(ev) => {
                  setSelected(ev);
                  setPhase("event-detail");
                }}
              />
            )}
          </motion.div>
        ) : selected ? (
          <motion.div key="detail" initial="initial" animate="animate" exit="exit" variants={slide}>
            <EventTicketsDetail
              event={selected}
              nowMs={nowMs}
              onBack={() => {
                setPhase("list-events");
                setSelected(null);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
