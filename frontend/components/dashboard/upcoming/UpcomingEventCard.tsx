"use client";

import { AnimatePresence } from "framer-motion";
import { useCountdown } from "@/hooks/useCountdown";
import { formatMoney } from "@/lib/format";
import { EventTicketsPanel, type TicketTypeRow } from "@/components/dashboard/upcoming/EventTicketsPanel";
import { EventTablesPanel } from "@/components/dashboard/upcoming/EventTablesPanel";
import { EventManagePanel } from "@/components/dashboard/upcoming/event-manage/EventManagePanel";
import { useDashboard } from "@/contexts/DashboardContext";
import { useState } from "react";

export type UpcomingEventModel = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status?: string;
  coverImageUrl?: string | null;
  maxCapacity?: number | null;
  description?: string | null;
  ticketTypes?: TicketTypeRow[];
  city?: string | null;
  category?: string | null;
  images?: string[] | null;
  tableLayoutImageUrl?: string | null;
  requiresCoverForTable?: boolean;
  featured?: boolean;
  minimumAge?: number | null;
  refundPolicy?: string;
  metricas?: {
    ticketsVendidos: number;
    reservasHechas: number;
    ingresosEstimadosRD: number;
  };
};

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

type Panel = "gestionar" | "tickets" | "mesas" | null;

export function UpcomingEventCard({
  event,
  stats,
  analytics,
  nowMs,
  onEventUpdated,
}: {
  event: UpcomingEventModel;
  stats: Stats | null;
  analytics: Analytics | null;
  nowMs: number;
  onEventUpdated?: () => void;
}) {
  const { venueId } = useDashboard();
  const [panel, setPanel] = useState<Panel>(null);

  const live = isLive(event, nowMs);
  const cd = useCountdown(event.startAt, !live);

  const sold = event.metricas?.ticketsVendidos ?? 0;
  const reservations = event.metricas?.reservasHechas ?? 0;
  const capacity = event.maxCapacity ?? 0;
  const fillRate =
    capacity > 0 ? Math.min(100, Math.round(((sold + reservations) / capacity) * 100)) : 0;

  const hasTickets = (event.ticketTypes?.length ?? 0) > 0;
  const hasCover = !!event.coverImageUrl;
  const hasCapacity = (capacity ?? 0) > 0;
  const hasDesc = !!event.description && event.description.length > 20;
  const readinessPct = Math.round(
    ([hasTickets, hasCapacity, hasCover, hasDesc].filter(Boolean).length / 4) * 100
  );

  const liveOccupancy =
    live && stats?.occupancy.activeEvent?.id === event.id ? stats.occupancy : null;

  const types = event.ticketTypes ?? [];

  return (
    <article className="overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-900/90 shadow-xl backdrop-blur-sm">
      {/* Portada */}
      <div className="relative h-[140px] w-full overflow-hidden rounded-t-2xl">
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
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {live ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              EN VIVO
            </span>
          ) : (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
              PRÓXIMO
            </span>
          )}
        </div>

        <h3 className="font-display text-2xl font-bold leading-tight tracking-tight text-white">
          {event.title}
        </h3>

        <p className="text-sm text-zinc-400">{formatEventWhen(event.startAt)}</p>

        {!live && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-white/[0.06] bg-zinc-900 py-2">
              <div className="text-xl font-bold tabular-nums text-white">{cd.days}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">días</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-zinc-900 py-2">
              <div className="text-xl font-bold tabular-nums text-white">{cd.hours}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">hrs</div>
            </div>
            <div className="rounded-lg border border-white/[0.06] bg-zinc-900 py-2">
              <div className="text-xl font-bold tabular-nums text-white">{cd.minutes}</div>
              <div className="text-[9px] uppercase tracking-wider text-zinc-500">min</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg border border-white/[0.06] bg-zinc-900 px-1 py-2">
            <div className="text-[9px] uppercase text-zinc-500">Entradas</div>
            <div className="mt-0.5 font-semibold tabular-nums text-white">
              {sold}
              {capacity ? ` / ${capacity}` : ""}
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-zinc-900 px-1 py-2">
            <div className="text-[9px] uppercase text-zinc-500">Reservas</div>
            <div className="mt-0.5 font-semibold tabular-nums text-white">{reservations}</div>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-zinc-900 px-1 py-2">
            <div className="text-[9px] uppercase text-zinc-500">Ingresos est.</div>
            <div className="mt-0.5 font-semibold tabular-nums text-[11px] text-white">
              {formatMoney(event.metricas?.ingresosEstimadosRD ?? 0)}
            </div>
          </div>
        </div>

        {capacity > 0 && !live && (
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
              <span>Ocupación proyectada</span>
              <span className="font-semibold text-white">{fillRate}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-purple-500" style={{ width: `${fillRate}%` }} />
            </div>
          </div>
        )}

        {live && liveOccupancy && (
          <div>
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
        )}

        <div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-zinc-500">
            <span>Preparación</span>
            <span
              className={
                readinessPct === 100 ? "font-semibold text-emerald-400" : "font-semibold text-purple-300"
              }
            >
              {readinessPct}%
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${
                readinessPct === 100 ? "bg-emerald-500" : "bg-purple-500"
              }`}
              style={{ width: `${readinessPct}%` }}
            />
          </div>
        </div>

        {analytics?.summary.revenue.total != null && (
          <p className="text-[10px] text-zinc-500">
            Ingresos totales (panel):{" "}
            <span className="font-semibold text-white">{formatMoney(analytics.summary.revenue.total)}</span>
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => setPanel((p) => (p === "gestionar" ? null : "gestionar"))}
            aria-expanded={panel === "gestionar"}
            aria-controls={`event-manage-panel-${event.id}`}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-[0.97] ${
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
            aria-expanded={panel === "tickets"}
            aria-controls={`event-tickets-panel-${event.id}`}
            className={`rounded-lg border px-3 py-2 text-xs transition active:scale-[0.97] ${
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
            aria-expanded={panel === "mesas"}
            aria-controls={`event-mesas-panel-${event.id}`}
            className={`rounded-lg border px-3 py-2 text-xs transition active:scale-[0.97] ${
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
    </article>
  );
}
