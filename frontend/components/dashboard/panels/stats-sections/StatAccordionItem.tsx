"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  Icon?: LucideIcon;
  openId: string | null;
  onToggle: (id: string) => void;
  children: ReactNode;
};

/**
 * Acordeón exclusivo (el padre pasa openId). Animación slide + fade ~300ms ease-out.
 */
export function StatAccordionItem({ id, title, Icon, openId, onToggle, children }: Props) {
  const open = openId === id;

  return (
    <div
      className={`rounded-xl border border-white/[0.08] border-l-2 bg-black/20 transition-colors duration-300 ${
        open ? "border-l-pink-500" : "border-l-transparent"
      }`}
    >
      <button
        type="button"
        id={`${id}-header`}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => onToggle(id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle(id);
          }
        }}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-3 text-left outline-none ring-pink-500/40 focus-visible:ring-2"
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 shrink-0 text-pink-400" aria-hidden /> : null}
          <span className="truncate text-sm font-semibold text-white">{title}</span>
        </span>
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-pink-500 transition-transform duration-300 ease-out ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`border-t border-white/[0.06] transition-opacity duration-300 ease-out ${
              open ? "opacity-100" : "opacity-0"
            }`}
          >
            <div
              id={`${id}-panel`}
              role="region"
              aria-labelledby={`${id}-header`}
              className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain bg-zinc-900/60 p-4"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
