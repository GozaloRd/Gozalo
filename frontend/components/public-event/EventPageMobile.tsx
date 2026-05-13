"use client";

import { Inter, Montserrat } from "next/font/google";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ExternalLink,
  LayoutGrid,
  Lock,
  MapPin,
  Maximize2,
  QrCode,
  ShieldCheck,
  Table2,
  Ticket,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { useEffect } from "react";
import { getAuthToken } from "@/lib/authToken";
import { BottomCTABar } from "./BottomCTABar";
import { EventHero } from "./EventHero";
import { PublicEventDescriptionBox } from "./PublicEventDescriptionBox";
import { PublicNavbar } from "./PublicNavbar";
import { TableLayoutLightbox } from "./TableLayoutLightbox";
import { TablesByZoneAccordion } from "./TablesByZoneAccordion";
import { PurchaseFlowFullscreenOverlay } from "./PurchaseFlowTransition";
import { TicketCard } from "./TicketCard";
import type { PublicEvent } from "./types";
import { googleMapsUrl } from "./utils";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

/** Títulos de bloques bajo el hero: sans geométrica, sobre vidrio */
const montserratTickets = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const ACCENT = "#1a1a1a";

/** Paneles bajo el hero: vidrio esmerilado + blur */
const glassPanel =
  "rounded-[28px] border border-white/[0.13] bg-gradient-to-b from-white/[0.1] to-white/[0.04] p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.72)] backdrop-blur-[28px]";

const BLUR_BG_OVERLAY_STYLE: CSSProperties = {
  background: `linear-gradient(
    180deg,
    rgba(0,0,0,0.15) 0%,
    rgba(0,0,0,0.20) 40%,
    rgba(0,0,0,0.75) 70%,
    rgba(0,0,0,0.95) 100%
  )`,
};

/** Misma curva que el flyer en `EventHero` (opacity + scale 0.98) */
const glassCardVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

const glassCardsContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      /** Encadena tras el flyer (~delay 0.06 + un tick) */
      delayChildren: 0.12,
    },
  },
};

export function EventPageMobile({ event, error }: { event: PublicEvent | null; error?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [loginPulse, setLoginPulse] = useState(false);
  const [tableLayoutOpen, setTableLayoutOpen] = useState(false);
  /** Checkout / reserva: overlay animado antes de `window.location`. */
  const [pendingNav, setPendingNav] = useState<{ href: string; kind: "checkout" | "reserva" } | null>(null);

  useEffect(() => {
    if (!pendingNav) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => {
      window.location.href = pendingNav.href;
    }, 520);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prevOverflow;
    };
  }, [pendingNav]);

  if (error) {
    return (
      <div className={`${inter.className} min-h-screen w-full bg-[#1a1a1a]`}>
        <PublicNavbar scrolled />
        <div className="px-5 pt-40 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-white/35" />
          <p className="mt-4 text-[22px] font-extrabold text-white">No pudimos cargar el evento</p>
          <p className="mt-2 text-sm text-white/45">{error}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#1a1a1a]">
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`${inter.className} min-h-screen w-full bg-[#1a1a1a]`}>
        <PublicNavbar scrolled={false} />
        <div className="mt-20">
          <div className="mx-5 h-10 w-3/4 animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-5 mt-3 h-4 w-1/2 animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-5 mt-2 h-4 w-2/3 animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-5 mt-4 aspect-square animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-5 mt-4 h-28 animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-5 mt-4 h-28 animate-pulse rounded-2xl bg-white/10" />
          <div className="mx-5 mt-4 h-28 animate-pulse rounded-2xl bg-white/10" />
        </div>
      </div>
    );
  }

  const handleProtectedAction = (href: string) => {
    const isCheckout = href.includes("/checkout/");
    const isReserva = href.includes("/reservar/");
    if (!getAuthToken() && !isCheckout && !isReserva) {
      const note = document.getElementById("login-note");
      note?.scrollIntoView({ behavior: "smooth", block: "center" });
      setLoginPulse(true);
      window.setTimeout(() => setLoginPulse(false), 2000);
      return;
    }
    if (isCheckout) {
      setPendingNav({ href, kind: "checkout" });
      return;
    }
    if (isReserva) {
      setPendingNav({ href, kind: "reserva" });
      return;
    }
    window.location.href = href;
  };

  const goTicket = (ticketId: string) => handleProtectedAction(`/checkout/${event.id}?ticket=${ticketId}`);
  const goTable = (tableId: string) => handleProtectedAction(`/reservar/${event.id}?table=${tableId}`);

  const hasTickets = event.tickets.length > 0;
  const hasTables = event.tables.length > 0;
  const hasDesc = Boolean(event.description?.trim());
  const showMainPanel = hasTickets || hasTables || hasDesc;

  return (
    <div className={`${inter.className} relative min-h-screen w-full bg-black`}>
      {event.imageUrl ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              filter: "blur(40px) brightness(0.35) saturate(1.4)",
              transform: "scale(1.1)",
            }}
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[1]" style={BLUR_BG_OVERLAY_STYLE} />

      <div className="relative z-10">
        <PublicNavbar scrolled={scrolled} />
        <EventHero event={event} />

        {/* Bloques bajo el hero: misma entrada que el flyer (opacity + scale), escalonado */}
        <motion.div
          key={event.id}
          id="tickets-section"
          className="relative mt-9 space-y-5 px-4 font-sans sm:px-5"
          variants={glassCardsContainerVariants}
          initial="hidden"
          animate="visible"
        >
          {showMainPanel && hasTickets ? (
              <motion.section
                variants={glassCardVariants}
                className={`${glassPanel} ${montserratTickets.className}`}
              >
                <div className="mb-4 flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <Ticket className="h-[18px] w-[18px] text-white/90" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-px w-8 shrink-0 bg-gradient-to-r from-amber-300/90 to-transparent" aria-hidden />
                      <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-white/95">Obtener entradas</h2>
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-white/42">Elige un tipo y continúa al checkout seguro.</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  {event.tickets.map((ticket, index) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      bgColor={ACCENT}
                      index={index}
                      variant="light"
                      lightRow={{ isLast: index === event.tickets.length - 1, tone: "glass" }}
                      onClick={() => goTicket(ticket.id)}
                    />
                  ))}
                </div>
              </motion.section>
            ) : null}

          {showMainPanel && hasTables ? (
              <motion.section
                variants={glassCardVariants}
                className={`${glassPanel} ${montserratTickets.className}`}
              >
                <div className="mb-4 flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <Table2 className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="h-px w-8 shrink-0 bg-gradient-to-r from-amber-300/90 to-transparent" aria-hidden />
                      <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-white">Mesas por zona</h2>
                    </div>
                    <p className="mt-2 text-[11px] leading-snug text-white/90">Despliega cada zona y reserva tu mesa.</p>
                  </div>
                </div>
                {event.tableLayoutImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setTableLayoutOpen(true)}
                    className="group mb-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.12] bg-gradient-to-br from-white/[0.09] via-white/[0.05] to-white/[0.02] px-3.5 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_40px_-24px_rgba(0,0,0,0.55)] backdrop-blur-md transition hover:border-white/[0.18] hover:from-white/[0.11] active:scale-[0.99]"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition group-hover:bg-white/[0.1]">
                        <LayoutGrid className="h-[18px] w-[18px] text-amber-200/95" strokeWidth={2} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/92">
                          Plano del salón
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-white/48">
                          Ver distribución de mesas en grande
                        </span>
                      </span>
                    </span>
                    <Maximize2 className="h-4 w-4 shrink-0 text-white/40 transition group-hover:text-white/60" strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
                <TablesByZoneAccordion tables={event.tables} bgColor={ACCENT} onTableAction={goTable} tone="glass" />
              </motion.section>
            ) : null}

          {showMainPanel && hasDesc && event.description ? (
              <motion.section
                variants={glassCardVariants}
                className={`${glassPanel} ${montserratTickets.className}`}
              >
                <PublicEventDescriptionBox
                  description={event.description}
                  embedded
                  embeddedTone="glass"
                  sectionTitleClassName={montserratTickets.className}
                />
              </motion.section>
            ) : null}

          <motion.section
            variants={glassCardVariants}
            className={`${glassPanel} ${montserratTickets.className}`}
          >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <MapPin className="h-[18px] w-[18px] text-amber-200/95" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.24em] text-white/95">Ubicación</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-white/68">{event.address}</p>
              <a
                href={googleMapsUrl(`${event.venueName}, ${event.address}`)}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-amber-200/95 underline decoration-amber-200/35 underline-offset-[5px] transition-colors hover:text-amber-100 hover:decoration-amber-100/50"
              >
                Abrir en Google Maps
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            </div>
          </div>
        </motion.section>
        </motion.div>

        <section className="mt-10 flex flex-wrap items-center justify-center gap-6 px-5">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-white/25" />
            <span className="text-xs font-semibold tracking-[0.1em] text-white/30">PAGO SEGURO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <QrCode className="h-3.5 w-3.5 text-white/25" />
            <span className="text-xs font-semibold tracking-[0.1em] text-white/30">QR AL INSTANTE</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-white/25" />
            <span className="text-xs font-semibold tracking-[0.1em] text-white/30">GARANTÍA GOZALO</span>
          </div>
        </section>

        <motion.section
          id="login-note"
          animate={loginPulse ? { scale: [1, 1.02, 1] } : undefined}
          transition={{ duration: 2 }}
          className="mt-5 px-5 text-center text-xs text-white/30"
        >
          Las entradas se pueden comprar sin cuenta; para reservar mesa necesitas iniciar sesión.
          <Link href="/login" className="ml-1 font-semibold text-white/65 underline underline-offset-2">
            Iniciar sesión
          </Link>
        </motion.section>

        {event.venueSlug ? (
          <section className="mt-5 px-5 text-center text-xs text-white/40">
            <Link href={`/collage?venueId=${encodeURIComponent(event.venueSlug)}`} className="underline underline-offset-2 hover:text-white/60">
              Ver recuerdos de eventos pasados de {event.venueName} →
            </Link>
          </section>
        ) : null}

        <footer className="mt-12 border-t border-white/10 px-5 pb-28 pt-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-base font-bold text-white">G</div>
          <span className="mt-3 block text-xs text-white/25">© 2026 Gozalo Dominicana. Todos los derechos reservados.</span>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs text-white/25">
            <span>Prensa</span>
            <span>Términos y servicios</span>
            <span>Seguridad</span>
            <span>Compra segura</span>
            <span>Reembolsos</span>
            <span>Política de privacidad</span>
          </div>
        </footer>

        <BottomCTABar
          bgColor={ACCENT}
          firstTicketId={event.tickets[0]?.id ?? null}
          onFirstTicket={goTicket}
        />
        {event.tableLayoutImageUrl ? (
          <TableLayoutLightbox
            open={tableLayoutOpen}
            onClose={() => setTableLayoutOpen(false)}
            imageUrl={event.tableLayoutImageUrl}
          />
        ) : null}
      </div>

      <PurchaseFlowFullscreenOverlay
        open={!!pendingNav}
        icon={pendingNav?.kind === "reserva" ? "table" : "ticket"}
        title={pendingNav?.kind === "reserva" ? "Yendo a reservar…" : "Yendo al checkout…"}
        subtitle={pendingNav?.kind === "reserva" ? "Preparando tu mesa" : "Cargando pago seguro"}
      />
    </div>
  );
}
