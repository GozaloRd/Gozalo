"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { fetchDashboardEvents, fetchDashboardTables, type VenueTableRow } from "@/lib/dashboardApi";
import {
  loadAllEventReservations,
  reservationMatchesTable,
  type DashboardReservationRow,
} from "@/lib/dashboardEventReservations";
import { formatMoney } from "@/lib/format";
import {
  aggregateZone,
  augmentTablesForEvent,
  groupByZone,
  type AugmentedTable,
  type ZoneAggregate,
} from "@/lib/tableFlowLogic";
import { EventCirclePickerMesas, type EventMesasMetrics } from "@/components/dashboard/panels/tables-flow/EventCirclePickerMesas";
import { TableDetailView } from "@/components/dashboard/panels/tables-flow/TableDetailView";
import { TablesGlobalSummary } from "@/components/dashboard/panels/tables-flow/TablesGlobalSummary";
import { TablesGridView } from "@/components/dashboard/panels/tables-flow/TablesGridView";
import { ZonesListView } from "@/components/dashboard/panels/tables-flow/ZonesListView";

type Phase = "event-picker" | "zones-list" | "tables-grid" | "table-detail";

const slide = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const } },
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

async function loadMetricsForEvents(
  events: UpcomingEventModel[],
  venueId: string
): Promise<Map<string, EventMesasMetrics>> {
  const map = new Map<string, EventMesasMetrics>();
  await Promise.all(
    events.slice(0, 24).map(async (ev) => {
      try {
        const tb = await fetchDashboardTables(ev.id, venueId, { tableScope: "event" });
        const mesas = ((tb as { mesas?: VenueTableRow[] }).mesas ?? []).filter((m) => m.active !== false);
        const res = await loadAllEventReservations(ev.id, venueId);
        const taken = new Set<string>();
        let revenue = 0;
        for (const r of res) {
          if (["cancelled", "no_show"].includes(String(r.estado ?? ""))) continue;
          revenue += Number(r.ingresoNetoLocalRD ?? r.montoRD ?? 0);
          if (r.tableId) taken.add(r.tableId);
        }
        for (const table of mesas) {
          if (res.some((rr) => reservationMatchesTable(rr, table))) taken.add(table.id);
        }
        map.set(ev.id, { reserved: taken.size, total: mesas.length, revenue });
      } catch {
        map.set(ev.id, { reserved: 0, total: 0, revenue: 0 });
      }
    })
  );
  return map;
}

type Props = {
  venueId: string;
  nowMs: number;
  onBackToVentas: () => void;
};

export function TablesFlow({ venueId, nowMs, onBackToVentas }: Props) {
  const [phase, setPhase] = useState<Phase>("event-picker");
  const [events, setEvents] = useState<UpcomingEventModel[]>([]);
  const [metricsByEventId, setMetricsByEventId] = useState<Map<string, EventMesasMetrics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingEvent, setLoadingEvent] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<UpcomingEventModel | null>(null);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<AugmentedTable | null>(null);

  const [tables, setTables] = useState<VenueTableRow[]>([]);
  const [reservations, setReservations] = useState<DashboardReservationRow[]>([]);

  const loadEvents = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const res = (await fetchDashboardEvents("all", venueId)) as { data?: UpcomingEventModel[] };
      const rows = (res.data ?? []).filter((e) => e.status !== "cancelled");
      const pub = publishedEvents(rows);
      setEvents(pub);
      const m = await loadMetricsForEvents(pub, venueId);
      setMetricsByEventId(m);
    } catch {
      setEvents([]);
      setMetricsByEventId(new Map());
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const loadSelectedEventSnapshot = useCallback(async () => {
    if (!selectedEvent || !venueId) return;
    setLoadingEvent(true);
    try {
      const tb = await fetchDashboardTables(selectedEvent.id, venueId, { tableScope: "event" });
      const mesas = ((tb as { mesas?: VenueTableRow[] }).mesas ?? []).filter((m) => m.active !== false);
      const res = await loadAllEventReservations(selectedEvent.id, venueId);
      setTables(mesas);
      setReservations(res);
    } catch {
      setTables([]);
      setReservations([]);
    } finally {
      setLoadingEvent(false);
    }
  }, [selectedEvent, venueId]);

  const refreshSnapshotAfterMutation = useCallback(async () => {
    await loadEvents();
    await loadSelectedEventSnapshot();
  }, [loadEvents, loadSelectedEventSnapshot]);

  useEffect(() => {
    void loadSelectedEventSnapshot();
  }, [loadSelectedEventSnapshot]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadEvents();
      void loadSelectedEventSnapshot();
    }, 20_000);
    const onFocus = () => {
      void loadEvents();
      void loadSelectedEventSnapshot();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadEvents, loadSelectedEventSnapshot]);

  const augmented = useMemo(() => {
    if (!selectedEvent) return [];
    return augmentTablesForEvent(tables, reservations, selectedEvent.id);
  }, [tables, reservations, selectedEvent]);

  const zoneAggregates: ZoneAggregate[] = useMemo(() => {
    const g = groupByZone(augmented);
    return Object.keys(g)
      .sort((a, b) => a.localeCompare(b, "es"))
      .map((zone) => aggregateZone(zone, g[zone]));
  }, [augmented]);

  const nearestId = useMemo(() => nearestUpcomingId(events, nowMs), [events, nowMs]);

  const globalSummary = useMemo(() => {
    let reserved = 0;
    let total = 0;
    let revenue = 0;
    metricsByEventId.forEach((m) => {
      reserved += m.reserved;
      total += m.total;
      revenue += m.revenue;
    });
    const occ = total > 0 ? (reserved / total) * 100 : 0;
    return { reserved, total, revenue, occ };
  }, [metricsByEventId]);

  const currentZoneAgg = useMemo(
    () => zoneAggregates.find((z) => z.zone === selectedZone) ?? null,
    [zoneAggregates, selectedZone]
  );

  const zoneTables = useMemo(() => {
    if (!selectedZone) return [];
    return groupByZone(augmented)[selectedZone] ?? [];
  }, [augmented, selectedZone]);

  function handleBack() {
    if (phase === "table-detail") {
      setPhase("tables-grid");
      setSelectedTable(null);
      return;
    }
    if (phase === "tables-grid") {
      setPhase("zones-list");
      setSelectedZone(null);
      return;
    }
    if (phase === "zones-list") {
      setPhase("event-picker");
      setSelectedEvent(null);
      setTables([]);
      setReservations([]);
      return;
    }
    onBackToVentas();
  }

  const headerTitle =
    phase === "event-picker"
      ? "Mesas — Selecciona evento"
      : phase === "zones-list"
        ? selectedEvent?.title ?? "Evento"
        : phase === "tables-grid"
          ? `${selectedZone ?? ""} — ${selectedEvent?.title ?? ""}`
          : selectedTable
            ? `Mesa ${selectedTable.label}`
            : "Mesa";

  const showFixedSummary = phase !== "table-detail";

  return (
    <div className="space-y-3 border-l-2 border-emerald-500 pl-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          aria-label={phase === "event-picker" ? "Volver a Ventas" : "Nivel anterior"}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-white">
          <span className="mr-1" aria-hidden>
            🪑
          </span>
          {headerTitle}
        </h2>
      </div>

      {showFixedSummary ? (
        <TablesGlobalSummary
          reservedTotal={globalSummary.reserved}
          revenueRd={globalSummary.revenue}
          occupancyPct={globalSummary.occ}
          capacityLabel={`${globalSummary.reserved} / ${globalSummary.total || "—"} mesas`}
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
            Cargando…
          </motion.div>
        ) : phase === "event-picker" ? (
          <motion.div key="pick" initial="initial" animate="animate" exit="exit" variants={slide}>
            {events.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No hay eventos publicados.</p>
            ) : (
              <EventCirclePickerMesas
                events={events}
                nearestEventId={nearestId}
                metricsByEventId={metricsByEventId}
                onSelect={(ev) => {
                  setSelectedEvent(ev);
                  setPhase("zones-list");
                }}
              />
            )}
          </motion.div>
        ) : phase === "zones-list" && selectedEvent ? (
          <motion.div key="zones" initial="initial" animate="animate" exit="exit" variants={slide}>
            {loadingEvent ? (
              <p className="py-8 text-center text-sm text-slate-500">Cargando zonas…</p>
            ) : (
              <ZonesListView
                event={selectedEvent}
                zoneAggregates={zoneAggregates}
                nowMs={nowMs}
                onPickZone={(zone) => {
                  setSelectedZone(zone);
                  setPhase("tables-grid");
                }}
              />
            )}
          </motion.div>
        ) : phase === "tables-grid" && selectedEvent && selectedZone ? (
          <motion.div key="grid" initial="initial" animate="animate" exit="exit" variants={slide}>
            <TablesGridView
              zoneName={selectedZone}
              eventTitle={selectedEvent.title}
              tables={zoneTables}
              venueId={venueId}
              summaryLine={
                currentZoneAgg
                  ? `${currentZoneAgg.reservadasCount}/${currentZoneAgg.totalMesas} reservadas · ${formatMoney(currentZoneAgg.revenueRd)}`
                  : ""
              }
              onOpenDetail={(t) => {
                setSelectedTable(t);
                setPhase("table-detail");
              }}
              onRefresh={() => void refreshSnapshotAfterMutation()}
            />
          </motion.div>
        ) : phase === "table-detail" && selectedTable && selectedEvent && selectedZone ? (
          <motion.div key="detail" initial="initial" animate="animate" exit="exit" variants={slide}>
            <TableDetailView
              table={selectedTable}
              zoneName={selectedZone}
              eventTitle={selectedEvent.title}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
