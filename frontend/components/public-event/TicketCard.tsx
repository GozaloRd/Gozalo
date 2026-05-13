"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PublicTicket } from "./types";
import { formatRD } from "./utils";

/** Referencia Ticket Fairy: texto #333, muted #757575, filas #F2F2F2 / #FFF */
const REF = {
  text: "#333333",
  muted: "#757575",
  rowA: "#F2F2F2",
  rowB: "#FFFFFF",
  btn: "#333333",
} as const;

/** Lista sobre fondo blur / vitrina oscura */
const GLASS = {
  text: "rgba(255,255,255,0.92)",
  muted: "rgba(255,255,255,0.48)",
  rowA: "rgba(255,255,255,0.07)",
  rowB: "rgba(255,255,255,0.035)",
  btnBg: "#fafafa",
  btnText: "#141414",
} as const;

type Props = {
  ticket: PublicTicket;
  bgColor: string;
  index: number;
  onClick: () => void;
  variant?: "dark" | "light";
  /** Solo variant light: fila en lista con fondo alternado y división */
  lightRow?: {
    isLast: boolean;
    /** `glass`: filas sobre panel translúcido (página pública /e) */
    tone?: "paper" | "glass";
  };
};

export function TicketCard({ ticket, bgColor, index, onClick, variant = "dark", lightRow }: Props) {
  const soldOut = ticket.available === 0;
  const light = variant === "light";
  const glassTone = lightRow?.tone === "glass";

  if (light && lightRow) {
    const stripe = glassTone
      ? index % 2 === 0
        ? GLASS.rowA
        : GLASS.rowB
      : index % 2 === 0
        ? REF.rowA
        : REF.rowB;
    const borderBetween = glassTone ? "border-b border-white/[0.08]" : "border-b border-neutral-200/60";
    const hoverClass = glassTone
      ? soldOut
        ? ""
        : "hover:bg-white/[0.04]"
      : soldOut
        ? ""
        : "hover:bg-black/[0.02]";
    const textMain = glassTone ? GLASS.text : REF.text;
    const textMuted = glassTone ? GLASS.muted : REF.muted;

    return (
      <motion.button
        type="button"
        onClick={onClick}
        disabled={soldOut}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-20px" }}
        transition={{ delay: index * 0.04, duration: 0.25 }}
        className={`flex w-full items-center gap-3 px-5 py-3.5 text-left ${soldOut ? "cursor-not-allowed opacity-55" : `cursor-pointer ${hoverClass}`} ${
          !lightRow.isLast ? borderBetween : ""
        }`}
        style={{ backgroundColor: stripe }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em]" style={{ color: textMain }}>
            {ticket.name}
          </p>
          <p className="mt-1 text-[13px] font-medium leading-snug" style={{ color: textMain }}>
            {formatRD(ticket.price)}
            {ticket.includesFees ? (
              <span className="text-[11px] font-normal" style={{ color: textMuted }}>
                {" "}
                (incl. cargos)
              </span>
            ) : null}
          </p>
          {soldOut ? (
            <span
              className={`mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide ${glassTone ? "text-red-400" : "text-red-600"}`}
            >
              Agotado
            </span>
          ) : null}
          {ticket.highDemand && !soldOut ? (
            <span
              className={`mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide ${glassTone ? "text-amber-300/95" : "text-amber-600"}`}
            >
              Alta demanda
            </span>
          ) : null}
        </div>
        <motion.span
          className={`inline-flex h-9 w-[104px] shrink-0 origin-center items-center justify-center text-[12px] font-semibold transition-colors ${glassTone ? "rounded-full" : "rounded-md"}`}
          style={{
            backgroundColor: soldOut
              ? glassTone
                ? "rgba(255,255,255,0.12)"
                : "#BDBDBD"
              : glassTone
                ? GLASS.btnBg
                : REF.btn,
            color: soldOut
              ? glassTone
                ? "rgba(255,255,255,0.4)"
                : "#ffffff"
              : glassTone
                ? GLASS.btnText
                : "#ffffff",
          }}
          whileTap={
            soldOut
              ? undefined
              : glassTone
                ? { scale: 0.93 }
                : { scale: 0.96 }
          }
          transition={{ type: "spring", stiffness: 480, damping: 32 }}
        >
          Seleccionar
        </motion.span>
      </motion.button>
    );
  }

  if (light) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        disabled={soldOut}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ delay: index * 0.06, duration: 0.35, ease: "easeOut" }}
        whileHover={soldOut ? undefined : { scale: 1.005 }}
        whileTap={soldOut ? undefined : { scale: 0.995 }}
        className={`flex w-full items-stretch gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors ${
          soldOut
            ? "cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-70"
            : "cursor-pointer border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold uppercase tracking-wide text-neutral-900">{ticket.name}</p>
          {ticket.description ? (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-neutral-500">{ticket.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {soldOut ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-bold uppercase text-red-700">
                Agotado
              </span>
            ) : null}
            {ticket.highDemand && !soldOut ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase text-amber-800">
                Alta demanda
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm font-semibold text-neutral-700">
            {formatRD(ticket.price)}
            {ticket.includesFees ? <span className="ml-1 text-xs font-normal text-neutral-500">(incl. cargos)</span> : null}
          </p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-stretch justify-center">
          <span
            className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 text-sm font-bold ${
              soldOut ? "bg-neutral-200 text-neutral-500" : "bg-neutral-900 text-white shadow-sm"
            }`}
          >
            Seleccionar
          </span>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={soldOut}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      className="w-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#111111] text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-bold uppercase tracking-[0.02em] text-white">{ticket.name}</p>
            {ticket.description ? (
              <p className="mt-1 text-sm font-medium uppercase tracking-[0.03em] text-white/45">{ticket.description}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {soldOut ? (
                <span className="rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400">AGOTADO</span>
              ) : null}
              {ticket.highDemand && !soldOut ? (
                <span className="rounded-full border border-orange-500/20 bg-orange-500/15 px-2.5 py-1 text-xs font-bold text-orange-400">
                  ALTA DEMANDA
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="mx-5 border-t border-white/10" />
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <span className="text-2xl font-extrabold tracking-[-0.02em] text-white">{formatRD(ticket.price)}</span>
          {ticket.includesFees ? <span className="ml-1 text-xs text-white/30">(incl. cargos)</span> : null}
        </div>
        <motion.span
          whileHover={!soldOut ? { x: 3 } : undefined}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-[0_4px_12px_rgba(255,255,255,0.15)] ${soldOut ? "pointer-events-none opacity-35" : ""}`}
        >
          <ArrowRight className="h-5 w-5" style={{ color: bgColor }} />
        </motion.span>
      </div>
    </motion.button>
  );
}
