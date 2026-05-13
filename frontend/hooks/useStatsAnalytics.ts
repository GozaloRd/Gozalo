import useSWR from "swr";
import { fetchDashboardAnalytics, fetchDashboardTickets } from "@/lib/dashboardApi";

/** Analytics `all` (tendencias / histórico largo). */
export function useStatsAnalyticsAll(venueId: string | null) {
  return useSWR(
    venueId ? ["stats-analytics", venueId, "all"] : null,
    () => fetchDashboardAnalytics({ range: "all" }, venueId!),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
}

/** Analytics 30d con tablas y canales (comparativa / canales). */
export function useStatsAnalytics30d(venueId: string | null) {
  return useSWR(
    venueId ? ["stats-analytics", venueId, "30d"] : null,
    () => fetchDashboardAnalytics({ range: "30d" }, venueId!),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
}

export function useEventStatsAnalytics(venueId: string | null, eventId: string | null) {
  return useSWR(
    venueId && eventId ? ["stats-analytics-event", venueId, eventId] : null,
    () => fetchDashboardAnalytics({ range: "30d", eventId: eventId! }, venueId!),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
}

/** Analytics + tipos de ticket para la vista detalle por evento. */
export function useEventStatsDetailBundle(venueId: string | null, eventId: string | null) {
  return useSWR(
    venueId && eventId ? ["stats-event-detail", venueId, eventId] : null,
    async () => {
      const [analytics, tickets] = await Promise.all([
        fetchDashboardAnalytics({ range: "30d", eventId: eventId! }, venueId!),
        fetchDashboardTickets({ eventId: eventId! }, venueId!),
      ]);
      return { analytics: analytics as Record<string, unknown>, tickets };
    },
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
}
