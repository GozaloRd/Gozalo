"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useEventImageFooterColor } from "@/hooks/useEventImageFooterColor";
import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";

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

function qrFromPayload(payload: string) {
  return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=200&margin=1&format=png&dark=ffffff&light=0a0a12`;
}

export type EventTicketPassCardProps = {
  eventTitle: string;
  startAt: string;
  venueName?: string | null;
  city?: string | null;
  coverImageUrl?: string | null;
  ticketType: string;
  priceLabel: string;
  qrImageUrl?: string | null;
  qrPayload?: string | null;
  /** Tema de pie (SSR opcional) para alinear con EventPosterCard. */
  serverFooterTheme?: EventImageFooterTheme | null;
  /** Enlace al evento (ficha) — típ. /eventos/[slug] */
  eventHref?: string;
  /** Para capturas/export PNG: usar &lt;img&gt; permite CORS y html2canvas. */
  preferImgElement?: boolean;
  className?: string;
  status?: string | null;
  statusLabel?: string;
};

const STATUS_STYLES: Record<string, string> = {
  paid: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  valid: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  used: "border-slate-400/45 bg-slate-600/30 text-slate-100",
  pending: "border-amber-400/35 bg-amber-500/12 text-amber-200",
  cancelled: "border-rose-400/30 bg-rose-500/10 text-rose-200",
};

/**
 * Pase de entrada: misma lógica visual que {@link EventPosterCard} (borde claro, portada, franja con fecha/venue) + QR integrado.
 */
export function EventTicketPassCard({
  eventTitle,
  startAt,
  venueName,
  city,
  coverImageUrl,
  ticketType,
  priceLabel,
  qrImageUrl,
  qrPayload,
  serverFooterTheme = null,
  eventHref,
  preferImgElement = false,
  className = "",
  status,
  statusLabel,
}: EventTicketPassCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasImage = !!coverImageUrl && !imgError;
  const { day, month } = dateParts(startAt);

  const imageTheme = useEventImageFooterColor(
    coverImageUrl ?? null,
    hasImage,
    serverFooterTheme
  );

  /** Prioridad al payload + QuickChart: mismo código escaneable, colores de marca consistentes (blanco sobre oscuro). */
  const qrSrc = useMemo(() => {
    if (qrPayload && qrPayload.trim().length > 0) return qrFromPayload(qrPayload.trim());
    if (qrImageUrl && qrImageUrl.length > 0) return qrImageUrl;
    return null;
  }, [qrImageUrl, qrPayload]);

  const isUsed = status === "used";

  const content = (
    <div
      className={`relative w-full overflow-hidden rounded-[2rem] border-2 border-white bg-[#2a2a32] shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:mx-auto md:max-w-md ${className}`}
    >
      {status && statusLabel && (
        <div className="absolute right-3 top-3 z-20 sm:right-3.5 sm:top-3.5">
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              STATUS_STYLES[status] ?? "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      )}

      <div className="p-2 pt-2.5 sm:p-2.5 sm:pt-3">
        <div
          data-ticket-pass-poster
          className="relative w-full max-w-full overflow-hidden rounded-2xl bg-[#12121a]"
          style={{ aspectRatio: "3 / 4", maxHeight: "min(58vh, 360px)" }}
        >
          {hasImage ? (
            preferImgElement ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl as string}
                alt={eventTitle}
                crossOrigin="anonymous"
                className="absolute inset-0 h-full w-full object-cover object-center"
                onError={() => setImgError(true)}
              />
            ) : (
              <Image
                src={coverImageUrl as string}
                alt={eventTitle}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                className="object-cover object-center"
                unoptimized
                onError={() => setImgError(true)}
              />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#9B7FCA] via-[#4A3970] to-[#111118] p-4">
              <span className="line-clamp-3 text-center text-xl font-bold uppercase leading-tight tracking-tight text-white/95">
                {eventTitle}
              </span>
            </div>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[20%] bg-gradient-to-t from-black/50 via-black/10 to-transparent"
          />
        </div>
      </div>

      <div className="px-3.5 pb-1 pt-0 text-left sm:px-4 sm:pb-1.5">
        <h3 className="line-clamp-2 text-base font-bold leading-tight tracking-tight text-white sm:text-[1.05rem]">
          {eventTitle}
        </h3>
        <p className="mt-1 text-[12px] text-white/50 sm:text-[12.5px]">
          {formatLongDate(startAt)}
          <span className="mx-1.5 text-white/25 sm:mx-2">|</span>
          {formatTime(startAt)}
        </p>
        <p className="mt-1.5 text-[12px] font-semibold text-white/80">
          {ticketType} · {priceLabel}
        </p>
      </div>

      <div
        className={`mx-2 mb-2 mt-0.5 flex min-h-[4.5rem] flex-col gap-3 rounded-2xl px-2.5 py-3 sm:mx-2.5 sm:flex-row sm:items-stretch sm:gap-2 sm:px-3 sm:py-3 ${
          imageTheme.footerOnLight && imageTheme.footerColorReady
            ? "shadow-[inset_0_1px_0_rgba(0,0,0,0.07)]"
            : "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        }`}
        style={
          hasImage && coverImageUrl && !imageTheme.footerColorReady
            ? {
                backgroundImage: `linear-gradient(rgba(12,10,18,0.82), rgba(8,6,12,0.9)), url(${coverImageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center 70%",
                backgroundRepeat: "no-repeat",
              }
            : { backgroundColor: imageTheme.footerBg }
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <div
            className="relative flex h-12 w-[3.1rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.12] py-0.5 sm:h-14 sm:w-14 sm:rounded-xl"
            style={
              hasImage && coverImageUrl
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${coverImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { backgroundColor: imageTheme.badgeBg }
            }
          >
            <span
              className="relative z-[1] text-[0.5rem] font-bold uppercase tracking-[0.12em] sm:text-[9px] sm:tracking-[0.15em]"
              style={
                hasImage && coverImageUrl
                  ? { color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }
                  : { color: imageTheme.badgeTextPrimary, textShadow: imageTheme.badgeTextShadow }
              }
            >
              {month}
            </span>
            <span
              className="relative z-[1] text-[1.1rem] font-extrabold leading-none sm:text-lg"
              style={
                hasImage && coverImageUrl
                  ? { color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }
                  : { color: imageTheme.badgeTextPrimary, textShadow: imageTheme.badgeTextShadow }
              }
            >
              {day}
            </span>
          </div>
          <div className="min-w-0 flex-1 self-center text-left">
            <p
              className="truncate text-[0.8rem] font-extrabold sm:text-[13px]"
              style={{
                color: imageTheme.footerTextPrimary,
                textShadow: imageTheme.footerTextShadow,
              }}
            >
              {venueName ?? "Por confirmar"}
            </p>
            <p
              className="mt-0.5 truncate text-[0.7rem] font-semibold sm:text-[11px]"
              style={{
                color: imageTheme.footerTextSecondary,
                textShadow: imageTheme.footerTextShadowSoft,
              }}
            >
              {city ?? ""}
            </p>
          </div>
        </div>

        {qrSrc && (
          <div
            className={`mx-auto flex w-full max-w-[12rem] justify-center sm:mx-0 sm:ml-auto sm:mr-0 sm:w-40 sm:max-w-[10rem] sm:shrink-0 sm:justify-end ${
              isUsed ? "opacity-80 saturate-50" : ""
            }`}
          >
            <div className="w-full rounded-2xl border border-white/10 bg-black/25 p-2.5 ring-1 ring-inset ring-white/[0.06] sm:w-40 sm:p-2.5">
              <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white p-2 sm:rounded-md sm:p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrSrc}
                  alt="Código QR de entrada"
                  className="h-full w-full object-contain object-center"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (eventHref) {
    return (
      <Link
        href={eventHref}
        className="group block w-full outline-none focus-visible:ring-2 focus-visible:ring-gozalo-blue/60 md:mx-auto md:max-w-md"
      >
        {content}
      </Link>
    );
  }

  return <div className="w-full md:mx-auto md:max-w-md">{content}</div>;
}

export default EventTicketPassCard;
