"use client";

import { motion } from "framer-motion";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { formatMoney } from "@/lib/format";

function formatEventWhen(iso: string) {
  return new Date(iso).toLocaleString("es-DO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isLive(event: UpcomingEventModel, nowMs: number) {
  const s = new Date(event.startAt).getTime();
  const e = new Date(event.endAt).getTime();
  return s <= nowMs && e >= nowMs;
}

const listVariant = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0, 0, 0.2, 1] as const } },
};

export function DesktopEventsGrid({
  events,
  nowMs,
  variant,
  onSelect,
}: {
  events: UpcomingEventModel[];
  nowMs: number;
  variant: "upcoming" | "past";
  onSelect: (e: UpcomingEventModel) => void;
}) {
  const rows = [...events]
    .filter((e) => e.status !== "cancelled")
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  if (variant === "past") rows.reverse();

  return (
    <motion.div
      className="hidden md:grid md:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] md:gap-4"
      variants={listVariant}
      initial="hidden"
      animate="show"
    >
      {rows.map((ev) => {
        const live = isLive(ev, nowMs);
        const sold = ev.metricas?.ticketsVendidos ?? 0;
        return (
          <motion.button
            key={ev.id}
            type="button"
            variants={cardVariant}
            onClick={() => onSelect(ev)}
            className="group overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-900/85 text-left shadow-lg backdrop-blur-sm transition hover:border-white/20 hover:bg-zinc-900"
          >
            <div className="relative h-[120px] w-full overflow-hidden">
              {ev.coverImageUrl ? (
                <div
                  className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url(${ev.coverImageUrl})` }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#5D2E8C]/90 via-[#9B7FCA]/50 to-[#0A0A0F] px-3 text-center">
                  <span className="font-display line-clamp-2 text-sm font-bold text-white/95">{ev.title}</span>
                </div>
              )}
              <div className="absolute left-2 top-2">
                {live ? (
                  <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[9px] font-bold text-white shadow">
                    EN VIVO
                  </span>
                ) : variant === "past" ? (
                  <span className="rounded-full bg-zinc-900/80 px-2 py-0.5 text-[9px] font-semibold text-zinc-200">
                    FINALIZADO
                  </span>
                ) : (
                  <span className="rounded-full border border-purple-400/40 bg-purple-500/30 px-2 py-0.5 text-[9px] font-semibold text-purple-100">
                    PRÓXIMO
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2 p-3">
              <h3 className="font-display line-clamp-2 text-base font-bold leading-snug text-white">{ev.title}</h3>
              <p className="text-xs text-zinc-400">{formatEventWhen(ev.startAt)}</p>
              <div className="flex flex-wrap gap-3 text-[11px] text-zinc-300">
                <span>
                  Entradas: <strong className="text-white">{sold}</strong>
                </span>
                <span>
                  Recaudado:{" "}
                  <strong className="text-white">{formatMoney(ev.metricas?.ingresosEstimadosRD ?? 0)}</strong>
                </span>
              </div>
              <p className="text-[10px] font-medium text-purple-300/90">Clic para gestionar →</p>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
