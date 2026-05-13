"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { ShootingStarsLayer } from "@/components/dashboard/desktop/ShootingStarsLayer";

const STAR_COUNT = 100;

/** Determinista SSR/cliente (sin hydration mismatch). */
function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

export type StarSpec = {
  left: number;
  top: number;
  sizePx: 1 | 2 | 3;
  twinkle: boolean;
  durationS: number;
  delayS: number;
};

function buildStars(): StarSpec[] {
  const out: StarSpec[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    const rSize = rnd(i, 1);
    let sizePx: 1 | 2 | 3;
    if (rSize < 0.6) sizePx = 1;
    else if (rSize < 0.9) sizePx = 2;
    else sizePx = 3;

    out.push({
      left: rnd(i, 2) * 100,
      top: rnd(i, 3) * 100,
      sizePx,
      twinkle: rnd(i, 4) < 0.3,
      durationS: 2 + rnd(i, 6) * 3,
      delayS: rnd(i, 7) * 3,
    });
  }
  return out;
}

/**
 * Cielo estrellado sobre negro puro.
 * - `mobile`: solo &lt;768px (dashboard móvil).
 * - `desktop`: solo ≥768px (panel dueño desktop), con estrellas fugaces.
 * `prefers-reduced-motion`: `.starry-twinkle` y `.shooting-star-anim` en globals.css.
 *
 * Nota: `z-0` (no negativo) para que las estrellas no queden detrás del fondo de `body`.
 */
export function StarryBackground({ variant = "mobile" }: { variant?: "mobile" | "desktop" }) {
  const stars = useMemo(buildStars, []);
  const visibility = variant === "mobile" ? "md:hidden" : "hidden md:block";

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#000000] ${visibility}`}
    >
      {stars.map((s, i) => {
        const halo =
          s.sizePx === 3
            ? {
                boxShadow:
                  "0 0 4px 1px rgb(255 255 255 / 0.75), 0 0 10px 2px rgb(255 255 255 / 0.25)",
              }
            : undefined;

        const style: CSSProperties = {
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: s.sizePx,
          height: s.sizePx,
          backgroundColor: "#FFFFFF",
          ...halo,
          ...(s.twinkle
            ? {
                animation: `twinkle ${s.durationS}s ease-in-out infinite`,
                animationDelay: `${s.delayS}s`,
              }
            : { opacity: 0.65 + rnd(i, 9) * 0.3 }),
        };

        return (
          <span
            key={i}
            className={`absolute rounded-full ${s.twinkle ? "starry-twinkle" : ""}`}
            style={style}
          />
        );
      })}
      {variant === "desktop" ? <ShootingStarsLayer /> : null}
    </div>
  );
}
