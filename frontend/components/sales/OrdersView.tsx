"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { OrderCard } from "@/components/dashboard/panels/orders-flow/OrderCard";
import {
  mergeVentasFeed,
  orderApiType,
  periodRangeISO,
  type DashboardReservationListRow,
  type DashboardTicketListRow,
  type FeedItem,
} from "@/components/dashboard/panels/orders-flow/mergeVentasFeed";
import { ReservationFeedCard } from "@/components/dashboard/panels/orders-flow/ReservationFeedCard";
import { TicketFeedCard } from "@/components/dashboard/panels/orders-flow/TicketFeedCard";
import {
  fetchDashboardEvents,
  fetchDashboardOrders,
  fetchDashboardReservations,
  fetchDashboardTickets,
} from "@/lib/dashboardApi";
import type { PeriodFilter, StatusFilter, TypeFilter } from "./types";

const DEBOUNCE_MS = 300;

const pill =
  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150";

function pillActive(active: boolean) {
  return active
    ? "bg-emerald-500 text-black"
    : "bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/70";
}

function mapStatusApi(s: StatusFilter): "all" | "completed" | "pending" | "refunded" {
  if (s === "completed") return "completed";
  if (s === "pending") return "pending";
  if (s === "refunded") return "refunded";
  return "all";
}

export function OrdersView({ onBack }: { onBack: () => void }) {
  const { venueId } = useDashboard();
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [merged, setMerged] = useState<FeedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadRows = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    setError(null);
    try {
      const range = periodRangeISO(period);
      const listParams: Record<string, string> = {
        page: "1",
        pageSize: "200",
        from: range.from,
      };
      if (eventId) listParams.eventId = eventId;

      const [ordersRes, ticketsRes, reservationsRes] = await Promise.all([
        fetchDashboardOrders(venueId, {
          period,
          status: mapStatusApi(status),
          type: orderApiType(type),
          eventId: eventId || null,
          q: debouncedSearch || undefined,
          limit: 200,
          offset: 0,
        }),
        fetchDashboardTickets(listParams, venueId),
        fetchDashboardReservations(listParams, venueId),
      ]);

      const ticketRows =
        (ticketsRes as { data?: DashboardTicketListRow[] }).data ?? [];
      const resvRows =
        (reservationsRes as { data?: DashboardReservationListRow[] }).data ?? [];
      const orderRows = ordersRes.data ?? [];
      const nextMerged = mergeVentasFeed(orderRows, ticketRows, resvRows, {
        period,
        status,
        type,
        eventId: eventId || null,
      }, debouncedSearch);

      setMerged(nextMerged);
    } catch (e) {
      setMerged([]);
      setError(e instanceof Error ? e.message : "Error al cargar órdenes reales");
    } finally {
      setLoading(false);
    }
  }, [venueId, period, status, type, eventId, debouncedSearch]);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    void fetchDashboardEvents("all", venueId)
      .then((res) => {
        if (cancelled) return;
        const data = (res as { data?: { id: string; title: string }[] })?.data ?? [];
        setEvents(data.map((e) => ({ id: e.id, title: e.title })));
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const statusOpts: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "completed", label: "Completadas" },
    { id: "pending", label: "Pendientes" },
    { id: "refunded", label: "Reembolsadas" },
  ];

  const typeOpts: { id: TypeFilter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "tickets", label: "Tickets" },
    { id: "mesas", label: "Mesas" },
  ];

  const periodOpts: { id: PeriodFilter; label: string }[] = [
    { id: "today", label: "Hoy" },
    { id: "week", label: "Semana" },
    { id: "month", label: "Mes" },
  ];

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-2">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-left text-sm text-white/70 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        <span className="text-white/40">Ventas</span>
        <span className="text-white/25">/</span>
        <span className="font-medium text-white">Todas las órdenes</span>
      </button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Período</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {periodOpts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`${pill} ${pillActive(period === p.id)}`}
              >
                {p.label}
                {period === p.id ? "●" : ""}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-white/40">Estado</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusOpts.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={`${pill} ${pillActive(status === s.id)}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Tipo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {typeOpts.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`${pill} ${pillActive(type === t.id)}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-white/40">Buscar</p>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cliente, ID o monto..."
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-emerald-500/50"
          />
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-white/40">Evento</p>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500/50"
          >
            <option value="">Todos los eventos</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-white/5 pb-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Órdenes, tickets y reservas
          </h2>
          <p className="text-xs text-white/40">{merged.length} resultados</p>
        </div>
        <p className="mt-2 text-[11px] text-white/35">
          Pulsa una fila para ver cliente, productos y pagos (mismo panel que en móvil).
        </p>
        {error ? <p className="mt-3 text-xs text-red-300">{error}</p> : null}

        <div className="mt-4 space-y-2">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <motion.p
                key="loading"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center text-sm text-white/40"
              >
                Cargando órdenes reales…
              </motion.p>
            ) : merged.length === 0 ? (
              <motion.p
                key="empty"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center text-sm text-white/30"
              >
                No hay órdenes con estos filtros
              </motion.p>
            ) : (
              merged.map((item, i) => (
                <motion.div
                  key={item.key}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, delay: Math.min(i * 0.02, 0.4) }}
                >
                  {item.kind === "order" ? (
                    <OrderCard
                      order={item.order}
                      expanded={expandedId === item.key}
                      onToggle={() => setExpandedId((cur) => (cur === item.key ? null : item.key))}
                    />
                  ) : item.kind === "ticket" ? (
                    <TicketFeedCard
                      ticket={item.ticket}
                      expanded={expandedId === item.key}
                      onToggle={() => setExpandedId((cur) => (cur === item.key ? null : item.key))}
                    />
                  ) : (
                    <ReservationFeedCard
                      reservation={item.reservation}
                      expanded={expandedId === item.key}
                      onToggle={() => setExpandedId((cur) => (cur === item.key ? null : item.key))}
                    />
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
