"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  fetchDashboardEvents,
  fetchDashboardOrders,
  fetchDashboardOrdersSummary,
  fetchDashboardReservations,
  fetchDashboardTickets,
  type FetchDashboardOrdersParams,
} from "@/lib/dashboardApi";
import { MobileCard } from "@/components/dashboard/mobile/shared/MobileCard";
import {
  mergeVentasFeed,
  orderApiType,
  periodRangeISO,
  type DashboardReservationListRow,
  type DashboardTicketListRow,
} from "@/components/dashboard/panels/orders-flow/mergeVentasFeed";
import { OrderCard } from "@/components/dashboard/panels/orders-flow/OrderCard";
import { OrdersFilters, type OrdersFilterState } from "@/components/dashboard/panels/orders-flow/OrdersFilters";
import { OrdersGlobalSummary } from "@/components/dashboard/panels/orders-flow/OrdersGlobalSummary";
import { ReservationFeedCard } from "@/components/dashboard/panels/orders-flow/ReservationFeedCard";
import { TicketFeedCard } from "@/components/dashboard/panels/orders-flow/TicketFeedCard";

const DEBOUNCE_MS = 300;
const SOUND_KEY = "gozalo_ventas_order_sound";
const NOTIF_KEY = "gozalo_ventas_order_notif";
const SEEN_KEY = "gozalo_ventas_last_feed_key";

function readBool(key: string, defaultVal: boolean) {
  if (typeof window === "undefined") return defaultVal;
  const v = localStorage.getItem(key);
  if (v === null) return defaultVal;
  return v === "1" || v === "true";
}

const slide = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const } },
};

function mapStatus(s: OrdersFilterState["status"]): NonNullable<FetchDashboardOrdersParams["status"]> {
  if (s === "completed") return "completed";
  if (s === "pending") return "pending";
  if (s === "refunded") return "refunded";
  return "all";
}

const FEED_LIMIT = 120;

const EMPTY_TICKETS = { data: [], pagination: { total: 0 } };
const EMPTY_RESV = { data: [], pagination: { total: 0 } };

export function RecentOrdersFlow({
  venueId,
  onBack,
  pollMs = 25000,
}: {
  venueId: string;
  onBack: () => void;
  pollMs?: number;
}) {
  /** "Recientes" ≠ solo hoy calendario: por defecto últimos 30 días para alinear con escritorio y datos demo. */
  const [filters, setFilters] = useState<OrdersFilterState>({
    period: "month",
    status: "all",
    type: "all",
    eventId: null,
  });
  const [qInput, setQInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const prevFirstKey = useRef<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(qInput.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    let cancelled = false;
    setEventsLoading(true);
    void fetchDashboardEvents("all", venueId)
      .then((res) => {
        const data = (res as { data?: { id: string; title: string }[] })?.data;
        if (!cancelled) setEvents((data ?? []).map((e) => ({ id: e.id, title: e.title })));
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  const [notifOn, setNotifOn] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const sync = () => {
      setNotifOn(readBool(NOTIF_KEY, true));
      setSoundOn(readBool(SOUND_KEY, false));
    };
    sync();
    const onPrefs = () => sync();
    window.addEventListener("gozalo-ventas-prefs", onPrefs);
    return () => window.removeEventListener("gozalo-ventas-prefs", onPrefs);
  }, []);

  const summaryKey = useMemo(
    () => ["orders-summary", venueId, filters.period, filters.eventId] as const,
    [venueId, filters.period, filters.eventId]
  );

  const {
    data: summary,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR(
    summaryKey,
    () =>
      fetchDashboardOrdersSummary(venueId, {
        period: filters.period,
        eventId: filters.eventId,
      }),
    { refreshInterval: notifOn ? pollMs : 0 }
  );

  const feedKey = useMemo(
    () =>
      venueId
        ? ([
            "ventas-feed",
            venueId,
            filters.period,
            filters.status,
            filters.type,
            filters.eventId,
            debouncedQ,
          ] as const)
        : null,
    [venueId, filters.period, filters.status, filters.type, filters.eventId, debouncedQ]
  );

  const { data: bundle, isLoading: feedLoading, error: feedError, mutate: mutateFeed } = useSWR(
    feedKey,
    async () => {
      const range = periodRangeISO(filters.period);
      const listParams: Record<string, string> = {
        page: "1",
        pageSize: "100",
        from: range.from,
      };
      if (filters.eventId) listParams.eventId = filters.eventId;

      const errors: string[] = [];

      let ordersRes: Awaited<ReturnType<typeof fetchDashboardOrders>> = {
        data: [],
        total: 0,
        hasMore: false,
      };
      try {
        ordersRes = await fetchDashboardOrders(venueId, {
          period: filters.period,
          status: mapStatus(filters.status),
          type: orderApiType(filters.type),
          eventId: filters.eventId,
          q: debouncedQ || undefined,
          limit: FEED_LIMIT,
          offset: 0,
        });
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Error al cargar órdenes");
      }

      let ticketsRes: Awaited<ReturnType<typeof fetchDashboardTickets>> = EMPTY_TICKETS;
      try {
        ticketsRes = await fetchDashboardTickets(listParams, venueId);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Error al cargar tickets");
      }

      let reservationsRes: Awaited<ReturnType<typeof fetchDashboardReservations>> = EMPTY_RESV;
      try {
        reservationsRes = await fetchDashboardReservations(listParams, venueId);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Error al cargar reservas");
      }

      return { ordersRes, ticketsRes, reservationsRes, fetchErrors: errors };
    },
    { revalidateOnFocus: true, refreshInterval: notifOn ? pollMs : 0 }
  );

  const merged = useMemo(() => {
    if (!bundle) return [];
    const ticketRows =
      (bundle.ticketsRes as { data?: DashboardTicketListRow[] })?.data ?? [];
    const resvRows =
      (bundle.reservationsRes as { data?: DashboardReservationListRow[] })?.data ?? [];
    const orderRows = bundle.ordersRes?.data ?? [];
    return mergeVentasFeed(orderRows, ticketRows, resvRows, filters, debouncedQ);
  }, [bundle, filters, debouncedQ]);

  useEffect(() => {
    const first = merged[0]?.key ?? null;
    if (!first || !notifOn) return;
    if (prevFirstKey.current && first !== prevFirstKey.current) {
      const lastSeen = sessionStorage.getItem(SEEN_KEY);
      if (lastSeen !== first && soundOn) {
        try {
          const ctx = new AudioContext();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = 880;
          g.gain.value = 0.04;
          o.start();
          o.stop(ctx.currentTime + 0.08);
        } catch {
          /* ignore */
        }
      }
    }
    prevFirstKey.current = first;
  }, [merged, notifOn, soundOn]);

  useEffect(() => {
    const k = merged[0]?.key;
    if (k) sessionStorage.setItem(SEEN_KEY, k);
  }, [merged]);

  const live = notifOn && Boolean(summary && summary.pendingCount > 0);

  const fetchErrors = bundle?.fetchErrors ?? [];

  return (
    <motion.div key="recent-orders-flow" variants={slide} initial="initial" animate="animate" exit="exit" className="space-y-3">
      {!venueId?.trim() ? (
        <p className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-3 text-sm text-amber-100">
          Falta el local activo (venue). Abre el dashboard con un local seleccionado o añade{" "}
          <code className="text-xs">?venueId=…</code> en la URL.
        </p>
      ) : null}
      {feedError ? (
        <p className="rounded-xl border border-red-500/40 bg-red-950/50 px-3 py-2 text-xs text-red-200">
          {feedError instanceof Error ? feedError.message : "Error al cargar el feed"}
        </p>
      ) : null}
      {fetchErrors.length > 0 ? (
        <p className="rounded-xl border border-amber-500/35 bg-amber-950/40 px-3 py-2 text-xs text-amber-100">
          {fetchErrors.join(" · ")}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-zinc-800"
      >
        <ChevronLeft className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
        Ventas
      </button>

      <OrdersGlobalSummary summary={summary ?? null} loading={summaryLoading} live={live} />

      <MobileCard variant="inner" area="ventas">
        <OrdersFilters
          value={filters}
          onChange={setFilters}
          events={events}
          eventsLoading={eventsLoading}
          search={qInput}
          debouncedSearch={debouncedQ}
          onSearchChange={setQInput}
        />
      </MobileCard>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Órdenes, tickets y reservas
        </p>
        {feedLoading && !bundle ? (
          <p className="text-sm text-slate-500">Cargando actividad…</p>
        ) : merged.length === 0 ? (
          <p className="text-sm text-slate-500">No hay resultados con estos filtros.</p>
        ) : (
          <AnimatePresence initial={false}>
            {merged.map((item) => (
              <motion.div
                key={item.key}
                layout
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22 }}
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
            ))}
          </AnimatePresence>
        )}
      </div>

    </motion.div>
  );
}
