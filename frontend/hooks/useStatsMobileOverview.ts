import { useMemo } from "react";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import type { DashboardSalesPanelMetrics } from "@/lib/dashboardApi";
import {
  buildMonthlyEvolution,
  buildStatsKpis,
  type MonthlyEvolutionPoint,
  type StatsKpiDerived,
} from "@/lib/statsMobileDerive";

export function useStatsOverviewKpis(
  stats: MobileStats | null,
  analytics: MobileAnalytics | null,
  salesMetrics?: DashboardSalesPanelMetrics | null
): StatsKpiDerived[] {
  return useMemo(() => buildStatsKpis(stats, analytics, salesMetrics ?? undefined), [stats, analytics, salesMetrics]);
}

export function useMonthlyEvolutionSeries(analytics: MobileAnalytics | null): {
  points: MonthlyEvolutionPoint[];
} {
  return useMemo(() => {
    const points = buildMonthlyEvolution(analytics, 12);
    return { points };
  }, [analytics]);
}
