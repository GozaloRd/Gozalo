/**
 * Degradado detrás del plano (letterboxing con object-contain) a partir del color dominante de la imagen.
 */
export const TABLE_LAYOUT_BACKDROP_FALLBACK =
  "linear-gradient(to bottom, #f5efe6, #ebe3d6, #dfd4c6)";

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
) {
  return {
    r: clampByte(a.r * (1 - t) + b.r * t),
    g: clampByte(a.g * (1 - t) + b.g * t),
    b: clampByte(a.b * (1 - t) + b.b * t),
  };
}

export function buildTableLayoutBackdropGradient(s: { r: number; g: number; b: number }): string {
  const base = mixRgb(s, { r: 255, g: 255, b: 255 }, 0.12);
  const top = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.06);
  const bottom = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.09);
  return `linear-gradient(to bottom, rgb(${top.r},${top.g},${top.b}), rgb(${base.r},${base.g},${base.b}), rgb(${bottom.r},${bottom.g},${bottom.b}))`;
}
