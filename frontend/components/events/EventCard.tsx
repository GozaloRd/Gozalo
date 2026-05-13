"use client";

import { motion } from "framer-motion";
import type { EventCardModel } from "./types";

export function EventCard({
  event,
  compact,
  selected,
  onSelect,
}: {
  event: EventCardModel;
  compact: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const isPast = event.badge === "finished";
  return (
    <motion.button
      type="button"
      layout
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className={`overflow-hidden rounded-xl border text-left transition-colors ${
        selected
          ? "border-orange-500/50 bg-white/[0.06]"
          : isPast
            ? "border-white/10 bg-white/[0.04] hover:border-white/20"
            : "border-white/10 bg-white/[0.04] hover:border-orange-500/40"
      } ${compact ? "flex min-h-[180px]" : "flex flex-col"}`}
    >
      <div className={`${compact ? "w-44 shrink-0" : "w-full"} relative`}>
        {event.coverUrl ? (
          <img
            src={event.coverUrl}
            alt={event.title}
            className={`h-full w-full object-cover ${compact ? "min-h-[180px]" : "aspect-video"} ${
              isPast ? "opacity-80" : ""
            }`}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5D2E8C]/90 via-[#9B7FCA]/50 to-[#0A0A0F] px-4 text-center ${
              compact ? "min-h-[180px]" : "aspect-video"
            }`}
          >
            <span className="line-clamp-3 text-sm font-bold text-white/95">{event.title}</span>
          </div>
        )}
        <span
          className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
            isPast ? "bg-gray-600/80" : "bg-purple-600/80"
          }`}
        >
          {isPast ? "FINALIZADO" : "PROXIMO"}
        </span>
      </div>
      <div className="flex-1 border-t border-white/10 p-4 text-white/80">
        <p className="text-base font-bold text-white">{event.title}</p>
        <p className="mt-1 text-sm text-white/50">{event.whenLabel}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            Entradas: <strong className="text-orange-400">{event.tickets}</strong>
          </span>
          <span>
            Recaudado: <strong className="text-orange-400">RD$ {event.revenue.toLocaleString("es-DO")}</strong>
          </span>
        </div>
        <p className="mt-3 text-xs text-orange-400">Clic para gestionar -&gt;</p>
      </div>
    </motion.button>
  );
}
