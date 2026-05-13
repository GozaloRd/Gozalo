import useSWR from "swr";
import {
  type DashboardSalesPanelMetrics,
  type SalesPeriodBlock,
  fetchDashboardSalesMetrics,
} from "@/lib/dashboardApi";

/**
 * Panel Ventas: un request a `/dashboard/sales-metrics` (hoy, últimos 7 días, mes calendario,
 * tendencias con base real, desglose por evento en el mes). Revalida en intervalo y al foco.
 */
export function useSalesPanelMetrics(venueId?: string | null) {
  return useSWR(
    venueId ? (["dashboard-sales-metrics", venueId] as const) : null,
    () => fetchDashboardSalesMetrics(venueId!),
    { refreshInterval: 30_000, revalidateOnFocus: true }
  );
}

export function useSalesMetrics(
  venueId: string | null | undefined,
  period: "today" | "week" | "month"
) {
  const swr = useSalesPanelMetrics(venueId);
  const block: SalesPeriodBlock | undefined = swr.data?.[period];
  return {
    ...swr,
    data: block,
  };
}

export type { DashboardSalesPanelMetrics, SalesPeriodBlock };
