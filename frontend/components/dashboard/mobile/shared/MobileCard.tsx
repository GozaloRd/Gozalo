"use client";

import type { ReactNode } from "react";
import type { QuickAreaId } from "@/components/dashboard/quickActions.config";
import { MOBILE_AREA_BORDER_L } from "@/components/dashboard/mobile/shared/mobileAreaTokens";

type Props = {
  children: ReactNode;
  className?: string;
  /** Card principal del panel (fondo + blur). */
  variant?: "surface" | "inner";
  /** Acento lateral; solo en `surface` por defecto. */
  area?: QuickAreaId;
  /** Forzar acento aunque sea inner. */
  accent?: boolean;
};

export function MobileCard({
  children,
  className = "",
  variant = "surface",
  area,
  accent,
}: Props) {
  const borderAccent =
    area && (variant === "surface" || accent) ? MOBILE_AREA_BORDER_L[area] : "border-l-2 border-transparent";

  if (variant === "inner") {
    const bl = area ? MOBILE_AREA_BORDER_L[area] : "border-l-2 border-transparent";
    return (
      <div
        className={`rounded-xl border border-zinc-800 bg-zinc-800/50 p-3 transition-colors ${bl} ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg backdrop-blur-sm ${borderAccent} ${className}`}
    >
      {children}
    </div>
  );
}
