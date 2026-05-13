"use client";

import { motion } from "framer-motion";
import { Ticket } from "lucide-react";

type Props = {
  bgColor: string;
  variant?: "dark" | "light";
  firstTicketId?: string | null;
  onFirstTicket?: (id: string) => void;
};

export function BottomCTABar({ bgColor, variant = "dark", firstTicketId, onFirstTicket }: Props) {
  const light = variant === "light";

  function handleClick() {
    if (firstTicketId && onFirstTicket) {
      onFirstTicket(firstTicketId);
      return;
    }
    document.getElementById("tickets-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (light) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-neutral-200 bg-white/95 px-5 py-3.5 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md">
        <p className="text-xs font-medium text-neutral-500">Obtener entrada</p>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={handleClick}
          className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-white shadow-md transition hover:bg-neutral-800"
        >
          <Ticket className="h-4 w-4 text-white" />
          <span className="text-sm font-bold">Obtener entrada</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-white/10 px-5 py-3.5 backdrop-blur-xl"
      style={{ backgroundColor: `${bgColor}f2` }}
    >
      <p className="text-xs text-white/38">Obtener entrada</p>
      <motion.button
        type="button"
        whileTap={{ scale: 0.96 }}
        onClick={handleClick}
        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5"
      >
        <Ticket className="h-4 w-4" style={{ color: bgColor }} />
        <span className="text-sm font-bold" style={{ color: bgColor }}>
          Obtener entrada
        </span>
      </motion.button>
    </div>
  );
}
