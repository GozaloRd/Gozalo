"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Table2, Ticket } from "lucide-react";

export type PurchaseFlowIcon = "ticket" | "table";

type CardProps = {
  title: string;
  subtitle: string;
  icon: PurchaseFlowIcon;
};

function TransitionCard({ title, subtitle, icon }: CardProps) {
  const Icon = icon === "table" ? Table2 : Ticket;
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay: 0.05 }}
      className="w-full max-w-[280px] rounded-[22px] border border-white/[0.14] bg-gradient-to-b from-white/[0.12] to-white/[0.05] px-6 py-8 text-center shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
    >
      <motion.span
        className="mx-auto flex w-fit justify-center text-white"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="h-11 w-11" strokeWidth={1.6} aria-hidden />
      </motion.span>
      <p className="mt-4 text-[15px] font-bold tracking-tight text-white">{title}</p>
      <p className="mt-1.5 text-[12px] text-white/45">{subtitle}</p>
    </motion.div>
  );
}

/** Overlay fijo al salir del evento hacia checkout o reserva (misma animación). */
export function PurchaseFlowFullscreenOverlay({ open, ...card }: CardProps & { open: boolean }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="purchase-flow-fullscreen"
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/72 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <TransitionCard {...card} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** Misma tarjeta animada centrada (p. ej. carga inicial de checkout/reserva, sin texto “Cargando…”). */
export function PurchaseFlowEmbeddedCard(props: CardProps) {
  return (
    <div className="flex w-full flex-col items-center justify-center px-6 py-16">
      <TransitionCard {...props} />
    </div>
  );
}
