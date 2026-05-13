"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  /** Título accesible del diálogo */
  title?: string;
};

export function TableLayoutLightbox({ open, onClose, imageUrl, title = "Plano del salón" }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="table-layout-lightbox"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            aria-label="Cerrar"
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] border border-white/[0.14] bg-gradient-to-b from-white/[0.12] to-white/[0.05] shadow-[0_40px_100px_-24px_rgba(0,0,0,0.85)] backdrop-blur-[28px]"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">{title}</p>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-white/[0.11]"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-black/20 px-3 py-4 sm:px-5 sm:py-5">
              {/* Plano desde API (hosts variables); evita optimización remota */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={title}
                className="mx-auto max-h-[min(78vh,820px)] w-full max-w-full rounded-xl object-contain shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]"
                draggable={false}
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
