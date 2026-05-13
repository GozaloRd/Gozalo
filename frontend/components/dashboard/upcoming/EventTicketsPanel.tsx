"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import { formatMoney } from "@/lib/format";

export type TicketTypeRow = {
  id: string;
  name: string;
  price: number | string;
  quantityTotal?: number;
  soldCount?: number;
  active?: boolean;
  sortOrder?: number;
};

type Props = {
  eventId: string;
  types: TicketTypeRow[];
  onClose: () => void;
};

const panelMotion = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
};

export function EventTicketsPanel({ eventId, types, onClose }: Props) {
  const totalCap = types.reduce((acc, t) => acc + (t.quantityTotal ?? 0), 0);
  const totalSold = types.reduce((acc, t) => acc + (t.soldCount ?? 0), 0);
  const totalRev = types.reduce(
    (acc, t) => acc + Number(t.price || 0) * (t.soldCount ?? 0),
    0
  );

  return (
    <motion.div
      key="tickets-panel"
      id={`event-tickets-panel-${eventId}`}
      role="region"
      aria-label="Tickets vendidos por tipo"
      variants={panelMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg backdrop-blur-sm"
    >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              <span aria-hidden>🎟️</span> Tickets vendidos
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {totalSold}
              {totalCap ? ` / ${totalCap}` : ""} vendidos
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar panel de tickets"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {types.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">Aún no hay tickets vendidos</p>
        ) : (
          <>
            <ul className="space-y-3">
              {types.map((tt, idx) => {
                const sold = tt.soldCount ?? 0;
                const cap = tt.quantityTotal ?? 0;
                const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : sold > 0 ? 100 : 0;
                const rev = Number(tt.price || 0) * sold;
                const bars = ["bg-purple-500", "bg-fuchsia-500", "bg-violet-500", "bg-indigo-500", "bg-pink-500"];
                const barClass = bars[idx % bars.length];
                return (
                  <li
                    key={tt.id}
                    className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-white">{tt.name}</span>
                      <span className="shrink-0 text-xs text-zinc-400">{formatMoney(Number(tt.price))}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                      <span>
                        {sold} / {cap || "∞"} vendidos
                      </span>
                      <span className="font-medium text-zinc-300">{formatMoney(rev)}</span>
                    </div>
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
              <p>
                Total vendido: <span className="font-semibold text-white">{totalSold}</span>
              </p>
              <p className="mt-1">
                Total ingresos (estim. por tipo):{" "}
                <span className="font-semibold text-white">{formatMoney(totalRev)}</span>
              </p>
            </div>
          </>
        )}
    </motion.div>
  );
}
