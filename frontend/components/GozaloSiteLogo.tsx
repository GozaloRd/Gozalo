"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function isWithinSection(pathname: string | null, sectionHref: string) {
  if (!pathname) return false;
  const root = (sectionHref.replace(/\/$/, "") || "/") as string;
  if (root === "/") return pathname === "/";
  return pathname === root || pathname.startsWith(`${root}/`);
}

export type GozaloSiteLogoProps = {
  /** Destino del logo (sitio público `/`, panel `/dashboard`, admin `/admin`, …). */
  href?: string;
  /** Ej. cerrar drawer móvil al ir al inicio */
  onNavigate?: () => void;
  className?: string;
  /** `sm`: compacto (pie); `md`: login/registro; `lg`: barra principal; `xl`: hero login (más grande + punto neón fucsia) */
  size?: "sm" | "md" | "lg" | "xl";
  /** `dark`: sobre fondos oscuros; `light`: texto oscuro sobre claros */
  variant?: "dark" | "light";
  /**
   * `brand`: G y punto en morado marca (por defecto).
   * `minimal`: blanco / neutro, sin morado (páginas evento / checkout sobre imagen).
   */
  mark?: "brand" | "minimal";
};

/**
 * Wordmark oficial G + OZALO + punto (misma marca que la barra principal).
 * Por defecto enlaza a `/`. Si la ruta actual ya está bajo ese `href`, hace scroll al inicio de la página.
 */
export default function GozaloSiteLogo({
  href = "/",
  onNavigate,
  className,
  size = "md",
  variant = "dark",
  mark = "brand",
}: GozaloSiteLogoProps) {
  const pathname = usePathname();
  const light = variant === "light";
  const minimal = mark === "minimal" && !light;

  const isHero = size === "xl";

  const textSize = isHero
    ? "text-[1.85rem] font-black leading-none tracking-tight sm:text-[2.35rem] md:text-[2.85rem]"
    : size === "sm"
      ? "text-[15px] font-black leading-none tracking-tight md:text-base"
      : "text-xl font-black tracking-tight md:text-2xl";

  const dotSize = isHero ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  const gClass = minimal
    ? "text-white transition-opacity duration-300 group-hover:opacity-90"
    : light
      ? "text-[#7B5EA7] transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_14px_rgba(123,94,167,0.45)]"
      : "text-[#9B7FCA] transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_18px_rgba(155,127,202,0.65)]";
  const ozaloClass = minimal
    ? "text-white transition-opacity duration-300 group-hover:opacity-90"
    : light
      ? "text-neutral-900 transition-colors duration-300 group-hover:text-neutral-950"
      : "text-white transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_14px_rgba(155,127,202,0.35)]";

  const dotNeonFuchsia = isHero && !minimal && !light && mark === "brand";

  const dotRing = dotNeonFuchsia
    ? "shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_20px_8px_rgba(244,114,182,0.7),0_0_52px_18px_rgba(167,139,250,0.28)]"
    : minimal
      ? "shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
      : light
        ? "shadow-[0_0_8px_rgba(123,94,167,0.55)]"
        : "shadow-[0_0_10px_rgba(155,127,202,0.7)]";

  const dotBg = dotNeonFuchsia ? "bg-[#f472b6]" : minimal ? "bg-white/90" : "bg-[#9B7FCA]";
  const dotPulseBg = dotNeonFuchsia ? "bg-fuchsia-300/90" : minimal ? "bg-white/60" : "bg-[#9B7FCA]";

  return (
    <Link
      href={href}
      aria-label="Gózalo — inicio"
      className={`group inline-flex shrink-0 items-center gap-2.5 outline-none ${className ?? ""}`}
      onClick={(e) => {
        if (isWithinSection(pathname, href)) {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        onNavigate?.();
      }}
    >
      <span className={`relative ${textSize}`}>
        <span className={gClass}>G</span>
        <span className={ozaloClass}>OZALO</span>
      </span>
      <span className={`relative inline-block ${dotSize} rounded-full ${dotBg} ${dotRing}`}>
        {!minimal ? (
          <span
            className={`absolute inset-0 rounded-full ${dotPulseBg} opacity-70 animate-[gozaloLogoDotPulse_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite`}
          />
        ) : null}
      </span>
      {!minimal ? (
        <style jsx>{`
          @keyframes gozaloLogoDotPulse {
            0% {
              transform: scale(1);
              opacity: 0.7;
            }
            100% {
              transform: scale(2.6);
              opacity: 0;
            }
          }
        `}</style>
      ) : null}
    </Link>
  );
}
