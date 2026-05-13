"use client";

import { Playfair_Display } from "next/font/google";
import { useState } from "react";
import { motion } from "framer-motion";

const playfairTitle = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

type Props = {
  description: string;
  /** Solo contenido (título + texto), sin tarjeta exterior — para ir dentro de un cuadro padre */
  embedded?: boolean;
  /** Con `embedded`: tema del texto y título */
  embeddedTone?: "light" | "glass";
  /** Clases extra para el título (ej. next/font) cuando está embebido */
  sectionTitleClassName?: string;
};

export function PublicEventDescriptionBox({
  description,
  embedded,
  embeddedTone = "light",
  sectionTitleClassName,
}: Props) {
  const long = description.length > 320;
  const [expanded, setExpanded] = useState(false);
  const visible = long && !expanded ? `${description.slice(0, 320).trim()}…` : description;

  const glass = embedded && embeddedTone === "glass";

  const titleClassName = glass
    ? `${sectionTitleClassName ?? playfairTitle.className} text-[12px] font-semibold uppercase tracking-[0.22em] text-white/95 leading-none`
    : `${playfairTitle.className} text-[15px] font-semibold uppercase tracking-[0.18em] text-neutral-900 leading-none`;

  const inner = (
    <>
      {glass ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="h-px w-8 shrink-0 bg-gradient-to-r from-amber-300/90 to-transparent" aria-hidden />
          <h2 className={titleClassName}>Acerca del evento</h2>
        </div>
      ) : (
        <h2 className={titleClassName}>Acerca del evento</h2>
      )}
      <p
        className={`mt-3 whitespace-pre-wrap text-[14px] leading-relaxed ${
          glass ? "text-white/72" : "font-sans text-neutral-800"
        }`}
      >
        {visible}
      </p>
      {long ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`mt-3 text-sm font-semibold underline underline-offset-2 ${
            glass ? "text-white/88 hover:text-white" : "font-sans text-neutral-900 hover:text-neutral-700"
          }`}
        >
          {expanded ? "Leer menos" : "Leer más"}
        </button>
      ) : null}
    </>
  );

  if (embedded) {
    return inner;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-8 px-5 font-sans"
    >
      <div className="rounded-[28px] border border-neutral-200/90 bg-white p-5 shadow-[0_16px_40px_-8px_rgba(0,0,0,0.32)]">{inner}</div>
    </motion.section>
  );
}
