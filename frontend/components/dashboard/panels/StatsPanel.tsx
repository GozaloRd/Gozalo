"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, GitCompare, LineChart, Target } from "lucide-react";
import { MobilePanelRow } from "@/components/dashboard/mobile/shared/MobilePanelRow";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import { ChannelAnalysisMobile } from "@/components/dashboard/panels/stats-mobile/ChannelAnalysisMobile";
import { EventsComparisonMobile } from "@/components/dashboard/panels/stats-mobile/EventsComparisonMobile";
import { MonthlyEvolutionChart } from "@/components/dashboard/panels/stats-mobile/MonthlyEvolutionChart";
import { StatsEventFlow } from "@/components/dashboard/panels/stats-mobile/StatsEventFlow";
import { StatsKpiGrid } from "@/components/dashboard/panels/stats-mobile/StatsKpiGrid";
import { TrendsMobile } from "@/components/dashboard/panels/stats-mobile/TrendsMobile";
import { useMonthlyEvolutionSeries, useStatsOverviewKpis } from "@/hooks/useStatsMobileOverview";
import { useSalesPanelMetrics } from "@/hooks/useSalesMetrics";

const fadeSlide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
};

type StatsView = "main" | "event" | "comparison" | "trends" | "channels";

export function StatsPanel({
  stats,
  analytics,
  venueId,
  nowMs,
  onRegisterStatsCloseGuard,
}: {
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
  venueId: string;
  nowMs: number;
  onRegisterStatsCloseGuard?: (fn: (() => boolean) | null) => void;
}) {
  const [view, setView] = useState<StatsView>("main");
  const { data: salesMetrics } = useSalesPanelMetrics(venueId || null);
  const kpis = useStatsOverviewKpis(stats, analytics, salesMetrics ?? undefined);
  const { points } = useMonthlyEvolutionSeries(analytics);

  useEffect(() => {
    if (!onRegisterStatsCloseGuard) return;
    const fn = () => {
      if (view !== "main") {
        setView("main");
        return true;
      }
      return false;
    };
    onRegisterStatsCloseGuard(fn);
    return () => onRegisterStatsCloseGuard(null);
  }, [onRegisterStatsCloseGuard, view]);

  const showSub = Boolean(venueId);

  return (
    <AnimatePresence mode="wait">
      {showSub && view === "event" ? (
        <motion.div
          key="stats-event"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <StatsEventFlow venueId={venueId} nowMs={nowMs} onBackToPanel={() => setView("main")} />
        </motion.div>
      ) : showSub && view === "comparison" ? (
        <motion.div
          key="stats-comparison"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <EventsComparisonMobile venueId={venueId} onBack={() => setView("main")} />
        </motion.div>
      ) : showSub && view === "trends" ? (
        <motion.div
          key="stats-trends"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <TrendsMobile venueId={venueId} onBack={() => setView("main")} />
        </motion.div>
      ) : showSub && view === "channels" ? (
        <motion.div
          key="stats-channels"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <ChannelAnalysisMobile venueId={venueId} onBack={() => setView("main")} />
        </motion.div>
      ) : (
        <motion.div
          key="stats-main"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-4 md:grid md:grid-cols-12 md:gap-x-4 md:gap-y-5 md:space-y-0"
        >
          <div className="md:col-span-12">
            <StatsKpiGrid items={kpis} />
          </div>

          <div className="space-y-2 md:col-span-7 md:space-y-2">
            <h3 className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Evolución mensual</h3>
            <MonthlyEvolutionChart points={points} />
          </div>

          <div className="space-y-2 md:col-span-5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Análisis detallado</p>
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              <MobilePanelRow
                Icon={BarChart3}
                label="Estadísticas por evento"
                hint="Detalle de cada evento"
                tone="estadisticas"
                onRowClick={() => setView("event")}
              />
              <MobilePanelRow
                Icon={GitCompare}
                label="Comparativa entre eventos"
                hint="Compara métricas lado a lado"
                tone="estadisticas"
                onRowClick={() => setView("comparison")}
              />
              <MobilePanelRow
                Icon={LineChart}
                label="Tendencias por mes / día"
                hint="Patrones temporales"
                tone="estadisticas"
                onRowClick={() => setView("trends")}
              />
              <MobilePanelRow
                Icon={Target}
                label="Análisis de canales"
                hint="Tickets · Mesas"
                tone="estadisticas"
                onRowClick={() => setView("channels")}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
