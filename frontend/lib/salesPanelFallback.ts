import type { DashboardSalesPanelMetrics, SalesPeriodBlock } from "@/lib/dashboardApi";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";

function emptyBlock(total: number): SalesPeriodBlock {
  return {
    total: Number(total) || 0,
    previousTotal: 0,
    percentChange: null,
    trend: null,
    hasComparison: false,
  };
}

/**
 * Si `/dashboard/sales-metrics` falla o aún no responde, reutiliza el mismo payload
 * que ya cargó la página (`/stats` + `/analytics`) para no dejar el panel vacío.
 */
export function buildSalesPanelFallbackMetrics(
  stats: MobileStats | null,
  analytics: MobileAnalytics | null
): DashboardSalesPanelMetrics | null {
  const tr = stats?.revenue?.totalRD;
  if (!tr) return null;

  const tix = analytics?.summary?.tickets?.today ?? 0;
  const revToday = analytics?.summary?.revenue?.today;
  const averageTicket =
    tix > 0 && revToday != null && Number.isFinite(Number(revToday))
      ? Number((Number(revToday) / tix).toFixed(2))
      : null;

  return {
    today: emptyBlock(tr.today),
    week: emptyBlock(tr.week),
    month: emptyBlock(tr.month),
    averageTicket,
    averageTicketNote:
      averageTicket != null ? ("ok" as const) : tr.month > 0 ? ("insufficient" as const) : ("no_orders" as const),
    paidOrdersToday: 0,
    orderRevenueToday: 0,
    ticketsSoldToday: tix,
    reservationsToday: analytics?.summary?.reservations?.today ?? stats?.reservations?.today ?? 0,
    ordersToday: { total: 0, pending: 0, completed: 0 },
    /**
     * Nunca reutilizar `analytics.revenueByEvent` aquí: es ingreso HISTÓRICO por evento
     * (no filtrado al mes) y hace que la suma de la lista (~16k) no cuadre con la card
     * Mes de `stats` (~2k) — la ilusión de "2000 vs 16k".
     */
    revenueByEvent: [],
  };
}
