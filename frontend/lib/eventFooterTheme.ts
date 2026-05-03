/**
 * Tema del pie de cards: colores sólidos + texto legible. Compartido por hook (cliente) y servidor.
 */

const DEFAULT_FOOTER = "#2a2a32";
const DEFAULT_BADGE = "#1a1a22";
const DEFAULT_BORDER = "#ffffff";

const DEFAULT_FOOTER_RGB = { r: 42, g: 42, b: 50 };
const DEFAULT_BADGE_RGB = { r: 26, g: 26, b: 34 };

const PUNCHY_TEXT_PRIMARY = "rgb(255, 255, 255)";
const PUNCHY_TEXT_SECONDARY = "rgba(255, 252, 255, 0.9)";

export const FOOTER_TEXT_SHADOW =
  "0 1px 2px rgba(0,0,0,0.75), 0 0 18px rgba(255, 255, 255, 0.18), 0 2px 12px rgba(0,0,0,0.4)";
export const FOOTER_TEXT_SHADOW_SOFT =
  "0 1px 2px rgba(0,0,0,0.6), 0 0 10px rgba(255, 255, 255, 0.1)";

export type EventImageFooterTheme = {
  footerBg: string;
  badgeBg: string;
  borderColor: string;
  footerOnLight: boolean;
  footerTextPrimary: string;
  footerTextSecondary: string;
  footerTextShadow: string;
  footerTextShadowSoft: string;
  badgeTextPrimary: string;
  badgeTextSecondary: string;
  badgeTextShadow: string;
  badgeTextShadowSoft: string;
};

function relativeLuminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastWithBg(Lbg: number, Lfg: number): number {
  const a = Math.max(Lbg, Lfg);
  const b = Math.min(Lbg, Lfg);
  return (a + 0.05) / (b + 0.05);
}

function rgbString(rgb: { r: number; g: number; b: number }): string {
  return `rgb(${Math.min(255, Math.round(rgb.r))}, ${Math.min(255, Math.round(rgb.g))}, ${Math.min(255, Math.round(rgb.b))})`;
}

function footerShade(s: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  const k = 0.48;
  const o = 16;
  return {
    r: Math.min(255, Math.round(s.r * k + o * 0.35)),
    g: Math.min(255, Math.round(s.g * k + o * 0.3)),
    b: Math.min(255, Math.round(s.b * k + o * 0.28)),
  };
}

function badgeShade(s: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
  const k = 0.24;
  const o = 8;
  return {
    r: Math.min(255, Math.round(s.r * k + o)),
    g: Math.min(255, Math.round(s.g * k + o * 0.9)),
    b: Math.min(255, Math.round(s.b * k + o * 0.85)),
  };
}

function textPairForPunchyFooter(
  r: number,
  g: number,
  b: number
): {
  primary: string;
  secondary: string;
  textShadow: string;
  textShadowSoft: string;
} {
  const L = relativeLuminance(r, g, b);
  const Lw = relativeLuminance(255, 255, 255);
  const Lk = relativeLuminance(12, 12, 15);
  if (contrastWithBg(L, Lw) >= contrastWithBg(L, Lk)) {
    return {
      primary: PUNCHY_TEXT_PRIMARY,
      secondary: PUNCHY_TEXT_SECONDARY,
      textShadow: FOOTER_TEXT_SHADOW,
      textShadowSoft: FOOTER_TEXT_SHADOW_SOFT,
    };
  }
  return {
    primary: "rgb(10, 10, 12)",
    secondary: "rgba(15, 23, 42, 0.88)",
    textShadow: "0 1px 2px rgba(255,255,255,0.35)",
    textShadowSoft: "0 1px 1px rgba(255,255,255,0.2)",
  };
}

/** Construye el tema del pie a partir de RGB dominante (mismo criterio que en el cliente). */
export function buildFooterThemeFromDominantRgb(s: { r: number; g: number; b: number }): EventImageFooterTheme {
  const fr = footerShade(s);
  const br = badgeShade(s);
  const t = textPairForPunchyFooter(fr.r, fr.g, fr.b);
  const tBadge = textPairForPunchyFooter(br.r, br.g, br.b);
  const Lbg = relativeLuminance(fr.r, fr.g, fr.b);
  const footerOnLight = Lbg > 0.45;
  const borderColor = footerOnLight
    ? "rgba(15, 23, 42, 0.14)"
    : "rgba(255, 255, 255, 0.1)";

  return {
    footerBg: rgbString(fr),
    badgeBg: rgbString(br),
    borderColor,
    footerOnLight,
    footerTextPrimary: t.primary,
    footerTextSecondary: t.secondary,
    footerTextShadow: t.textShadow,
    footerTextShadowSoft: t.textShadowSoft,
    badgeTextPrimary: tBadge.primary,
    badgeTextSecondary: tBadge.secondary,
    badgeTextShadow: tBadge.textShadow,
    badgeTextShadowSoft: tBadge.textShadowSoft,
  };
}

export function buildNoImageFooterTheme(): EventImageFooterTheme {
  const tFooter = textPairForPunchyFooter(
    DEFAULT_FOOTER_RGB.r,
    DEFAULT_FOOTER_RGB.g,
    DEFAULT_FOOTER_RGB.b
  );
  const tBadge = textPairForPunchyFooter(
    DEFAULT_BADGE_RGB.r,
    DEFAULT_BADGE_RGB.g,
    DEFAULT_BADGE_RGB.b
  );
  return {
    footerBg: DEFAULT_FOOTER,
    badgeBg: DEFAULT_BADGE,
    borderColor: DEFAULT_BORDER,
    footerOnLight: false,
    footerTextPrimary: tFooter.primary,
    footerTextSecondary: tFooter.secondary,
    footerTextShadow: tFooter.textShadow,
    footerTextShadowSoft: tFooter.textShadowSoft,
    badgeTextPrimary: tBadge.primary,
    badgeTextSecondary: tBadge.secondary,
    badgeTextShadow: tBadge.textShadow,
    badgeTextShadowSoft: tBadge.textShadowSoft,
  };
}

export function normalizeCachedFooterTheme(
  parsed: Partial<EventImageFooterTheme>
): EventImageFooterTheme {
  const base = buildNoImageFooterTheme();
  if (!parsed.footerBg || !parsed.badgeBg) return base;
  return {
    ...base,
    ...parsed,
    footerTextPrimary: parsed.footerTextPrimary ?? base.footerTextPrimary,
    footerTextSecondary: parsed.footerTextSecondary ?? base.footerTextSecondary,
    footerTextShadow: parsed.footerTextShadow ?? base.footerTextShadow,
    footerTextShadowSoft: parsed.footerTextShadowSoft ?? base.footerTextShadowSoft,
    badgeTextPrimary: parsed.badgeTextPrimary ?? base.badgeTextPrimary,
    badgeTextSecondary: parsed.badgeTextSecondary ?? base.badgeTextSecondary,
    badgeTextShadow: parsed.badgeTextShadow ?? base.badgeTextShadow,
    badgeTextShadowSoft: parsed.badgeTextShadowSoft ?? base.badgeTextShadowSoft,
    footerOnLight: typeof parsed.footerOnLight === "boolean" ? parsed.footerOnLight : base.footerOnLight,
  };
}
