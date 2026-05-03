"use client";

import { useEffect, useState } from "react";
import {
  buildTableLayoutBackdropGradient,
  TABLE_LAYOUT_BACKDROP_FALLBACK,
} from "@/lib/tableLayoutBackdrop";
import { getPublicImageAbsoluteUrl } from "@/lib/publicImageUrl";
import { loadImage, pickDominantRgb } from "@/hooks/useEventImageFooterColor";

/**
 * Degradado de fondo para el marco del plano según el color dominante de la foto (misma muestra que el pie de cards).
 */
export function useTableLayoutBackdrop(imageUrl: string | null | undefined): string {
  const [bg, setBg] = useState<string>(TABLE_LAYOUT_BACKDROP_FALLBACK);

  useEffect(() => {
    if (!imageUrl?.trim()) {
      setBg(TABLE_LAYOUT_BACKDROP_FALLBACK);
      return;
    }
    const url = getPublicImageAbsoluteUrl(imageUrl.trim());
    let cancelled = false;
    void (async () => {
      try {
        const img = await loadImage(url);
        if (cancelled) return;
        const rgb = pickDominantRgb(img);
        if (cancelled) return;
        if (!rgb) {
          setBg(TABLE_LAYOUT_BACKDROP_FALLBACK);
          return;
        }
        setBg(buildTableLayoutBackdropGradient(rgb));
      } catch {
        if (!cancelled) setBg(TABLE_LAYOUT_BACKDROP_FALLBACK);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return bg;
}
