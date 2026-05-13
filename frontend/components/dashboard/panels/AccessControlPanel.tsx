"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import type { MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  fetchDashboardTables,
  fetchOccupancy,
  type VenueTableRow,
} from "@/lib/dashboardApi";
import { loadAllEventReservations, type DashboardReservationRow } from "@/lib/dashboardEventReservations";
import { formatAccessEventLine } from "@/lib/formatAccessEventLine";
import { AccessInfoCards } from "@/components/dashboard/panels/access/AccessInfoCards";
import { PaymentsControlItem } from "@/components/dashboard/panels/access/PaymentsControlItem";
import { PaymentsControlView } from "@/components/dashboard/panels/access/PaymentsControlView";
import { QRScannerCard } from "@/components/dashboard/panels/access/QRScannerCard";
import { TablesStatusItem } from "@/components/dashboard/panels/access/TablesStatusItem";
import { TablesStatusView } from "@/components/dashboard/panels/access/TablesStatusView";
import { useAccessPanelPolling } from "@/hooks/useAccessRealtime";
import { useNearestEventWithTables } from "@/hooks/useNearestEventWithTables";
import { flushPendingScans } from "@/services/access-sync.service";
import { augmentTablesForAccess, countStates } from "@/lib/accessTableAugment";
import { formatMoney } from "@/lib/format";

/** Misma familia de transición que Ventas (`SalesPanel`). */
const fadeSlide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
};

type AccessPhase = "main" | "tables" | "payments";

export function AccessControlPanel({
  area,
  stats,
  opsAlertCount,
  venueId: venueIdProp,
  upcomingEvents: _upcomingEvents,
  onRefreshData,
  onRegisterAccessCloseGuard,
}: {
  area: QuickAreaConfig;
  stats: MobileStats | null;
  opsAlertCount: number;
  venueId: string;
  upcomingEvents: UpcomingEventModel[];
  onRefreshData?: () => void;
  onRegisterAccessCloseGuard?: (fn: (() => boolean) | null) => void;
}) {
  void area;
  void opsAlertCount;
  void _upcomingEvents;

  const { venueId: ctxVenue } = useDashboard();
  const venueId = venueIdProp || ctxVenue || null;

  const { data: nearest, isLoading: nearestLoading } = useNearestEventWithTables(venueId);
  const eventId = nearest?.id ?? "";

  const [phase, setPhase] = useState<AccessPhase>("main");
  const [tables, setTables] = useState<VenueTableRow[]>([]);
  const [reservations, setReservations] = useState<DashboardReservationRow[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [occ, setOcc] = useState<{ venueCapacity: number; successfulScans: number } | null>(null);
  const [sessionScans, setSessionScans] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!onRegisterAccessCloseGuard) return;
    const fn = () => {
      if (phase !== "main") {
        setPhase("main");
        return true;
      }
      return false;
    };
    onRegisterAccessCloseGuard(fn);
    return () => onRegisterAccessCloseGuard(null);
  }, [onRegisterAccessCloseGuard, phase]);

  const loadTableBundle = useCallback(async () => {
    if (!venueId || !eventId) {
      setTables([]);
      setReservations([]);
      return;
    }
    setLoadingTables(true);
    try {
      const [t, resRows, o] = await Promise.all([
        fetchDashboardTables(eventId, venueId, { tableScope: "event" }),
        loadAllEventReservations(eventId, venueId),
        fetchOccupancy(eventId, venueId).catch(() => null),
      ]);
      setTables(((t as { mesas?: VenueTableRow[] }).mesas ?? []).filter((m) => m.active !== false));
      setReservations(resRows);
      if (o) {
        setOcc({
          venueCapacity: Number((o as { venueCapacity?: number }).venueCapacity ?? 0),
          successfulScans: Number((o as { successfulScans?: number }).successfulScans ?? 0),
        });
      } else {
        setOcc(null);
      }
    } catch {
      setTables([]);
      setReservations([]);
    } finally {
      setLoadingTables(false);
    }
  }, [venueId, eventId]);

  useEffect(() => {
    void loadTableBundle();
  }, [loadTableBundle]);

  const tick = useCallback(() => {
    onRefreshData?.();
    if (eventId && venueId) {
      void fetchOccupancy(eventId, venueId)
        .then((o) => {
          if (o) {
            setOcc({
              venueCapacity: Number((o as { venueCapacity?: number }).venueCapacity ?? 0),
              successfulScans: Number((o as { successfulScans?: number }).successfulScans ?? 0),
            });
          }
        })
        .catch(() => {});
    }
  }, [onRefreshData, eventId, venueId]);

  useAccessPanelPolling(tick, true, 5000);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    setSyncing(true);
    void flushPendingScans(venueId)
      .then(({ flushed }) => {
        if (!cancelled && flushed > 0) onRefreshData?.();
      })
      .finally(() => {
        if (!cancelled) setSyncing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [venueId, onRefreshData]);

  useEffect(() => {
    const on = () => {
      if (!venueId) return;
      setSyncing(true);
      void flushPendingScans(venueId)
        .then(({ flushed }) => {
          if (flushed > 0) onRefreshData?.();
        })
        .finally(() => setSyncing(false));
    };
    window.addEventListener("online", on);
    return () => window.removeEventListener("online", on);
  }, [venueId, onRefreshData]);

  const eventTitle = nearest?.title ?? stats?.occupancy?.activeEvent?.title ?? "Evento";
  const eventLine = nearest ? formatAccessEventLine(nearest.title, nearest.startAt) : "—";

  const tablesHint = useMemo(() => {
    if (nearestLoading) return "Detectando evento…";
    if (!nearest) return "Sin eventos próximos con mesas";
    if (loadingTables) return "Cargando…";
    const aug = augmentTablesForAccess(tables, reservations, eventId);
    const { libres, reserv, ocup } = countStates(aug);
    const resForEvent = reservations.filter((r) => r.evento?.id === eventId && r.estado !== "cancelled");
    if (tables.length === 0) return "Sin mesas en este evento";
    if (resForEvent.length === 0) return "Sin reservas hoy";
    return `${libres} libres · ${reserv} reserv · ${ocup} ocup`;
  }, [nearestLoading, nearest, loadingTables, tables, reservations, eventId]);

  const paymentsHint = useMemo(() => {
    if (nearestLoading) return "Detectando evento…";
    if (!nearest) return "Sin eventos próximos con mesas";
    if (loadingTables) return "Cargando…";
    const aug = augmentTablesForAccess(tables, reservations, eventId);
    const debtors = aug.filter((t) => t.pendingTotal > 0);
    const pendingSum = debtors.reduce((a, t) => a + t.pendingTotal, 0);
    if (debtors.length === 0) return "Sin saldos pendientes";
    return `⚠️ ${debtors.length} pendiente${debtors.length === 1 ? "" : "s"} · ${formatMoney(pendingSum)}`;
  }, [nearestLoading, nearest, loadingTables, tables, reservations, eventId]);

  const showTablesFlow = phase === "tables";
  const showPaymentsFlow = phase === "payments";

  return (
    <AnimatePresence mode="wait">
      {showTablesFlow ? (
        <motion.div
          key="access-tables-flow"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <TablesStatusView
            eventId={eventId}
            eventTitle={eventTitle}
            eventLine={nearest ? eventLine : "Sin eventos próximos con mesas reservables"}
            tables={tables}
            reservations={reservations}
            loading={loadingTables || nearestLoading}
            onBack={() => setPhase("main")}
            onRefresh={() => {
              void loadTableBundle();
              onRefreshData?.();
            }}
          />
        </motion.div>
      ) : showPaymentsFlow ? (
        <motion.div
          key="access-payments-flow"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <PaymentsControlView
            eventId={eventId}
            eventTitle={eventTitle}
            eventLine={nearest ? eventLine : "Sin eventos próximos con mesas reservables"}
            tables={tables}
            reservations={reservations}
            loading={loadingTables || nearestLoading}
            onBack={() => setPhase("main")}
          />
        </motion.div>
      ) : (
        <motion.div
          key="access-main"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-4"
        >
          <div className="rounded-xl border border-white/[0.08] bg-zinc-950/70 p-3">
            <p className="text-center text-xs font-medium text-slate-400">Validador QR</p>
            <div className="mt-2 flex justify-center">
              <QRScannerCard
                maxWidth={320}
                venueId={venueId}
                eventId={eventId}
                syncing={syncing}
                onValidated={() => {
                  onRefreshData?.();
                  void loadTableBundle();
                  setSessionScans((s) => s + 1);
                }}
              />
            </div>
          </div>

          <AccessInfoCards stats={stats} occupancyRest={occ} sessionQrBump={sessionScans} />

          <div className="space-y-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Funcionalidades</p>
            <TablesStatusItem hint={tablesHint} onOpen={() => setPhase("tables")} />
            <PaymentsControlItem hint={paymentsHint} onOpen={() => setPhase("payments")} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
