"use client";

import { motion } from "framer-motion";
import { CalendarDays, ImageOff, MapPin, Share2, Users } from "lucide-react";
import type { PublicEvent } from "./types";
import { formatEventDate } from "./utils";

type Props = {
  event: PublicEvent;
};

export function EventHero({ event }: Props) {
  function shareEvent() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = event.name;
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
      return;
    }
    void navigator.clipboard?.writeText(url);
  }

  return (
    <>
      {/* Hero: categoría, título, compartir y metadatos — la dirección va solo en el bloque Ubicación */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative px-5 pb-6 pt-20 text-center"
      >

        {false && event.tags?.length ? (
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            {(event.tags ?? []).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white/85"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <h1 className="font-serif text-[2rem] font-black leading-[1.1] tracking-[-0.02em] text-white">{event.name}</h1>

        <div className="mt-4 flex flex-row flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <div className="flex items-center gap-1.5 text-white/70">
            <CalendarDays className="h-4 w-4 text-white/45" />
            <span className="text-sm font-medium">{formatEventDate(event.date)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <Users className="h-4 w-4 text-white/45" />
            <span className="text-sm font-medium">{event.ageRestriction ?? "Todas las edades"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/70">
            <MapPin className="h-4 w-4 text-white/45" />
            <span className="text-sm font-medium">{`${event.city}, ${event.country}`}</span>
          </div>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.06, duration: 0.45, ease: "easeOut" }}
        className="mx-3 mt-6 rounded-2xl"
      >
        <div className="overflow-hidden rounded-2xl border-2 border-white bg-white/[0.02] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          {event.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.imageUrl} alt={event.name} className="block h-auto w-full object-contain" />
          ) : (
            <div className="flex min-h-[300px] items-center justify-center bg-white/5">
              <ImageOff className="h-10 w-10 text-white/20" />
            </div>
          )}
        </div>
      </motion.div>

    </>
  );
}
