"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";
import { useEventImageFooterColor } from "@/hooks/useEventImageFooterColor";
import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";
import { siteBodyTextClass } from "@/lib/siteTypography";

type Venue = {
  id: string;
  name: string;
  city: string;
  address?: string;
  coverImageUrl?: string;
  logo?: string;
};
type Table = {
  id: string;
  zone: string;
  label: string;
  capacity: number;
  posX: number;
  posY: number;
  minPrice?: string | number | null;
  isAvailable?: boolean;
  estado?: string;
};
type TicketType = {
  id?: string;
  name: string;
  price: string | number;
  description?: string | null;
  quantityTotal?: number | null;
  showQuantityPublic?: boolean;
  active?: boolean;
};
type EventPayload = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  city: string;
  startAt: string;
  endAt: string;
  coverImageUrl?: string | null;
  images?: string[] | null;
  collagePhotos?: string[] | null;
  priceFrom?: number | null;
  requiresCoverForTable?: boolean;
  venue: Venue;
  tables?: Table[];
  ticketTypes?: TicketType[];
  /** Publicado al collage: recuerdos visibles; si false, el API no expone fotos al público */
  includeInCollage?: boolean;
  /** Autorización en panel; sin esto no se muestran recuerdos aunque existan en BD */
  collageAuthorized?: boolean;
};

/* ===========================================================
   Date helpers
=========================================================== */

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function formatFullDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    const parts = new Intl.DateTimeFormat("es-DO", {
      timeZone: "America/Santo_Domingo",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).formatToParts(d);
    const w = parts.find((p) => p.type === "weekday")?.value ?? "";
    const day = parts.find((p) => p.type === "day")?.value ?? "";
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return `${cap(w)}, ${day} de ${cap(month)} ${year}`;
  } catch {
    return "—";
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("es-DO", {
      timeZone: "America/Santo_Domingo",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
      .format(d)
      .toUpperCase()
      .replace(/\s+/g, " ");
  } catch {
    return "—";
  }
}

function formatTimeRange(startIso: string, endIso: string): string {
  const a = formatTime(startIso);
  const b = formatTime(endIso);
  return a && b && a !== "—" && b !== "—" ? `${a} — ${b}` : a;
}

/** Misma prioridad de imagen que en `page.tsx` (tema de color / portada). */
function resolveEventCover(e: EventPayload): string | null {
  const c = e.coverImageUrl?.trim();
  if (c) return c;
  const first = e.images?.find((u) => typeof u === "string" && u.trim().length > 0);
  if (first) return first;
  if (e.venue?.logo?.trim()) return e.venue.logo;
  if (e.venue?.coverImageUrl?.trim()) return e.venue.coverImageUrl;
  return null;
}

/* ===========================================================
   Icons
=========================================================== */

const iconCommon = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
} as const;

function IconCalendar() {
  return (
    <svg {...iconCommon}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg {...iconCommon}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg {...iconCommon}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconBuilding() {
  return (
    <svg {...iconCommon}>
      <path d="M3 21V7l9-4 9 4v14" />
      <path d="M9 21V12h6v9" />
      <path d="M3 21h18" />
    </svg>
  );
}

function IconGoogleMaps({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <defs>
        <clipPath id="gmaps-pin-clip">
          <path d="M12 22s7-6.2 7-11.8a7 7 0 1 0-14 0C5 15.8 12 22 12 22z" />
        </clipPath>
      </defs>
      <g clipPath="url(#gmaps-pin-clip)">
        <path d="M12 1.8a8.6 8.6 0 0 1 6.3 2.7L12 10.8z" fill="#EA4335" />
        <path d="M18.3 4.5A8.6 8.6 0 0 1 21 10.8h-9z" fill="#4285F4" />
        <path d="M21 10.8a8.9 8.9 0 0 1-3.2 6.7L12 10.8z" fill="#34A853" />
        <path d="M17.8 17.5A8.9 8.9 0 0 1 12 20.2v-9.4z" fill="#34A853" fillOpacity=".92" />
        <path d="M12 20.2a8.9 8.9 0 0 1-5.8-2.7L12 10.8z" fill="#FBBC05" />
        <path d="M6.2 17.5A8.9 8.9 0 0 1 3 10.8h9z" fill="#FBBC05" fillOpacity=".9" />
        <path d="M3 10.8a8.6 8.6 0 0 1 2.7-6.3l6.3 6.3z" fill="#EA4335" fillOpacity=".86" />
        <path d="M5.7 4.5A8.6 8.6 0 0 1 12 1.8v9z" fill="#EA4335" fillOpacity=".96" />
      </g>
      <circle cx="12" cy="10.8" r="3.2" fill="#fff" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconQr() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M17 17h4v4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 11 11 13 15 9" />
    </svg>
  );
}

/* ===========================================================
   Sub-component: Info item
=========================================================== */

function InfoItem({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2.5 md:flex-col md:items-center md:gap-2 md:text-center md:px-4 md:py-6 ${className ?? ""}`}
    >
      <span className="mt-0.5 shrink-0 text-[#C6B3E4]/95 md:mt-0 md:flex md:h-8 md:w-8 md:items-center md:justify-center md:rounded-none md:border-0 md:bg-transparent [&>svg]:md:h-[18px] [&>svg]:md:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0 md:flex md:flex-col md:items-center md:gap-1">
        <p
          className={`${siteBodyTextClass} text-white/60 md:text-[9px] md:font-bold md:uppercase md:tracking-[0.28em] md:!text-[#C6B3E4]/95`}
        >
          {label}
        </p>
        <p
          className={`truncate ${siteBodyTextClass} md:max-w-[16rem] md:overflow-visible md:whitespace-normal md:break-words md:text-pretty md:text-[15px] md:font-semibold md:leading-snug md:text-white/93`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ===========================================================
   EventDetailClient
=========================================================== */

export function EventDetailClient({
  event,
  serverFooterTheme = null,
}: {
  event: EventPayload;
  serverFooterTheme?: EventImageFooterTheme | null;
}) {
  const router = useRouter();
  const tables = event.tables ?? [];
  const ticketTypes = event.ticketTypes ?? [];
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const cover = resolveEventCover(event);
  const imageTheme = useEventImageFooterColor(
    cover,
    Boolean(cover),
    serverFooterTheme ?? undefined
  );
  const gallery = (event.images ?? []).filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0
  );
  const recap = (event.collagePhotos ?? []).filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0
  );
  const isPast = useMemo(() => {
    const endMs = new Date(event.endAt).getTime();
    return !Number.isNaN(endMs) && endMs < Date.now();
  }, [event.endAt]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const sortedTickets = useMemo(
    () =>
      [...ticketTypes]
        .filter((t) => t.active !== false)
        .sort((a, b) => Number(a.price) - Number(b.price)),
    [ticketTypes]
  );

  const ticketKey = (t: TicketType) => t.id ?? t.name;

  const activeTicket: TicketType | null = useMemo(() => {
    if (!selectedTicketId) return null;
    return sortedTickets.find((t) => ticketKey(t) === selectedTicketId) ?? null;
  }, [sortedTickets, selectedTicketId]);

  const checkoutHref = `/checkout/${event.id}${
    activeTicket?.id ? `?ticketTypeId=${activeTicket.id}` : ""
  }`;
  const mapsQuery = [event.venue?.name, event.venue?.address, event.city, "RD"]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(", ");
  const googleMapsUrl = mapsQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
    : null;

  const pageBgStyle = useMemo((): React.CSSProperties => {
    if (!imageTheme.footerColorReady || !cover) {
      return { background: "#080808" };
    }
    return {
      background: [
        `radial-gradient(ellipse 100% 70% at 50% -5%, color-mix(in srgb, ${imageTheme.footerBg} 50%, #0a0a12) 0%, transparent 55%)`,
        "linear-gradient(180deg, #09090d 0%, #080808 40%, #040406 100%)",
      ].join(", "),
    };
  }, [imageTheme.footerColorReady, imageTheme.footerBg, cover]);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={pageBgStyle}
    >
      {/* ==========================================================
          CONTENIDO PRINCIPAL — desktop: cartel más estrecho; derecha ancha con scroll sólo arriba + entradas compactas
      ========================================================== */}
      <div className="mx-auto max-w-[1280px] px-4 pt-4 sm:px-6 sm:pt-6">
        <div
          className="grid gap-8 py-8 md:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] md:items-stretch md:gap-8 md:py-6 md:h-[min(calc(100dvh-5.25rem),1080px)] md:max-h-[min(calc(100dvh-5.25rem),1080px)] md:min-h-0 md:overflow-hidden lg:gap-10"
        >
          {/* ============ COLUMNA IZQUIERDA — sólo cartel (desktop); móvil: cartel primero ============ */}
          <div className="relative flex min-h-0 min-w-0 flex-col md:justify-center">
            <div className="relative shrink-0 md:h-full md:max-h-full md:min-h-0 md:overflow-hidden">
              <div className="-mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:flex md:h-full md:max-h-full md:w-full md:max-w-none md:flex-col md:items-center md:justify-center md:overflow-hidden">
                {cover ? (
                  <div className="relative mx-auto flex w-full items-center justify-center md:mx-0 md:max-h-full md:h-auto md:w-full md:max-w-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cover}
                      alt={event.title}
                      className={`block max-h-[min(56vh,420px)] w-auto max-w-full object-contain object-center md:max-h-[min(calc(100dvh-8.25rem),720px)] md:h-auto md:w-full md:object-contain ${
                        isPast ? "saturate-[0.75]" : ""
                      }`}
                      decoding="async"
                    />
                  </div>
                ) : (
                  <div className="h-[min(40vh,360px)] w-full bg-gradient-to-br from-[#1a0d05] via-[#111111] to-[#080808] md:h-full md:max-h-[min(calc(100dvh-8rem),640px)]" />
                )}
              </div>
              {cover && (
                <div
                  aria-hidden
                  className="mt-3 h-7 w-full shrink-0 bg-gradient-to-b from-transparent to-[#080808] sm:h-8 md:mx-0 md:hidden md:h-0 md:w-full md:max-w-none"
                  style={
                    imageTheme.footerColorReady
                      ? {
                          background: `linear-gradient(to bottom, transparent, color-mix(in srgb, ${imageTheme.footerBg} 8%, #080808))`,
                        }
                      : undefined
                  }
                />
              )}
              {isPast && (
                <div className="absolute left-2 top-2 z-10 sm:left-4 sm:top-3 md:left-4 md:top-4">
                  <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D4C2EE] backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#9B7FCA]" />
                    Evento finalizado
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ============ COLUMNA DERECHA — scroll interno sólo datos+ texto; entradas compactas fijas abajo ============ */}
          <div className="flex h-full min-h-0 min-w-0 flex-col md:overflow-hidden lg:max-w-none">
            <div
              role="region"
              aria-label="Detalles del evento"
              className="space-y-5 pb-2 md:min-h-0 md:flex-1 md:space-y-3 md:overflow-y-auto md:pb-1 md:pr-1 [-webkit-overflow-scrolling:touch] md:[scrollbar-width:thin] md:[scrollbar-color:rgba(255,255,255,0.14)_transparent]"
            >
            {/* Escritorio: una sola ficha (hero + datos + descripción); móvil: mismos bloques con estilos independientes */}
            <div
              className="mb-6 flex flex-col gap-5 md:mb-3 md:flex md:flex-row md:gap-0 md:overflow-hidden md:rounded-2xl md:border md:border-white/[0.1] md:bg-[#06060a]/[0.98] md:shadow-[0_32px_80px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.045)]"
              style={
                imageTheme.footerColorReady
                  ? { borderColor: imageTheme.borderColor }
                  : undefined
              }
            >
              <div
                aria-hidden
                className="hidden w-1 shrink-0 bg-gradient-to-b from-white via-[#9B7FCA] to-[#1a1228] md:block"
              />
              <div className="relative min-w-0 flex-1 md:px-8 md:pb-9 md:pt-9">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 md:bg-[radial-gradient(ellipse_90%_70%_at_50%_-20%,rgba(155,127,202,0.18),transparent_55%),radial-gradient(ellipse_45%_50%_at_100%_100%,rgba(79,60,120,0.1),transparent_50%)]"
                />
                <div className="relative z-[1] flex flex-col gap-5 md:gap-0">
                  {/* Cabecera */}
                  <div className="flex flex-col gap-5 md:gap-6 md:pb-8">
                    <div className="flex flex-wrap gap-2 md:justify-center">
                      {event.category && (
                        <span className="inline-block rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78 backdrop-blur md:border-white/10 md:bg-white/[0.04] md:text-[10px]">
                          {event.category}
                        </span>
                      )}
                      <span className="inline-block rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78 backdrop-blur md:border-white/10 md:bg-white/[0.04] md:text-[10px]">
                        {event.city}
                      </span>
                    </div>

                    <div className="flex items-start gap-3 md:flex-col md:items-center md:gap-4 md:text-center">
                      <h1 className="flex-1 text-[32px] font-bold leading-[1.08] tracking-tight text-white md:flex-none md:w-full md:text-balance md:text-[2.55rem] md:leading-[1.02]">
                        {event.title}
                      </h1>
                      <div className="shrink-0 pt-1 md:flex md:justify-center md:pt-0">
                        {googleMapsUrl ? (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] transition-all hover:border-white/25 hover:bg-white/[0.08] md:h-10 md:w-10"
                            title="Abrir ubicación en Google Maps"
                            aria-label="Abrir ubicación en Google Maps"
                          >
                            <IconGoogleMaps />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    {(event.venue?.name || event.venue?.address) && (
                      <p
                        className={`mt-0 max-w-xl md:mx-auto md:text-balance md:text-center ${siteBodyTextClass} md:max-w-2xl md:text-[15px] md:leading-relaxed md:text-white/68`}
                      >
                        {[event.venue?.name, event.venue?.address]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>

                  {/* Datos — integrados al mismo panel (sin caja anidada en desktop) */}
                  <div
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-sm sm:grid-cols-2 sm:gap-x-5 sm:gap-y-4 md:grid md:grid-cols-2 md:gap-0 md:rounded-none md:border-0 md:border-t md:border-white/[0.075] md:bg-transparent md:px-0 md:pb-8 md:pt-8 md:shadow-none md:backdrop-blur-none md:divide-x md:divide-y md:divide-white/[0.08]"
                  >
                    <InfoItem
                      icon={<IconCalendar />}
                      label="Fecha"
                      value={formatFullDate(event.startAt)}
                    />
                    <InfoItem
                      icon={<IconClock />}
                      label="Hora"
                      value={formatTimeRange(event.startAt, event.endAt)}
                    />
                    <InfoItem
                      icon={<IconPin />}
                      label="Lugar"
                      value={`${event.city}, RD`}
                      className={
                        event.venue?.name ? undefined : "md:col-span-2"
                      }
                    />
                    {event.venue?.name && (
                      <InfoItem
                        icon={<IconBuilding />}
                        label="Venue"
                        value={event.venue.name}
                      />
                    )}
                  </div>

                  {event.requiresCoverForTable && (
                    <div className="mt-4 rounded-xl border border-[#9B7FCA]/30 bg-[#9B7FCA]/[0.08] px-4 py-3 text-sm text-[#E9DFF7] md:mt-0 md:rounded-lg md:border-[#9B7FCA]/25 md:bg-[#9B7FCA]/[0.06] md:px-5 md:py-3.5">
                      Este evento requiere cover o consumo mínimo para reservas
                      de mesa.
                    </div>
                  )}

                  {/* Descripción — mismo lienzo, tipografía continua */}
                  {event.description && (
                    <div className="border-t border-white/[0.08] pt-6 md:flex md:flex-col md:items-center md:gap-4 md:pb-1 md:pt-8">
                      <span className="hidden text-[9px] font-bold uppercase tracking-[0.4em] text-[#C6B3E4]/90 md:block">
                        En palabras del anfitrión
                      </span>
                      <div
                        className={`whitespace-pre-line ${siteBodyTextClass} md:mx-auto md:max-w-[40rem] md:text-balance md:text-center md:text-[15px] md:font-normal md:leading-[1.75] md:not-italic md:text-white/78 md:tracking-[0.01em]`}
                      >
                        {event.description}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Galería promocional (sólo móvil; desktop = una pantalla) */}
            {!isPast && gallery.length > 0 && (
              <div className="mb-2 md:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={gallery[0]}
                  alt=""
                  className="h-[240px] w-full cursor-pointer rounded-xl bg-[#0a0a0f] object-contain object-center p-1 transition duration-300 hover:brightness-110"
                />
                {gallery.length > 1 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {gallery.slice(1, 7).map((img, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${img}-${i}`}
                        src={img}
                        alt=""
                        className="h-[120px] w-full cursor-pointer rounded-xl bg-[#0a0a0f] object-contain object-center p-1 transition duration-300 hover:brightness-110"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>

          {/* Entradas: compactas en desktop (ancho completo de columna); no crecen en altura */}
          {!isPast && (
            <div className="mt-8 shrink-0 md:mt-3 md:border-t md:border-white/[0.08] md:pt-3">
              {/* Cuadro exterior: marco en gradiente + sombra (todas las fichas) */}
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -inset-[1px] rounded-[1.6rem] bg-gradient-to-br from-[#9B7FCA]/50 via-white/[0.12] to-[#4a3970]/60 opacity-90 blur-[0.5px] md:rounded-[1.35rem]"
                />
                <div
                  className="relative overflow-hidden rounded-3xl border border-white/[0.12] bg-[#070709]/[0.97] shadow-[0_4px_0_rgba(0,0,0,0.35),0_32px_64px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl sm:rounded-[1.65rem] md:rounded-2xl md:shadow-[0_3px_0_rgba(0,0,0,0.35),0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]"
                  style={
                    imageTheme.footerColorReady
                      ? {
                          borderColor: imageTheme.borderColor,
                          boxShadow: `0 4px 0 rgba(0,0,0,0.4), 0 28px 56px rgba(0,0,0,0.5), 0 0 0 1px ${imageTheme.borderColor}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                        }
                      : undefined
                  }
                >
                  <div
                    className="relative shrink-0 border-b border-white/[0.07] px-5 pb-5 pt-5 md:px-4 md:pb-3 md:pt-3.5"
                    style={{
                      background: imageTheme.footerColorReady
                        ? `linear-gradient(135deg, color-mix(in srgb, ${imageTheme.footerBg} 42%, #0c0c10) 0%, rgba(155,127,202,0.1) 55%, #08080a 100%)`
                        : "linear-gradient(135deg, #14121a 0%, rgba(155,127,202,0.12) 40%, #0a0a0c 100%)",
                    }}
                  >
                    <div
                      aria-hidden
                      className="mb-3 flex items-center justify-center gap-1.5 md:mb-2"
                    >
                      <span className="h-px w-8 max-w-[40%] bg-gradient-to-r from-transparent to-white/20 md:max-w-[28%]" />
                      <span className="rounded-full border border-[#9B7FCA]/35 bg-[#9B7FCA]/10 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.26em] text-[#D4C2EE] md:px-2 md:text-[8px]">
                        Entradas
                      </span>
                      <span className="h-px w-8 max-w-[40%] bg-gradient-to-l from-transparent to-white/20 md:max-w-[28%]" />
                    </div>
                    <h2 className="text-center text-[1.35rem] font-bold leading-tight text-white sm:text-2xl md:text-[1.1rem] md:leading-snug lg:text-xl">
                      Consigue tu acceso
                    </h2>
                    <p className="mt-1.5 text-center text-[13px] text-white/45 md:mt-1 md:text-[11px] md:leading-snug md:text-white/40">
                      Elige el tipo, revisa el precio y paga con total seguridad
                    </p>
                    <div
                      aria-hidden
                      className="mx-auto mt-3 h-px w-full max-w-[200px] border-b border-dashed border-white/15 md:mt-2.5 md:max-w-[min(260px,80%)]"
                    />
                  </div>

                  <div className="flex flex-col p-5 sm:p-6 md:p-3 md:pb-4">
                    {sortedTickets.length === 0 ? (
                      <div className="shrink-0 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-white/40">
                        Sin tipos de entrada publicados aún.
                      </div>
                    ) : (
                      <div className="shrink-0">
                        <p className="mb-2.5 pl-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 md:mb-1.5 md:text-[9px]">
                          Tipos de entrada
                        </p>
                        <div className="rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.05] to-black/25 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] md:rounded-xl md:p-1">
                          <div className="divide-y divide-white/[0.07] rounded-[14px] border border-white/[0.05] bg-[#050508]/80 md:rounded-[11px]">
                            {sortedTickets.map((t) => {
                              const id = ticketKey(t);
                              const isSelected =
                                activeTicket && ticketKey(activeTicket) === id;
                              const showStock = t.showQuantityPublic !== false;
                              const low =
                                showStock && t.quantityTotal != null && t.quantityTotal < 20;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => setSelectedTicketId(id)}
                                  aria-pressed={!!isSelected}
                                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-[13px] px-3.5 py-3.5 text-left transition-all duration-200 first:rounded-t-[13px] last:rounded-b-[13px] md:gap-2.5 md:px-3 md:py-2.5 md:first:rounded-t-[11px] md:last:rounded-b-[11px] ${
                                    isSelected
                                      ? "bg-gradient-to-r from-[#9B7FCA]/[0.16] via-[#9B7FCA]/[0.06] to-transparent ring-1 ring-inset ring-[#9B7FCA]/45"
                                      : "hover:bg-white/[0.05]"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-[15px] font-bold text-white md:text-[13px]">
                                      {t.name}
                                    </p>
                                    {showStock && t.quantityTotal != null && (
                                      <p
                                        className={`text-xs ${
                                          low
                                            ? "font-semibold text-amber-300/90"
                                            : "text-white/40"
                                        }`}
                                      >
                                        {low
                                          ? "¡Últimas salidas!"
                                          : `${t.quantityTotal} disponibles`}
                                      </p>
                                    )}
                                    {t.description && (
                                      <p className="mt-0.5 line-clamp-2 text-xs text-white/40">
                                        {t.description}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex shrink-0 items-center gap-2">
                                    <span className="text-[18px] font-black tabular-nums text-white md:text-[15px]">
                                      {formatMoney(Number(t.price))}
                                    </span>
                                    {isSelected && (
                                      <span
                                        className="flex h-7 w-7 items-center justify-center rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/25 text-[#9B7FCA] shadow-[0_0_12px_rgba(155,127,202,0.35)]"
                                        aria-hidden
                                      >
                                        <IconCheck size={16} />
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="shrink-0 space-y-2 rounded-2xl border border-[#9B7FCA]/[0.18] bg-gradient-to-b from-[#9B7FCA]/[0.07] to-transparent p-4 md:space-y-2 md:p-3">
                      <button
                        type="button"
                        disabled={!activeTicket}
                        onClick={() => activeTicket && router.push(checkoutHref)}
                        className={`group flex w-full items-center justify-center gap-1.5 rounded-2xl py-3.5 text-center text-base font-extrabold transition-all duration-200 ${
                          activeTicket
                            ? "bg-gradient-to-r from-[#9B7FCA] to-[#6f5499] text-white shadow-[0_4px_0_#5a4080,0_12px_32px_rgba(155,127,202,0.35)] hover:translate-y-[-1px] hover:from-[#B39CD8] hover:to-[#8b6ab5] active:translate-y-0"
                            : "cursor-not-allowed border border-white/15 bg-white/[0.06] text-white/40"
                        }`}
                      >
                        <span>Comprar entrada</span>
                        <span className="transition group-hover:translate-x-0.5">
                          →
                        </span>
                      </button>
                      {tables.length > 0 && (
                        <Link
                          href={`/reservar/${event.id}`}
                          className="flex w-full items-center justify-center rounded-2xl border border-white/18 bg-white/[0.05] py-3 text-sm font-semibold text-white/95 backdrop-blur transition-colors duration-200 hover:border-[#9B7FCA]/50 hover:bg-[#9B7FCA]/[0.1] hover:text-white md:rounded-xl md:py-2 md:text-xs"
                        >
                          Reservar mesa
                        </Link>
                      )}
                    </div>

                    <div className="mt-5 shrink-0 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-3 md:mt-3 md:px-2.5 md:py-2">
                      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2.5 text-[10px] font-medium uppercase tracking-wider text-white/35 sm:gap-x-6 md:gap-x-4 md:gap-y-1.5 md:text-[9px] md:tracking-wide">
                        <span className="inline-flex items-center gap-1.5 text-white/50">
                          <IconLock />
                          Pago seguro
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-white/50">
                          <IconQr />
                          QR al instante
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-white/50">
                          <IconShield />
                          Garantía Gózalo
                        </span>
                      </div>
                    </div>

                    {event.venue?.id && (
                      <Link
                        href={`/collage?venueId=${encodeURIComponent(event.venue.id)}`}
                        className="mt-4 block shrink-0 text-center text-[12px] font-medium text-[#9B7FCA]/90 transition hover:text-[#D4C2EE] hover:underline"
                      >
                        Ver recuerdos de eventos pasados de {event.venue.name} →
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-white/25 md:mt-2 md:text-[10px]">
                Necesitas iniciar sesión para completar compra o reserva.
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* ==========================================================
          RECAP — sólo eventos pasados
      ========================================================== */}
      {isPast && (
        <RecapSection
          recap={recap}
          eventTitle={event.title}
          venueName={event.venue?.name}
          venueId={event.venue?.id}
          includeInCollage={event.includeInCollage !== false}
          collageAuthorized={event.collageAuthorized === true}
          endAt={event.endAt}
          onOpen={(i) => setLightbox(i)}
        />
      )}

      {/* ==========================================================
          LIGHTBOX (evento pasado)
      ========================================================== */}
      {isPast && lightbox != null && recap[lightbox] && (
        <Lightbox
          photos={recap}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNav={(i) => setLightbox(i)}
        />
      )}

    </div>
  );
}

/* ===========================================================
   Recap section (evento pasado) — "Esto se vivió"
=========================================================== */

function humanAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const d = Math.floor(ms / 86400000);
  if (d < 1) return "hoy";
  if (d === 1) return "hace 1 día";
  if (d < 30) return `hace ${d} días`;
  const m = Math.floor(d / 30);
  if (m === 1) return "hace 1 mes";
  if (m < 12) return `hace ${m} meses`;
  const y = Math.floor(d / 365);
  return y === 1 ? "hace 1 año" : `hace ${y} años`;
}

function RecapSection({
  recap,
  eventTitle,
  venueName,
  venueId,
  includeInCollage,
  collageAuthorized,
  endAt,
  onOpen,
}: {
  recap: string[];
  eventTitle: string;
  venueName?: string;
  venueId?: string;
  includeInCollage: boolean;
  collageAuthorized: boolean;
  endAt: string;
  onOpen: (i: number) => void;
}) {
  const hasPhotos = recap.length > 0;
  const featured = hasPhotos ? recap[0] : null;
  const rest = hasPhotos ? recap.slice(1) : [];

  return (
    <section
      className="relative border-t border-white/[0.05] bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F] to-[#050509] pb-24 pt-16 md:pb-32 md:pt-24"
      aria-label="Recuerdos del evento"
    >
      {/* Halo superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px]"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 50% 0%, rgba(155,127,202,0.14) 0%, transparent 65%)",
        }}
      />

      <div className="relative mx-auto max-w-[1100px] px-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#D4C2EE]">
            ✦ Recap del evento
          </span>
          <h2 className="mt-4 text-3xl font-black leading-[1.05] text-white md:text-5xl">
            Esto se{" "}
            <span className="bg-gradient-to-br from-[#C6B3E4] to-[#9B7FCA] bg-clip-text text-transparent">
              vivió aquí
            </span>
          </h2>
          <p className="mt-3 max-w-xl text-sm text-white/50 md:text-[15px]">
            {venueName ? `${venueName} · ` : ""}
            {humanAgo(endAt)} ·{" "}
            {includeInCollage && collageAuthorized ? (
              <>
                {recap.length} foto{recap.length === 1 ? "" : "s"} del recap de{" "}
                <span className="text-white/80">{eventTitle}</span>.
              </>
            ) : !includeInCollage ? (
              <>el local no activó publicación de recuerdos de este evento en el collage.</>
            ) : (
              <>el local aún no ha autorizado la publicación de este evento en el collage público.</>
            )}
          </p>
        </div>

        {hasPhotos ? (
          <>
            {/* Feature cinemática */}
            <button
              type="button"
              onClick={() => onOpen(0)}
              className="group mt-10 block w-full overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#0f0f16] transition-transform duration-500 hover:-translate-y-0.5"
            >
              <div className="relative aspect-[16/9] w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured as string}
                  alt=""
                  className="h-full w-full bg-[#0a0a0f] object-contain object-center p-1 transition duration-700 group-hover:scale-[1.01]"
                />
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(5,5,9,0.85) 0%, rgba(5,5,9,0.1) 40%, transparent 60%)",
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-6 md:p-8">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D4C2EE]">
                      Momento destacado
                    </p>
                    <p className="mt-1 text-lg font-bold text-white md:text-2xl">
                      {eventTitle}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                    Ver galería completa →
                  </span>
                </div>
              </div>
            </button>

            {/* Masonry (CSS columns) */}
            {rest.length > 0 && (
              <div className="mt-6 columns-1 gap-4 [column-fill:_balance] sm:columns-2 md:columns-3">
                {rest.map((url, i) => {
                  const realIndex = i + 1;
                  const spanTall = i % 5 === 0 || i % 7 === 0;
                  return (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => onOpen(realIndex)}
                      className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0f0f16] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#9B7FCA]/35 hover:shadow-[0_14px_32px_rgba(155,127,202,0.18)]"
                    >
                      <div className="relative overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className={`h-auto w-full bg-[#0a0a0f] object-contain object-center p-1 transition-transform duration-500 group-hover:scale-[1.02] ${
                            spanTall ? "aspect-[3/4]" : "aspect-square"
                          }`}
                        />
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
                          style={{
                            background:
                              "linear-gradient(135deg, rgba(155,127,202,0.22) 0%, transparent 55%)",
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : !includeInCollage ? (
          <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-8 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/[0.04] text-2xl">
              ···
            </div>
            <p className="mt-4 text-lg font-semibold text-white/85">Este evento ya terminó</p>
            <p className="mt-2 text-sm text-white/45">
              El productor no activó la publicación de recuerdos en el collage para este evento. Aún puedes
              explorar otros momentos en el collage general.
            </p>
            <Link
              href={venueId ? `/collage?venueId=${encodeURIComponent(venueId)}` : "/collage"}
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-4 py-2 text-sm font-semibold text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
            >
              {venueId
                ? `Ver recuerdos de ${venueName ?? "este local"} →`
                : "Explorar el collage →"}
            </Link>
          </div>
        ) : !collageAuthorized ? (
          <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-dashed border-amber-500/25 bg-amber-500/[0.04] px-8 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-2xl">
              ⏳
            </div>
            <p className="mt-4 text-lg font-semibold text-white/85">Recuerdos no publicados aún</p>
            <p className="mt-2 text-sm text-white/50">
              El local aún no ha confirmado en su panel la publicación de este evento en el collage. Cuando lo
              haga, el recap quedará visible aquí y en <span className="text-white/70">/collage</span>.
            </p>
            <Link
              href={venueId ? `/collage?venueId=${encodeURIComponent(venueId)}` : "/collage"}
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
            >
              Explorar el collage general →
            </Link>
          </div>
        ) : (
          <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-dashed border-white/[0.12] bg-white/[0.02] px-8 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 text-2xl">
              ✦
            </div>
            <p className="mt-4 text-lg font-semibold text-white/85">
              Este evento ya terminó
            </p>
            <p className="mt-2 text-sm text-white/45">
              {venueName ?? "El local"} aún no ha subido los recuerdos de
              esta noche. Vuelve pronto para ver cómo se vivió.
            </p>
            <Link
              href={venueId ? `/collage?venueId=${encodeURIComponent(venueId)}` : "/collage"}
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-4 py-2 text-sm font-semibold text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
            >
              {venueId
                ? `Ver más recuerdos de ${venueName ?? "este local"} →`
                : "Explorar otros recuerdos →"}
            </Link>
          </div>
        )}

        {/* Footer CTA */}
        <div className="mx-auto mt-14 flex max-w-2xl flex-col items-center rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-8 text-center md:flex-row md:justify-between md:text-left">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B7FCA]">
              ¿Te gusta lo que viste?
            </p>
            <p className="mt-1.5 text-lg font-semibold text-white">
              Descubre el próximo evento de {venueName ?? "este local"}
            </p>
          </div>
          <Link
            href="/eventos"
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-[#9B7FCA] to-[#7B5EA7] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(155,127,202,0.35)] transition hover:shadow-[0_12px_32px_rgba(155,127,202,0.5)] md:mt-0"
          >
            Ver próximos eventos →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ===========================================================
   Lightbox simple (evento pasado)
=========================================================== */

function Lightbox({
  photos,
  index,
  onClose,
  onNav,
}: {
  photos: string[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
}) {
  const prev = () => onNav((index - 1 + photos.length) % photos.length);
  const next = () => onNav((index + 1) % photos.length);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt=""
        className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-[0_30px_80px_rgba(155,127,202,0.25)]"
        onClick={(e) => e.stopPropagation()}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Cerrar"
        className="absolute right-4 top-4 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
      >
        Cerrar ✕
      </button>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-2 text-white backdrop-blur transition hover:bg-white/15 md:left-8"
          >
            ←
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-2 text-white backdrop-blur transition hover:bg-white/15 md:right-8"
          >
            →
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70 backdrop-blur">
            {index + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
