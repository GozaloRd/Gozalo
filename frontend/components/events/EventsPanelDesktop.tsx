"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { CreateEventWizard } from "./CreateEventWizard";
import { EventsDashboardView } from "./EventsDashboardView";
import type { EventsMainView } from "./types";

type SlideDir = "forward" | "back";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const slideTransition = { duration: 0.45, ease };

const slideVariants = {
  initial: (dir: SlideDir) => ({ x: dir === "forward" ? "100%" : "-100%", opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: SlideDir) => ({ x: dir === "forward" ? "-100%" : "100%", opacity: 0 }),
};

export function EventsPanelDesktop({ allVenueEvents }: { allVenueEvents: UpcomingEventModel[] }) {
  const [view, setView] = useState<EventsMainView>("dashboard");
  const [dir, setDir] = useState<SlideDir>("forward");
  const [slideEnabled, setSlideEnabled] = useState(false);

  const openWizard = () => {
    setSlideEnabled(true);
    setDir("forward");
    setView("wizard");
  };

  const closeWizard = () => {
    setSlideEnabled(true);
    setDir("back");
    setView("dashboard");
  };

  return (
    <div className="min-h-0 w-full overflow-hidden rounded-xl bg-[#0d0d0d] p-5 md:p-6">
      <AnimatePresence mode="wait" custom={dir}>
        {view === "dashboard" ? (
          <motion.div
            key="events-dashboard"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(72vh,860px)]"
          >
            <EventsDashboardView onCreateEvent={openWizard} allVenueEvents={allVenueEvents} />
          </motion.div>
        ) : (
          <motion.div
            key="events-wizard"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(72vh,860px)]"
          >
            <CreateEventWizard onExit={closeWizard} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
