"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { DashboardView } from "./DashboardView";
import { OrdersView } from "./OrdersView";

type SlideDir = "forward" | "back";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

const slideTransition = { duration: 0.45, ease };

const slideVariants = {
  initial: (dir: SlideDir) => ({
    x: dir === "forward" ? "100%" : "-100%",
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: SlideDir) => ({
    x: dir === "forward" ? "-100%" : "100%",
    opacity: 0,
  }),
};

/**
 * Panel Ventas desktop: dos vistas (resumen / todas las órdenes) sin cambiar de ruta.
 */
export function SalesPanelDesktop() {
  const [view, setView] = useState<"dash" | "orders">("dash");
  const [dir, setDir] = useState<SlideDir>("forward");
  const [slideEnabled, setSlideEnabled] = useState(false);

  const openOrders = () => {
    setSlideEnabled(true);
    setDir("forward");
    setView("orders");
  };

  const closeOrders = () => {
    setSlideEnabled(true);
    setDir("back");
    setView("dash");
  };

  return (
    <div className="min-h-0 w-full overflow-hidden rounded-xl bg-[#0d0d0d] p-5 md:p-6">
      <AnimatePresence mode="wait" custom={dir}>
        {view === "dash" ? (
          <motion.div
            key="dash"
            role="region"
            aria-label="Resumen de ventas"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(70vh,780px)]"
          >
            <DashboardView onOpenAllOrders={openOrders} />
          </motion.div>
        ) : (
          <motion.div
            key="orders"
            role="region"
            aria-label="Todas las órdenes"
            custom={dir}
            variants={slideVariants}
            initial={slideEnabled ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="min-h-[min(70vh,780px)]"
          >
            <OrdersView onBack={closeOrders} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
