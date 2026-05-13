"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { PublicTable } from "./types";
import { formatRD } from "./utils";

type Props = {
  table: PublicTable;
  bgColor: string;
  index: number;
  onClick: () => void;
  variant?: "dark" | "light";
  /** Solo variant light */
  tone?: "paper" | "glass";
};

export function TableCard({ table, bgColor, index, onClick, variant = "dark", tone = "paper" }: Props) {
  const occupied = table.status === "occupied";
  const light = variant === "light";
  const glass = tone === "glass";

  if (light) {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        disabled={occupied}
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
        whileHover={occupied ? undefined : { scale: 1.005 }}
        className={`flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left ${
          glass
            ? occupied
              ? "cursor-not-allowed border-white/15 bg-white/[0.04]"
              : "cursor-pointer border-white/12 bg-white/[0.06] hover:border-white/18 hover:bg-white/[0.09]"
            : occupied
              ? "cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-70 font-sans"
              : "cursor-pointer border-neutral-200 bg-white font-sans hover:border-neutral-300 hover:bg-neutral-50/80"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p
            className={`text-[13px] font-semibold uppercase tracking-[0.06em] ${
              glass ? (occupied ? "text-white/75" : "text-white") : "text-neutral-900"
            }`}
          >
            {table.label ? `Mesa ${table.label}` : table.name}
          </p>
          {table.description ? (
            <p
              className={`mt-0.5 text-[11px] ${
                glass ? (occupied ? "text-white/65" : "text-white/90") : "text-neutral-500"
              }`}
            >
              {table.description}
            </p>
          ) : null}
          {occupied ? (
            <span
              className={`mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                glass ? "border border-red-500/30 bg-red-600/35 text-white" : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              Sin disponibilidad
            </span>
          ) : null}
          <p
            className={`mt-1 text-[13px] font-medium ${
              glass ? (occupied ? "text-white/70" : "text-white") : "text-neutral-800"
            }`}
          >
            Desde <span className="font-semibold">{formatRD(table.minPrice)}</span>
          </p>
        </div>
        <motion.span
          className={`inline-flex h-9 w-[104px] shrink-0 origin-center items-center justify-center text-[12px] font-semibold ${
            glass ? "rounded-full" : "rounded-md font-normal text-[13px]"
          } ${
            occupied
              ? glass
                ? "bg-neutral-600/80 text-white/75"
                : "bg-neutral-300 text-neutral-600"
              : glass
                ? "bg-white text-neutral-950"
                : "bg-[#333333] text-white"
          }`}
          whileTap={
            occupied ? undefined : glass ? { scale: 0.93 } : { scale: 0.96 }
          }
          transition={{ type: "spring", stiffness: 480, damping: 32 }}
        >
          Reservar
        </motion.span>
      </motion.button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={occupied}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
      className="w-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#111111] text-left shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
    >
      <div className="px-5 pb-4 pt-5">
        <p className="text-base font-bold uppercase tracking-[0.02em] text-white">{table.name}</p>
        {table.description ? (
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.03em] text-white/45">{table.description}</p>
        ) : null}
        {table.colorDots?.length ? (
          <div className="mt-3 flex gap-1.5">
            {table.colorDots.map((dot) => (
              <span key={dot} className="h-4 w-4 rounded-sm" style={{ backgroundColor: dot }} />
            ))}
          </div>
        ) : null}
        {occupied ? (
          <span className="mt-3 inline-flex rounded-full border border-red-500/20 bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-400">SIN DISPONIBILIDAD</span>
        ) : null}
      </div>
      <div className="mx-5 border-t border-white/10" />
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-white">
          <span className="text-xs text-white/40">Desde </span>
          <span className="text-2xl font-extrabold tracking-[-0.02em]">{formatRD(table.minPrice)}</span>
        </p>
        <motion.span
          whileHover={!occupied ? { x: 3 } : undefined}
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white ${occupied ? "pointer-events-none opacity-35" : ""}`}
        >
          <ArrowRight className="h-5 w-5" style={{ color: bgColor }} />
        </motion.span>
      </div>
    </motion.button>
  );
}
