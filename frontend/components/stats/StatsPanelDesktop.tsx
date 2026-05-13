"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import type { StatsMainView } from "./types";
import { ChannelsView } from "./ChannelsView";
import { ComparativeView } from "./ComparativeView";
import { EventStatsView } from "./EventStatsView";
import { StatsDashboardView } from "./StatsDashboardView";
import { TrendsView } from "./TrendsView";

type SlideDir = "forward" | "back";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const slideTransition = { duration: 0.45, ease };

const slideVariants = {
  initial: (dir: SlideDir) => ({
    x: dir === "forward" ? "100%" : "-100%",
    opacity: 0,
  }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: SlideDir) => ({
    x: dir === "forward" ? "-100%" : "100%",
    opacity: 0,
  }),
};

/**
 * Panel Estadísticas desktop: dashboard + sub-vistas con slide, sin cambiar de ruta.
 */
export function StatsPanelDesktop({
  allVenueEvents,
  statsEventsLoading,
  venueId,
  stats,
  analytics,
}: {
  allVenueEvents: UpcomingEventModel[];
  statsEventsLoading?: boolean;
  venueId: string;
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
}) {
  const [view, setView] = useState<StatsMainView>("dashboard");
  const [dir, setDir] = useState<SlideDir>("forward");
  const [slideEnabled, setSlideEnabled] = useState(false);

  const openSub = (v: Exclude<StatsMainView, "dashboard">) => {
    setSlideEnabled(true);
    setDir("forward");
    setView(v);
  };

  const backToDash = () => {
    setSlideEnabled(true);
    setDir("back");
    setView("dashboard");
  };

  return (
    <div className="min-h-0 w-full overflow-hidden rounded-xl bg-[#0d0d0d] p-5 md:p-6">
      <AnimatePresence mode="wait" custom={dir}>
        {view === "dashboard" ? (
          <motion.div
            key="stats-dash"
            role="region"
            aria-label="Resumen estadístico"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(72vh,820px)]"
          >
            <StatsDashboardView onNavigate={openSub} venueId={venueId} stats={stats} analytics={analytics} />
          </motion.div>
        ) : view === "events" ? (
          <motion.div
            key="stats-events"
            role="region"
            aria-label="Estadísticas por evento"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(72vh,820px)]"
          >
            <EventStatsView
              onBack={backToDash}
              allVenueEvents={allVenueEvents}
              eventsLoading={Boolean(statsEventsLoading)}
              venueId={venueId}
            />
          </motion.div>
        ) : view === "comparative" ? (
          <motion.div
            key="stats-comp"
            role="region"
            aria-label="Comparativa entre eventos"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(72vh,820px)]"
          >
            <ComparativeView onBack={backToDash} venueId={venueId} />
          </motion.div>
        ) : view === "trends" ? (
          <motion.div
            key="stats-trends"
            role="region"
            aria-label="Tendencias"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(72vh,820px)]"
          >
            <TrendsView onBack={backToDash} venueId={venueId} />
          </motion.div>
        ) : view === "channels" ? (
          <motion.div
            key="stats-channels"
            role="region"
            aria-label="Análisis de canales"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(72vh,820px)]"
          >
            <ChannelsView onBack={backToDash} venueId={venueId} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
