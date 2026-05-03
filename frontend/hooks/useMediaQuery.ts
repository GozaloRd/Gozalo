"use client";

import { useEffect, useState } from "react";

/**
 * Suscripción estable a `matchMedia`. SSR: `false` hasta montar.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia(query);
    const onChange = () => setMatches(m.matches);
    onChange();
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Viewport &lt; 768px (alineado con `md:` de Tailwind). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
