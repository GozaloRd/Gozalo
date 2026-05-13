"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { CashDashboardView } from "./CashDashboardView";
import { CashReportsHistoryView } from "./CashReportsHistoryView";
import { NewCashReportView } from "./NewCashReportView";
import type { CashView } from "./types";

const transition = { type: "tween" as const, ease: [0.25, 0.46, 0.45, 0.94] as const, duration: 0.45 };
const variants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

export function CashPanelDesktop({ venueId }: { venueId: string }) {
  const [view, setView] = useState<CashView>("dashboard");
  const [direction, setDirection] = useState(1);

  const goTo = (next: CashView, dir: number) => {
    setDirection(dir);
    setView(next);
  };

  return (
    <div className="min-h-0 w-full overflow-hidden rounded-xl bg-[#0d0d0d] p-5 md:p-6">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={view}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="min-h-[min(72vh,860px)]"
        >
          {view === "dashboard" ? (
            <CashDashboardView
              venueId={venueId}
              onOpenNewReport={() => goTo("newReport", 1)}
              onOpenHistory={() => goTo("history", 1)}
            />
          ) : null}
          {view === "newReport" ? (
            <NewCashReportView
              venueId={venueId}
              onBack={() => goTo("dashboard", -1)}
              onSaved={() => {
                /* El dashboard recarga al montar su vista. */
              }}
            />
          ) : null}
          {view === "history" ? (
            <CashReportsHistoryView
              venueId={venueId}
              onBack={() => goTo("dashboard", -1)}
              onGoToNewReport={() => goTo("newReport", 1)}
            />
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
