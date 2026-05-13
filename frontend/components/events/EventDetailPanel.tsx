"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { EventDetailTabs } from "./EventDetailTabs";
import type { EventCardModel } from "./types";

export function EventDetailPanel({
  event,
  onClose,
}: {
  event: EventCardModel;
  onClose: () => void;
}) {
  const isPast = event.badge === "finished";

  return (
    <motion.aside
      key={event.id}
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-xl border border-white/10 bg-[#141414]"
    >
      <div className="relative">
        {event.coverUrl ? (
          <img src={event.coverUrl} alt={event.title} className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-[#5D2E8C]/90 via-[#9B7FCA]/50 to-[#0A0A0F] px-4 text-center">
            <span className="line-clamp-3 text-lg font-bold text-white/95">{event.title}</span>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70"
          aria-label="Cerrar detalle"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 p-5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${isPast ? "bg-gray-600/80" : "bg-purple-600/80"}`}>
          {isPast ? "FINALIZADO" : "PROXIMO"}
        </span>
        <div>
          <h3 className="text-xl font-bold text-white">{event.title}</h3>
          <p className="text-sm text-white/50">{event.whenLabel}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MetricCard label="ENTRADAS" value={String(event.tickets)} />
          <MetricCard label="RESERVAS" value={String(event.reservations)} />
          <MetricCard label="RECAUDADO" value={`RD$ ${event.revenue.toLocaleString("es-DO")}`} />
        </div>

        <EventDetailTabs event={event} />
      </div>
    </motion.aside>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
