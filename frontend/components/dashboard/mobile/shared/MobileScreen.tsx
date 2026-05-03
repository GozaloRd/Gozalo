"use client";

import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import type { QuickAreaId } from "@/components/dashboard/quickActions.config";
import { MOBILE_AREA_BORDER_L } from "@/components/dashboard/mobile/shared/mobileAreaTokens";

type Props = {
  title: string;
  /** Icono opcional a la izquierda del título (p. ej. emoji o Lucide). */
  titleIcon?: ReactNode;
  children: ReactNode;
  area?: QuickAreaId;
  /** Cerrar (✕). */
  onClose?: () => void;
  /** Volver (←); si no hay `onClose`, puede usarse solo back. */
  onBack?: () => void;
  className?: string;
  /** Contenido scrollable bajo cabecera sticky. */
  footer?: ReactNode;
};

export function MobileScreen({
  title,
  titleIcon,
  children,
  area = "eventos",
  onClose,
  onBack,
  className = "",
  footer,
}: Props) {
  const accent = MOBILE_AREA_BORDER_L[area];

  return (
    <div
      className={`flex h-full min-h-0 flex-col bg-[#0A0A0F] ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header
        className={`sticky top-0 z-10 flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800 bg-[#0A0A0F]/95 px-4 py-3 backdrop-blur-md ${accent}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : null}
          <h1 className="font-display min-w-0 truncate text-lg font-bold tracking-tight text-white">
            {titleIcon ? (
              <span className="mr-1.5 inline-flex items-center gap-1.5 align-middle" aria-hidden>
                {titleIcon}
              </span>
            ) : null}
            {title}
          </h1>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">{children}</div>

      {footer ? (
        <div className="shrink-0 border-t border-zinc-800 bg-[#0A0A0F]/95 p-4 backdrop-blur-md">{footer}</div>
      ) : null}
    </div>
  );
}
