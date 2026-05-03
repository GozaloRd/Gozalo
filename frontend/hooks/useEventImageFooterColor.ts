"use client";

import { getColorSync, getSwatchesSync, type Color } from "colorthief";
import { useEffect, useState } from "react";
import {
  type EventImageFooterTheme,
  buildNoImageFooterTheme,
  buildFooterThemeFromDominantRgb,
  normalizeCachedFooterTheme,
} from "@/lib/eventFooterTheme";
import { getPublicImageAbsoluteUrl } from "@/lib/publicImageUrl";

const STORAGE_KEY = "gozalo:event-image-theme:v5";
const THEME_CACHE = new Map<string, EventImageFooterTheme>();

function cacheKeyForImage(src: string): string {
  return getPublicImageAbsoluteUrl(src);
}

function getCachedTheme(url: string): EventImageFooterTheme | null {
  const mem = THEME_CACHE.get(url);
  if (mem) return mem;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY}:${url}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EventImageFooterTheme>;
    if (!parsed.footerBg || !parsed.badgeBg) return null;
    const theme = normalizeCachedFooterTheme(parsed);
    THEME_CACHE.set(url, theme);
    return theme;
  } catch {
    return null;
  }
}

function setCachedTheme(url: string, theme: EventImageFooterTheme): void {
  THEME_CACHE.set(url, theme);
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY}:${url}`, JSON.stringify(theme));
  } catch {
    // Ignorar quota.
  }
}

export function pickDominantRgb(img: HTMLImageElement): { r: number; g: number; b: number } | null {
  try {
    const c0 = getColorSync(img, { colorCount: 8, quality: 8 });
    if (c0) {
      const [r, g, b] = c0.array();
      return { r, g, b };
    }
    const sw = getSwatchesSync(img, { colorCount: 8, quality: 10 });
    const c: Color | null =
      sw.DarkVibrant?.color ??
      sw.Vibrant?.color ??
      sw.DarkMuted?.color ??
      sw.Muted?.color ??
      getColorSync(img, { quality: 10 });
    if (c) {
      const [r, g, b] = c.array();
      return { r, g, b };
    }
  } catch {
    /* */
  }
  try {
    const c = getColorSync(img, { quality: 10 });
    if (c) {
      const [r, g, b] = c.array();
      return { r, g, b };
    }
  } catch {
    return null;
  }
  return null;
}

export type { EventImageFooterTheme };

export type EventImageFooterResult = EventImageFooterTheme & {
  /** Con tema del servidor o caché, true desde el primer frame. */
  footerColorReady: boolean;
};

/**
 * @param serverFooterTheme Tema precalculado en el servidor (mismo criterio): sin gris al cargar.
 */
export function useEventImageFooterColor(
  imageUrl: string | null | undefined,
  hasImage: boolean,
  serverFooterTheme?: EventImageFooterTheme | null
): EventImageFooterResult {
  const [state, setState] = useState(() => {
    if (!hasImage || !imageUrl) {
      return { theme: buildNoImageFooterTheme(), ready: true as boolean };
    }
    if (serverFooterTheme) {
      return { theme: serverFooterTheme, ready: true };
    }
    const url = cacheKeyForImage(imageUrl);
    const cached = getCachedTheme(url);
    if (cached) {
      return { theme: cached, ready: true };
    }
    return { theme: buildNoImageFooterTheme(), ready: false };
  });

  useEffect(() => {
    if (!hasImage || !imageUrl) {
      setState({ theme: buildNoImageFooterTheme(), ready: true });
      return;
    }
    const url = cacheKeyForImage(imageUrl);
    if (serverFooterTheme) {
      setCachedTheme(url, serverFooterTheme);
      setState({ theme: serverFooterTheme, ready: true });
      return;
    }
    const cached = getCachedTheme(url);
    if (cached) {
      setState({ theme: cached, ready: true });
      return;
    }
    setState({ theme: buildNoImageFooterTheme(), ready: false });
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(url);
        if (cancelled) return;
        const s = pickDominantRgb(img);
        if (cancelled || !s) {
          if (!cancelled) {
            setState({ theme: buildNoImageFooterTheme(), ready: true });
          }
          return;
        }
        const finalTheme = buildFooterThemeFromDominantRgb(s);
        if (cancelled) return;
        setState({ theme: finalTheme, ready: true });
        setCachedTheme(url, finalTheme);
      } catch {
        if (!cancelled) {
          setState({ theme: buildNoImageFooterTheme(), ready: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasImage, imageUrl, serverFooterTheme]);

  return { ...state.theme, footerColorReady: state.ready };
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("load"));
    img.src = url;
  });
}
