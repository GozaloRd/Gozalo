"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, Clock3, LayoutTemplate, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { resolveDashboardMediaUrl } from "@/lib/dashboardMediaUrl";
import { EventCard } from "./EventCard";
import { EventDetailPanel } from "./EventDetailPanel";
import type { EventCardModel, EventsTabKey } from "./types";

const listContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const listItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

function firstImageUrl(ev: UpcomingEventModel): string {
  const cover = resolveDashboardMediaUrl(ev.coverImageUrl);
  if (cover) return cover;
  const gallery = ev.images?.find((row) => typeof row === "string" && row.trim().length > 0);
  return resolveDashboardMediaUrl(gallery ?? null) ?? "";
}

function whenLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-DO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toCard(ev: UpcomingEventModel, past: boolean): EventCardModel {
  return {
    id: ev.id,
    title: ev.title,
    startAt: ev.startAt,
    whenLabel: whenLabel(ev.startAt),
    badge: past ? "finished" : "upcoming",
    coverUrl: firstImageUrl(ev),
    tickets: Number(ev.metricas?.ticketsVendidos ?? 0),
    reservations: Number(ev.metricas?.reservasHechas ?? 0),
    revenue: Number(ev.metricas?.ingresosEstimadosRD ?? 0),
    ticketTypes: (ev.ticketTypes ?? []).map((tt) => ({
      id: tt.id,
      name: tt.name,
      price: Number(tt.price ?? 0),
      sold: Number(tt.soldCount ?? 0),
      total: Number(tt.quantityTotal ?? 0),
    })),
    tableZones: [],
  };
}

export function EventsDashboardView({
  onCreateEvent,
  allVenueEvents,
}: {
  onCreateEvent: () => void;
  allVenueEvents: UpcomingEventModel[];
}) {
  const [tab, setTab] = useState<EventsTabKey>("active");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { activeRows, pastRows } = useMemo(() => {
    const now = Date.now();
    const active: EventCardModel[] = [];
    const past: EventCardModel[] = [];
    for (const ev of allVenueEvents) {
      if (ev.status === "cancelled") continue;
      const endAt = new Date(ev.endAt || ev.startAt).getTime();
      const isPast = Number.isFinite(endAt) ? endAt < now : false;
      if (isPast) past.push(toCard(ev, true));
      else active.push(toCard(ev, false));
    }
    active.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    past.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    return { activeRows: active, pastRows: past };
  }, [allVenueEvents]);

  const rows = useMemo<EventCardModel[]>(() => {
    if (tab === "past") return pastRows;
    if (tab === "templates") return [];
    return activeRows;
  }, [activeRows, pastRows, tab]);

  const selected = rows.find((r) => r.id === selectedEventId) ?? null;
  const hasDetail = Boolean(selected);

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">WORKSPACE · EVENTOS</p>
          <h1 className="mt-1 text-lg font-semibold text-white">Eventos</h1>
        </div>
        <span className="rounded-full border border-orange-500/40 bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-400">
          Eventos
        </span>
      </div>

      <motion.button
        type="button"
        onClick={onCreateEvent}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex w-fit items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-orange-600"
      >
        <Plus className="h-4 w-4" />
        Crear evento
      </motion.button>

      <div className="flex items-center gap-6 border-b border-white/10">
        {[
          { id: "active" as const, label: "Activos", Icon: Calendar },
          { id: "past" as const, label: "Pasados", Icon: Clock3 },
          { id: "templates" as const, label: "Plantillas", Icon: LayoutTemplate },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setSelectedEventId(null);
              }}
              className={`relative flex items-center gap-2 pb-3 pt-1 text-sm ${
                active ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
              {active ? <motion.span layoutId="events-desktop-tab-underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-orange-500" /> : null}
            </button>
          );
        })}
      </div>

      {tab === "templates" ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="max-w-lg">
            <LayoutTemplate className="mx-auto h-12 w-12 text-white/30" />
            <p className="mt-4 text-sm text-white/40">
              Duplica bases y configuraciones para lanzar eventos recurrentes mas rapido.
            </p>
            <button
              type="button"
              className="mt-5 rounded-xl border border-white/20 px-4 py-2 text-sm text-white/60 transition hover:border-orange-500/40 hover:text-white"
            >
              Crear plantilla desde evento
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-white/40">
            {tab === "active" ? "Eventos activos / proximos" : "Historial de eventos finalizados"}
          </p>
          <motion.div layout className={`grid gap-4 ${hasDetail ? "grid-cols-5" : "grid-cols-1"}`}>
            <motion.div layout className={hasDetail ? "col-span-3" : "col-span-1"}>
              <motion.div
                variants={listContainer}
                initial="hidden"
                animate="show"
                className={`grid gap-4 ${hasDetail ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-3"}`}
              >
                {rows.map((row) => (
                  <motion.div variants={listItem} key={row.id}>
                    <EventCard
                      event={row}
                      compact={hasDetail}
                      selected={selectedEventId === row.id}
                      onSelect={() =>
                        setSelectedEventId((prev) => (prev === row.id ? null : row.id))
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>
              {rows.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-10 text-center text-sm text-white/45">
                  {tab === "active"
                    ? "No hay eventos activos/proximos en este local."
                    : "No hay eventos finalizados en este local."}
                </div>
              ) : null}
            </motion.div>

            <AnimatePresence>
              {selected ? (
                <motion.div layout className="col-span-2">
                  <EventDetailPanel event={selected} onClose={() => setSelectedEventId(null)} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}
