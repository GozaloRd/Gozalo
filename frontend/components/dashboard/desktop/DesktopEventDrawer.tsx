"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { EventTicketsPanel, type TicketTypeRow } from "@/components/dashboard/upcoming/EventTicketsPanel";
import { EventTablesPanel } from "@/components/dashboard/upcoming/EventTablesPanel";
import { EventManagePanel } from "@/components/dashboard/upcoming/event-manage/EventManagePanel";
import { useDashboard } from "@/contexts/DashboardContext";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { formatMoney } from "@/lib/format";

type Stats = {
  occupancy: {
    activeEvent: { id: string; title: string } | null;
    currentAttendees: number;
    maxCapacity: number;
    ratio: number;
  };
};

type Panel = "gestionar" | "tickets" | "mesas" | null;

function formatEventWhen(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isLive(event: UpcomingEventModel, nowMs: number) {
  const s = new Date(event.startAt).getTime();
  const e = new Date(event.endAt).getTime();
  return s <= nowMs && e >= nowMs;
}

export function DesktopEventDrawer({
  open,
  event,
  nowMs,
  stats,
  variant,
  onClose,
  onAfterClose,
  onEventUpdated,
}: {
  open: boolean;
  event: UpcomingEventModel | null;
  nowMs: number;
  stats: Stats | null;
  variant: "upcoming" | "past";
  onClose: () => void;
  /** Tras terminar la animación de salida (limpiar estado en el padre). */
  onAfterClose?: () => void;
  onEventUpdated?: () => void;
}) {
  const { venueId } = useDashboard();
  const [panel, setPanel] = useState<Panel>(null);

  useEffect(() => {
    if (!open) setPanel(null);
  }, [open]);

  useEffect(() => {
    setPanel(null);
  }, [event?.id]);

  const live = event ? isLive(event, nowMs) : false;
  const liveOccupancy =
    event && live && stats?.occupancy.activeEvent?.id === event.id ? stats.occupancy : null;
  const types: TicketTypeRow[] = event?.ticketTypes ?? [];
  const sold = event?.metricas?.ticketsVendidos ?? 0;
  const reservations = event?.metricas?.reservasHechas ?? 0;

  return (
    <AnimatePresence onExitComplete={onAfterClose}>
      {open && event ? (
        <motion.div
          key={`ev-drawer-${event.id}`}
          className="fixed inset-0 z-[55] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Cerrar detalle de evento"
            className="pointer-events-auto absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="desktop-event-drawer-title"
            className="pointer-events-auto absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col border-l border-white/[0.1] bg-[#0A0A0F]/98 shadow-2xl backdrop-blur-md"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
          >
            <div className="relative h-36 w-full shrink-0 overflow-hidden border-b border-white/[0.06]">
              {event.coverImageUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${event.coverImageUrl})` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5D2E8C]/90 via-[#9B7FCA]/50 to-[#0A0A0F] px-4 text-center">
                  <span className="font-display text-lg font-bold leading-tight text-white/95 line-clamp-3">
                    {event.title}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                {live ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    EN VIVO
                  </span>
                ) : variant === "past" ? (
                  <span className="rounded-full bg-zinc-600/30 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                    FINALIZADO
                  </span>
                ) : (
                  <span className="gozalo-badge-proximo rounded-full border border-[rgba(168,85,247,0.4)] bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                    PRÓXIMO
                  </span>
                )}
              </div>

              <h2 id="desktop-event-drawer-title" className="font-display mt-2 text-xl font-bold text-white">
                {event.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{formatEventWhen(event.startAt)}</p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="rounded-lg border border-white/[0.06] bg-zinc-900/80 px-1 py-2">
                  <div className="text-[9px] uppercase text-zinc-500">Entradas</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-white">{sold}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-zinc-900/80 px-1 py-2">
                  <div className="text-[9px] uppercase text-zinc-500">Reservas</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-white">{reservations}</div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-zinc-900/80 px-1 py-2">
                  <div className="text-[9px] uppercase text-zinc-500">Recaudado</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-[11px] text-white">
                    {formatMoney(event.metricas?.ingresosEstimadosRD ?? 0)}
                  </div>
                </div>
              </div>

              {live && liveOccupancy ? (
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-emerald-200/90">
                    <span>Ocupación</span>
                    <span className="font-bold">{Math.round((liveOccupancy.ratio || 0) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                      style={{
                        width: `${Math.min(100, Math.round((liveOccupancy.ratio || 0) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPanel((p) => (p === "gestionar" ? null : "gestionar"))}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    panel === "gestionar"
                      ? "border-[#C77DFF]/60 bg-gradient-to-br from-[#5D2E8C]/50 to-[#9B7FCA]/25 text-white"
                      : "border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C]/40 to-[#9B7FCA]/20 text-white"
                  }`}
                >
                  Gestionar
                </button>
                <button
                  type="button"
                  onClick={() => setPanel((p) => (p === "tickets" ? null : "tickets"))}
                  className={`rounded-lg border px-3 py-2 text-xs transition ${
                    panel === "tickets"
                      ? "border-purple-400/50 bg-purple-500/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  Tickets
                </button>
                <button
                  type="button"
                  onClick={() => setPanel((p) => (p === "mesas" ? null : "mesas"))}
                  className={`rounded-lg border px-3 py-2 text-xs transition ${
                    panel === "mesas"
                      ? "border-purple-400/50 bg-purple-500/15 text-white"
                      : "border-white/10 bg-white/5 text-slate-200"
                  }`}
                >
                  Mesas
                </button>
              </div>

              <AnimatePresence mode="wait">
                {panel === "gestionar" ? (
                  <EventManagePanel
                    key="mg"
                    event={event}
                    nowMs={nowMs}
                    onClose={() => setPanel(null)}
                    onSaved={() => onEventUpdated?.()}
                  />
                ) : panel === "tickets" ? (
                  <EventTicketsPanel
                    key="tk"
                    eventId={event.id}
                    types={types}
                    onClose={() => setPanel(null)}
                  />
                ) : panel === "mesas" ? (
                  <EventTablesPanel
                    key="tb"
                    eventId={event.id}
                    venueId={venueId ?? null}
                    open
                    onClose={() => setPanel(null)}
                  />
                ) : null}
              </AnimatePresence>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
