import { useCallback, useEffect, useState } from "react";
import {
  fetchDashboardTables,
  type VenueTableRow,
} from "@/lib/dashboardApi";
import {
  loadAllEventReservations,
  type DashboardReservationRow,
} from "@/lib/dashboardEventReservations";

export function useEventTablesDetail(
  eventId: string | null,
  venueId: string | null,
  enabled: boolean
) {
  const [tables, setTables] = useState<VenueTableRow[]>([]);
  const [reservations, setReservations] = useState<DashboardReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!eventId || !venueId) return;
    setLoading(true);
    setError(null);
    try {
      const t = await fetchDashboardTables(eventId, venueId, { tableScope: "event" });
      const mesas = ((t as { mesas?: VenueTableRow[] })?.mesas ?? []).filter((m) => m.active !== false);
      setTables(mesas);
      const resRows = await loadAllEventReservations(eventId, venueId);
      setReservations(resRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar mesas");
      setTables([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, venueId]);

  useEffect(() => {
    if (!enabled || !eventId || !venueId) {
      setTables([]);
      setReservations([]);
      setError(null);
      return;
    }
    void load();
  }, [enabled, eventId, venueId, load]);

  return { tables, reservations, loading, error, reload: load };
}
