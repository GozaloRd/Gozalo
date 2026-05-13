"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useEventImageFooterColor } from "@/hooks/useEventImageFooterColor";
import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";

export type EventPosterCardData = {
  id: string;
  slug: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  city?: string | null;
  venueName?: string | null;
  image?: string | null;
  /** Ruta de destino al hacer click. Por defecto /e/[slug] */
  href?: string;
  /** Tema del pie precalculado en el servidor (primer paint sin gris). */
  serverFooterTheme?: EventImageFooterTheme | null;
};

type Props = {
  event: EventPosterCardData;
  /** Tamaño del card (ancho máx.) */
  size?: "sm" | "md" | "lg";
  /** Indice del card para diversificar tonalidades de placeholder */
  index?: number;
  className?: string;
  /** Inicio: borde solo en el card; foto a sangría arriba (sin padding), esquinas curvas del card. */
  variant?: "default" | "flush";
};

const PLACEHOLDER_GRADIENTS = [
  "from-[#9B7FCA] via-[#4A3970] to-[#111118]",
  "from-[#B39CD8] via-[#5F4688] to-[#111118]",
  "from-violet-600 via-purple-900 to-[#111118]",
  "from-fuchsia-600 via-purple-800 to-[#111118]",
  "from-purple-600 via-indigo-900 to-[#111118]",
  "from-[#C6B3E4] via-[#7B5EA7] to-[#111118]",
  "from-indigo-600 via-violet-900 to-[#111118]",
  "from-[#7B5EA7] via-[#3A2D58] to-[#111118]",
];

const MONTHS_SHORT = [
  "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
  "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
];

function formatLongDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "";
  }
}

function dateParts(iso: string): { day: string; month: string } {
  try {
    const d = new Date(iso);
    return {
      day: String(d.getDate()).padStart(2, "0"),
      month: MONTHS_SHORT[d.getMonth()] ?? "",
    };
  } catch {
    return { day: "--", month: "---" };
  }
}

export function EventPosterCard({
  event,
  size = "md",
  index = 0,
  className,
  variant = "default",
}: Props) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !!event.image && !imgError;
  const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];
  const href = event.href ?? `/e/${event.slug}`;
  const { day, month } = dateParts(event.startAt);
  const footerTheme = useEventImageFooterColor(
    event.image,
    hasImage,
    event.serverFooterTheme ?? undefined
  );

  const sizeClasses =
    size === "sm"
      ? "max-w-[220px]"
      : size === "lg"
        ? "max-w-[320px]"
        : "max-w-[270px]";

  const flush = variant === "flush";
  const posterFrame = flush ? "" : "border-2 border-white";
  const posterRound = flush ? "rounded-none" : "rounded-2xl";
  const imgFitClass = flush
    ? "object-cover object-top"
    : "object-cover object-center";

  const posterContent = (
    <>
      {hasImage ? (
        <Image
          src={event.image as string}
          alt={event.title}
          fill
          sizes="(max-width: 768px) 48vw, 320px"
          className={`${imgFitClass} transition-transform duration-700 ease-out group-hover:scale-[1.03]`}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}>
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
            <span className="line-clamp-4 text-2xl font-bold uppercase leading-tight tracking-tight text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
              {event.title}
            </span>
          </div>
        </div>
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-black/30 via-black/5 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(125deg, transparent 45%, rgba(255,255,255,0.1) 50%, transparent 55%)",
        }}
      />
    </>
  );

  return (
    <Link
      href={href}
      className={`group relative block w-full ${sizeClasses} ${className ?? ""}`}
    >
      {/* Glow amplio derivado del color de la imagen (halo) */}
      {hasImage && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-5 -z-10 opacity-55 blur-3xl transition-opacity duration-500 group-hover:opacity-90"
        >
          <Image
            src={event.image as string}
            alt=""
            fill
            sizes="320px"
            className="scale-105 object-cover object-center"
            unoptimized
          />
        </div>
      )}

      <div className="relative overflow-hidden rounded-[2rem] border-2 border-white bg-[#2a2a32] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:-translate-y-1">
        {/* flush: foto a sangría con el borde del card; el padre redondea arriba (overflow-hidden). */}
        {flush ? (
          <div
            className="relative w-full overflow-hidden bg-[#12121a]"
            style={{ aspectRatio: "3 / 4" }}
          >
            {posterContent}
          </div>
        ) : (
          <div className="p-2 pt-2.5 sm:p-2.5 sm:pt-3">
            <div
              className={`relative w-full max-w-full overflow-hidden bg-[#12121a] ${posterRound} ${posterFrame}`}
              style={{ aspectRatio: "3 / 4" }}
            >
              {posterContent}
            </div>
          </div>
        )}

        <div
          className={
            flush
              ? "px-3 pb-1 pt-2 sm:px-3.5 sm:pb-1.5 sm:pt-2.5"
              : "px-3 pb-1 pt-0 sm:px-3.5 sm:pb-1.5"
          }
        >
          <h3 className="line-clamp-2 text-[0.95rem] font-bold leading-tight tracking-tight text-white sm:text-base">
            {event.title}
          </h3>
          <p className="mt-1 text-[12px] text-white/50 sm:text-[12.5px]">
            {formatLongDate(event.startAt)}
            <span className="mx-1.5 text-white/25 sm:mx-2">|</span>
            {formatTime(event.startAt)}
          </p>
        </div>

        <div
          className={`mx-2 mb-2 mt-0.5 flex min-h-[4.25rem] items-stretch gap-2.5 rounded-2xl px-2.5 py-2.5 transition-[background-color,background,box-shadow] duration-500 sm:mx-2.5 sm:gap-3 sm:px-3.5 sm:py-3 ${
            footerTheme.footerOnLight && footerTheme.footerColorReady
              ? "shadow-[inset_0_1px_0_rgba(0,0,0,0.07)]"
              : "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          }`}
          style={
            hasImage &&
            event.image &&
            !footerTheme.footerColorReady
              ? {
                  backgroundImage: `linear-gradient(rgba(12,10,18,0.75), rgba(8,6,12,0.88)), url(${event.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center 72%",
                  backgroundRepeat: "no-repeat",
                }
              : { backgroundColor: footerTheme.footerBg }
          }
        >
          <div
            className="relative flex h-12 w-[3.1rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.12] py-0.5 text-center transition-[background-color] duration-500 sm:h-14 sm:w-14 sm:rounded-xl"
            style={
              hasImage && event.image
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.34), rgba(0,0,0,0.34)), url(${event.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { backgroundColor: footerTheme.badgeBg }
            }
          >
            <span
              className="relative z-[1] text-[0.5rem] font-bold uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.15em]"
              style={
                hasImage && event.image
                  ? {
                      color: "#fff",
                      textShadow: "0 1px 3px rgba(0,0,0,0.9)",
                    }
                  : {
                      color: footerTheme.badgeTextPrimary,
                      textShadow: footerTheme.badgeTextShadow,
                    }
              }
            >
              {month}
            </span>
            <span
              className="relative z-[1] text-[1.1rem] font-extrabold leading-none sm:text-lg"
              style={
                hasImage && event.image
                  ? {
                      color: "#fff",
                      textShadow: "0 1px 4px rgba(0,0,0,0.9)",
                    }
                  : {
                      color: footerTheme.badgeTextPrimary,
                      textShadow: footerTheme.badgeTextShadow,
                    }
              }
            >
              {day}
            </span>
          </div>
          <div className="min-w-0 flex-1 self-center">
            <p
              className="truncate text-[0.8rem] font-extrabold sm:text-[13px]"
              style={{
                color: footerTheme.footerTextPrimary,
                textShadow: footerTheme.footerTextShadow,
              }}
            >
              {event.venueName ?? "Por confirmar"}
            </p>
            <p
              className="mt-0.5 truncate text-[0.7rem] font-semibold sm:text-[11px]"
              style={{
                color: footerTheme.footerTextSecondary,
                textShadow: footerTheme.footerTextShadowSoft,
              }}
            >
              {event.city ?? ""}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default EventPosterCard;
