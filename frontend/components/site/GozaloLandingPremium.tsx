"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EventPosterCard } from "@/components/site/EventPosterCard";
import { useEventImageFooterColor } from "@/hooks/useEventImageFooterColor";
import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";

/* ==========================================================
   Iconos inline (SVG minimalistas)
========================================================== */

function IconCalendar({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

/* ==========================================================
   Tipos públicos + helpers de fecha
========================================================== */

export type LandingEvent = {
  id: string;
  slug: string;
  title: string;
  category: string;
  city: string;
  startAt: string; // ISO
  endAt?: string;
  venueName: string | null;
  image: string | null;
  /** Pie del card precalculado en el servidor (sin gris al cargar). */
  serverFooterTheme?: EventImageFooterTheme | null;
};

const TZ = "America/Santo_Domingo";

function safeDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatLongDate(iso: string): string {
  const d = safeDate(iso);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("es-DO", {
      timeZone: TZ,
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

function formatTime(iso: string): string {
  const d = safeDate(iso);
  if (!d) return "";
  try {
    return new Intl.DateTimeFormat("es-DO", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  } catch {
    return "";
  }
}

function formatMonthAbbr(iso: string): string {
  const d = safeDate(iso);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("es-DO", {
      timeZone: TZ,
      month: "short",
    })
      .format(d)
      .replace(/\./g, "")
      .toUpperCase();
  } catch {
    return "—";
  }
}

function formatDay(iso: string): string {
  const d = safeDate(iso);
  if (!d) return "—";
  try {
    return new Intl.DateTimeFormat("es-DO", {
      timeZone: TZ,
      day: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

/* ==========================================================
   Hero — subtítulo (lema)
========================================================== */

function HeroTagline({ className }: { className?: string }) {
  return (
    <p className={className}>
      Salir nunca había sido tan fácil.{" "}
      <span className="font-semibold text-[#D4C4F0] [text-shadow:0_0_22px_rgba(155,127,202,0.45)]">
        Hasta ahora.
      </span>
    </p>
  );
}

const UPCOMING_GRADIENTS = [
  "from-[#9B7FCA] via-[#4A3970] to-[#111118]",
  "from-[#B39CD8] via-[#5F4688] to-[#111118]",
  "from-violet-600 via-purple-900 to-[#111118]",
  "from-fuchsia-600 via-purple-800 to-[#111118]",
  "from-purple-600 via-indigo-900 to-[#111118]",
  "from-[#C6B3E4] via-[#7B5EA7] to-[#111118]",
  "from-indigo-600 via-violet-900 to-[#111118]",
  "from-[#7B5EA7] via-[#3A2D58] to-[#111118]",
];

// Clases Tailwind predefinidas (evita generar utilities dinámicas)
const STAGGER_CLASSES = [
  "md:translate-y-0",
  "md:translate-y-12",
  "md:translate-y-4",
  "md:translate-y-[72px]",
  "md:translate-y-2",
  "md:translate-y-14",
  "md:translate-y-8",
  "md:translate-y-20",
  "md:translate-y-6",
  "md:translate-y-[68px]",
];

/* ==========================================================
   Partículas (sparkles) estáticas pero estables (useMemo)
========================================================== */

type Particle = {
  left: number;
  top: number;
  size: number;
  opacity: number;
  delay: number;
};

function generateParticles(count: number, seed: number): Particle[] {
  let s = seed >>> 0;
  const rand = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    // Concentración ligera en la parte alta (cielo iluminado) pero sin dejar
    // zonas vacías: top se calcula con curva suave.
    const tRaw = rand();
    const top = Math.pow(tRaw, 1.25) * 96;
    const left = rand() * 100;
    const size = 1 + rand() * 2.6;
    // Las estrellas altas brillan más; las bajas se difuminan
    const brightness = 1 - top / 140;
    out.push({
      left,
      top,
      size,
      opacity: Math.max(0.22, (0.35 + rand() * 0.55) * brightness),
      delay: rand() * 5,
    });
  }
  return out;
}

function Sparkles() {
  const particles = useMemo(() => generateParticles(95, 42), []);
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white gz-sparkle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 4}px rgba(200, 180, 240, 0.75)`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ==========================================================
   Estrellas fugaces (solo CSS)
========================================================== */

function ShootingStars() {
  // Micro-meteoros: trazos cortos y tenues que aparecen en distintas zonas del
  // cielo, viven un segundo y se apagan. Se mezclan con las estrellas fijas.
  return (
    <div className="pointer-events-none absolute inset-0 z-[4]" aria-hidden>
      <span className="gz-shoot-track gz-shoot-track--1">
        <span className="gz-shoot-streak" />
      </span>
      <span className="gz-shoot-track gz-shoot-track--2">
        <span className="gz-shoot-streak" />
      </span>
      <span className="gz-shoot-track gz-shoot-track--3">
        <span className="gz-shoot-streak" />
      </span>
      <span className="gz-shoot-track gz-shoot-track--4">
        <span className="gz-shoot-streak" />
      </span>
      <span className="gz-shoot-track gz-shoot-track--5">
        <span className="gz-shoot-streak" />
      </span>
      <span className="gz-shoot-track gz-shoot-track--6">
        <span className="gz-shoot-streak" />
      </span>
    </div>
  );
}

/* ==========================================================
   Hero desktop (100vh + spotlight + fila de 5 cards)
========================================================== */

function DesktopHero({ fanEvents }: { fanEvents: LandingEvent[] }) {
  const cards = fanEvents.slice(0, 5);

  return (
    <section
      className="relative hidden min-h-screen w-full overflow-hidden bg-[#0A0A0F] md:block"
      aria-label="Inicio"
    >
      {/* Cielo iluminado: luz amplia desde arriba que se desvanece hacia abajo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 130% 75% at 50% -10%, rgba(176, 146, 224, 0.55) 0%, rgba(155, 127, 202, 0.35) 18%, rgba(123, 94, 167, 0.22) 32%, rgba(59, 42, 97, 0.12) 48%, rgba(10, 10, 15, 0) 68%)",
        }}
      />
      {/* Hotspot superior central más intenso */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 0%, rgba(200, 175, 235, 0.35) 0%, rgba(155, 127, 202, 0.18) 35%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />
      {/* Bruma lateral suave (asimétrica, sin crear horizonte) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 55% 40% at 18% 8%, rgba(155, 127, 202, 0.22) 0%, transparent 60%), radial-gradient(ellipse 45% 35% at 82% 5%, rgba(179, 156, 216, 0.18) 0%, transparent 60%)",
          mixBlendMode: "screen",
        }}
      />

      <Sparkles />
      <ShootingStars />

      <div className="relative z-10 flex min-h-screen flex-col items-center pt-28">
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <h1
            className="max-w-5xl text-[clamp(44px,6vw,82px)] font-semibold leading-[1.02] tracking-[-0.025em] text-white"
            style={{ textShadow: "0 2px 40px rgba(155,127,202,0.25)" }}
          >
            Your night
            <br />
            <span className="bg-gradient-to-br from-[#E2D4F5] via-[#C6B3E4] to-[#9B7FCA] bg-clip-text italic text-transparent">
              starts here.
            </span>
          </h1>
          <HeroTagline className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/70" />
        </div>

        <div
          className="relative z-10 mt-8 flex w-full justify-center px-6 pb-24"
          style={{ perspective: "1600px" }}
        >
          {cards.length === 0 ? (
            <div className="w-full max-w-[860px] rounded-2xl border border-white/10 bg-white/5 px-8 py-10 text-center">
              <p className="text-lg font-semibold text-white">Aún no hay eventos publicados</p>
              <p className="mt-2 text-sm text-white/65">
                Pronto verás aquí los próximos eventos en tiempo real.
              </p>
              <Link
                href="/eventos"
                className="mt-5 inline-flex rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ver cartelera
              </Link>
            </div>
          ) : (
            <div className="flex w-full max-w-[1280px] items-end justify-center gap-4 xl:gap-6">
              {cards.map((ev, i) => {
                // Distribución en arco: la del centro arriba, las laterales se
                // desvanecen hacia abajo con leve inclinación y menor escala.
                const middle = (cards.length - 1) / 2;
                const offset = i - middle; // -2, -1, 0, 1, 2
                const absOff = Math.abs(offset);
                const y = absOff * 14; // la del medio a 0, laterales más abajo
                const rotY = -offset * 8; // Y-rotation hacia el centro
                const rotZ = offset * 2.2; // leve inclinación plana
                const scale = 1 - absOff * 0.055;
                const z = 10 - absOff;
                // Animaciones: entrada en cascada + flotación sutil desfasada
                const floatDelay = 0.35 + i * 0.55;
                const enterDelay = 0.15 + i * 0.12;
                return (
                  <div
                    key={ev.id}
                    className="gz-fan-slot w-[200px] shrink-0 xl:w-[212px]"
                    style={{
                      transform: `translateY(${y}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
                      transformStyle: "preserve-3d",
                      transformOrigin: "50% 50%",
                      zIndex: z,
                      animationDelay: `${enterDelay}s`,
                    }}
                  >
                    <div
                      className="gz-fan-float"
                      style={{ animationDelay: `${floatDelay}s` }}
                    >
                      <EventPosterCard
                        event={{
                          id: ev.id,
                          slug: ev.slug,
                          title: ev.title,
                          startAt: ev.startAt,
                          endAt: ev.endAt ?? null,
                          city: ev.city ?? null,
                          venueName: ev.venueName ?? null,
                          image: ev.image ?? null,
                          serverFooterTheme: ev.serverFooterTheme ?? null,
                        }}
                        index={i}
                        size="sm"
                        variant="flush"
                        className="!max-w-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================
   Hero móvil: mismo lema + mismos 5 destacados que escritorio
   (tipografía y cards en proporción a pantallas pequeñas)
========================================================== */

function MobileHero({ fanEvents }: { fanEvents: LandingEvent[] }) {
  const cards = fanEvents.slice(0, 5);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0A0A0F] pb-8 pt-[72px] md:hidden"
      aria-label="Inicio"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 140% 70% at 50% -15%, rgba(176, 146, 224, 0.45) 0%, rgba(123, 94, 167, 0.2) 28%, rgba(59, 42, 97, 0.1) 48%, rgba(10, 10, 15, 0) 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%]"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(200, 175, 235, 0.28) 0%, transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      <Sparkles />
      <ShootingStars />

      <div className="relative z-10 mx-auto max-w-lg px-4 pt-2">
        <h1
          className="text-center text-[clamp(22px,6.2vw,30px)] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[clamp(24px,5.8vw,32px)]"
          style={{ textShadow: "0 2px 28px rgba(155,127,202,0.22)" }}
        >
          Your night
          <br />
          <span className="bg-gradient-to-br from-[#E2D4F5] via-[#C6B3E4] to-[#9B7FCA] bg-clip-text italic text-transparent">
            starts here.
          </span>
        </h1>
        <HeroTagline className="mx-auto mt-3 max-w-sm text-center text-[12px] leading-relaxed text-white/70 sm:text-[13px]" />
      </div>

      {/* Misma fila de 5 eventos que en escritorio: scroll horizontal, ancho proporcional */}
      <div className="relative z-10 mt-6 min-w-0 bg-transparent">
        {cards.length === 0 ? (
          <div className="mx-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="text-sm font-semibold text-white">Aún no hay eventos publicados</p>
            <p className="mt-1 text-xs text-white/65">Cuando publiques eventos, aparecerán aquí.</p>
            <Link
              href="/eventos"
              className="mt-3 inline-flex rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Ver cartelera
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 px-4 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Destacados
            </p>
            <div className="gz-mobile-fan-scroll gz-scroll-strip flex touch-pan-x snap-x snap-mandatory gap-2.5 overflow-x-auto border-0 bg-transparent px-4 pb-2 shadow-none outline-none ring-0 sm:gap-3">
              {cards.map((ev, i) => {
                const yNudge = [0, 6, 2, 8, 4][i % 5];
                const rot = [-1.2, -0.6, 0, 0.6, 1.2][i % 5];
                return (
                  <div
                    key={ev.id}
                    className="gz-mobile-fan-item w-[min(46vw,175px)] shrink-0 snap-center sm:w-[min(42vw,190px)]"
                    style={{
                      transform: `translateY(${yNudge}px) rotate(${rot}deg)`,
                    }}
                  >
                    <EventPosterCard
                      event={{
                        id: ev.id,
                        slug: ev.slug,
                        title: ev.title,
                        startAt: ev.startAt,
                        city: ev.city ?? null,
                        venueName: ev.venueName ?? null,
                        image: ev.image ?? null,
                        serverFooterTheme: ev.serverFooterTheme ?? null,
                      }}
                      index={i}
                      size="sm"
                      variant="flush"
                      className="!max-w-none w-full"
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ==========================================================
   Card para la sección "Eventos próximos"
========================================================== */

function UpcomingEventCard({
  event,
  index,
}: {
  event: LandingEvent;
  index: number;
}) {
  const [errored, setErrored] = useState(false);
  const showImage = Boolean(event.image) && !errored;
  const footerTheme = useEventImageFooterColor(
    event.image,
    showImage,
    event.serverFooterTheme ?? undefined
  );
  const gradient = UPCOMING_GRADIENTS[index % UPCOMING_GRADIENTS.length];
  const staggerClass = STAGGER_CLASSES[index % STAGGER_CLASSES.length];

  return (
    <div
      className={`w-full min-w-0 self-start md:w-[240px] md:shrink-0 md:min-w-[240px] ${staggerClass}`}
    >
      <Link
        href={`/e/${event.slug}`}
        className="group block w-full max-w-full overflow-hidden rounded-[2rem] border-2 border-white bg-[#2a2a32] shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition-transform duration-300 hover:-translate-y-1"
        aria-label={event.title}
      >
        <div
          className="relative w-full overflow-hidden bg-[#12121a]"
          style={{ aspectRatio: "3 / 4" }}
        >
          {showImage ? (
            <Image
              src={event.image!}
              alt={event.title}
              fill
              sizes="(max-width: 767px) 48vw, 240px"
              className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
              onError={() => setErrored(true)}
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
              aria-hidden
            />
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] bg-gradient-to-t from-black/30 via-black/5 to-transparent"
          />
        </div>

        <div className="px-3 pb-1 pt-2">
          <h3 className="line-clamp-2 text-[0.95rem] font-bold leading-tight tracking-tight text-white">
            {event.title}
          </h3>
          <p className="mt-1 text-[12px] text-white/50">
            {formatLongDate(event.startAt)}
            <span className="mx-1.5 text-white/25">|</span>
            {formatTime(event.startAt)}
          </p>
        </div>

        <div
          className={`mx-2 mb-2 mt-0.5 flex min-h-[4.25rem] items-stretch gap-2.5 rounded-2xl px-2.5 py-2.5 transition-[background-color,background,box-shadow] duration-500 ${
            footerTheme.footerOnLight && footerTheme.footerColorReady
              ? "shadow-[inset_0_1px_0_rgba(0,0,0,0.07)]"
              : "shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
          }`}
          style={
            showImage &&
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
            className="relative flex h-12 w-[3.1rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-[10px] border border-white/[0.12] py-0.5 text-center transition-[background-color] duration-500"
            style={
              showImage && event.image
                ? {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.34), rgba(0,0,0,0.34)), url(${event.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : { backgroundColor: footerTheme.badgeBg }
            }
          >
            <span
              className="relative z-[1] text-[0.5rem] font-bold uppercase tracking-[0.12em]"
              style={
                showImage && event.image
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
              {formatMonthAbbr(event.startAt)}
            </span>
            <span
              className="relative z-[1] text-[1.1rem] font-extrabold leading-none"
              style={
                showImage && event.image
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
              {formatDay(event.startAt)}
            </span>
          </div>
          <div className="min-w-0 flex-1 self-center">
            <p
              className="truncate text-[0.8rem] font-extrabold"
              style={{
                color: footerTheme.footerTextPrimary,
                textShadow: footerTheme.footerTextShadow,
              }}
            >
              {event.venueName || event.city}
            </p>
            <p
              className="mt-0.5 truncate text-[0.7rem] font-semibold"
              style={{
                color: footerTheme.footerTextSecondary,
                textShadow: footerTheme.footerTextShadowSoft,
              }}
            >
              {event.city}
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}

/* ==========================================================
   Sección "Eventos próximos" (scroll horizontal + stagger)
========================================================== */

function UpcomingEventsSection({ events }: { events: LandingEvent[] }) {
  return (
    <section
      className="relative bg-[#0A0A0F] pb-14 pt-14 md:pb-20 md:pt-20"
      aria-label="Eventos próximos"
    >
      {/* Halo sutil arriba para mantener la coherencia con el hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(155, 127, 202, 0.08) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="px-4 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-1.5 text-[13px] text-white/70">
            <IconCalendar className="h-3.5 w-3.5" />
            Eventos
          </span>
          <h2 className="mx-auto mt-5 max-w-3xl text-[clamp(28px,5.2vw,56px)] font-bold leading-[1.12] tracking-tight text-white">
            Eventos que merecen ser <span className="text-[#9B7FCA]">gozados</span>
          </h2>
        </div>

        {/* Móvil: 2 columnas + todos los eventos; md+: carrusel horizontal */}
        {events.length === 0 ? (
          <div className="mt-10 px-4 pb-10 md:mt-14 md:pb-28">
            <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <p className="text-lg font-semibold text-white">No hay eventos próximos por ahora</p>
              <p className="mt-2 text-sm text-white/65">
                Cuando publiques nuevos eventos aparecerán automáticamente aquí.
              </p>
              <Link
                href="/eventos"
                className="mt-5 inline-flex rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Ir a cartelera
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="gz-events-scroll gz-scroll-strip mt-10 grid touch-pan-x grid-cols-2 items-start gap-x-[clamp(0.5rem,3.2vw,0.875rem)] gap-y-6 border-0 bg-transparent px-4 pb-10 shadow-none outline-none ring-0 md:mt-14 md:flex md:grid-cols-none md:flex-row md:items-start md:gap-6 md:overflow-x-auto md:pb-28 md:pl-[max(32px,calc((100vw-1360px)/2))] md:pr-[max(32px,calc((100vw-1360px)/2))]"
          >
            {events.map((ev, i) => (
              <UpcomingEventCard key={ev.id} event={ev} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ==========================================================
   Page root (props desde el server)
========================================================== */

export type GozaloLandingPremiumProps = {
  featuredEvents: LandingEvent[];
  upcomingEvents: LandingEvent[];
};

export function GozaloLandingPremium({
  featuredEvents,
  upcomingEvents,
}: GozaloLandingPremiumProps) {
  const fanEvents =
    featuredEvents.length > 0 ? featuredEvents : upcomingEvents.slice(0, 5);
  const upcomingForSection = upcomingEvents;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0A0A0F] text-white antialiased">
      <DesktopHero fanEvents={fanEvents} />
      <MobileHero fanEvents={fanEvents} />
      <UpcomingEventsSection events={upcomingForSection} />

      <style jsx global>{`
        @keyframes gzTwinkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.85);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.15);
          }
        }
        .gz-sparkle {
          animation: gzTwinkle 4.2s ease-in-out infinite;
          will-change: opacity, transform;
        }

        /* ========== Fan de cards del hero ========== */
        .gz-fan-slot {
          animation: gzFanIn 0.95s cubic-bezier(0.22, 0.8, 0.32, 1) both;
          transition: transform 500ms cubic-bezier(0.22, 0.8, 0.32, 1);
          will-change: transform, opacity;
        }
        /* Al pasar el cursor sobre un slot, se endereza y sube un poco */
        .gz-fan-slot:hover {
          transform: translateY(-6px) rotateY(0deg) rotateZ(0deg) scale(1.04)
            !important;
          z-index: 30 !important;
        }
        .gz-fan-float {
          animation: gzFanFloat 5.5s ease-in-out infinite;
          will-change: transform;
        }
        @keyframes gzFanIn {
          0% {
            opacity: 0;
            transform: translateY(40px) rotateY(0deg) rotateZ(0deg) scale(0.9);
          }
          100% {
            opacity: 1;
          }
        }
        /* El float vive sobre un hijo, no pisa el transform del slot. */
        @keyframes gzFanFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .gz-fan-slot,
          .gz-fan-float {
            animation: none !important;
            opacity: 1 !important;
          }
        }

        /* ========== Estrellas fugaces (micro-meteoros) ========== */
        .gz-shoot-track {
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 0;
          transform-origin: 0 50%;
          pointer-events: none;
        }
        .gz-shoot-streak {
          position: absolute;
          left: 0;
          top: 0;
          display: block;
          width: 3.2vw;
          max-width: 52px;
          height: 1px;
          border-radius: 999px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(220, 205, 245, 0.35) 55%,
            rgba(235, 225, 255, 0.75) 100%
          );
          filter: drop-shadow(0 0 2px rgba(210, 190, 255, 0.55));
          opacity: 0;
          transform: translateX(0);
          will-change: transform, opacity;
          animation: gzShoot 14s ease-out infinite;
        }
        .gz-shoot-streak::after {
          content: "";
          position: absolute;
          right: 0;
          top: 50%;
          width: 2px;
          height: 2px;
          margin-top: -1px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 0 4px 1px rgba(220, 200, 255, 0.55);
        }
        /* Viven sólo un instante, aparecen, se mueven poco y se apagan. */
        @keyframes gzShoot {
          0% {
            transform: translateX(0);
            opacity: 0;
          }
          3% {
            opacity: 0;
          }
          6% {
            opacity: 0.85;
          }
          12% {
            opacity: 0.9;
          }
          18% {
            opacity: 0;
          }
          100% {
            transform: translateX(14vw);
            opacity: 0;
          }
        }
        .gz-shoot-track--1 {
          top: 12%;
          left: 22vw;
          transform: rotate(14deg);
        }
        .gz-shoot-track--1 .gz-shoot-streak {
          animation-delay: 0.8s;
          animation-duration: 13s;
        }
        .gz-shoot-track--2 {
          top: 7%;
          left: 68vw;
          transform: rotate(22deg);
        }
        .gz-shoot-track--2 .gz-shoot-streak {
          animation-delay: 4.2s;
          animation-duration: 16s;
        }
        .gz-shoot-track--3 {
          top: 28%;
          left: 8vw;
          transform: rotate(10deg);
        }
        .gz-shoot-track--3 .gz-shoot-streak {
          animation-delay: 7.5s;
          animation-duration: 15s;
        }
        .gz-shoot-track--4 {
          top: 38%;
          left: 78vw;
          transform: rotate(-8deg);
        }
        .gz-shoot-track--4 .gz-shoot-streak {
          animation-delay: 11s;
          animation-duration: 17s;
        }
        .gz-shoot-track--5 {
          top: 52%;
          left: 40vw;
          transform: rotate(18deg);
        }
        .gz-shoot-track--5 .gz-shoot-streak {
          animation-delay: 14.5s;
          animation-duration: 18s;
        }
        .gz-shoot-track--6 {
          top: 62%;
          left: 14vw;
          transform: rotate(6deg);
        }
        .gz-shoot-track--6 .gz-shoot-streak {
          animation-delay: 19s;
          animation-duration: 20s;
        }

        /* Carruseles horizontales: sin caja visible, solo el scroll táctil */
        .gz-scroll-strip {
          background-color: transparent !important;
          background-image: none;
          box-shadow: none !important;
          border: none !important;
          -webkit-tap-highlight-color: transparent;
        }
        /* Oculta la scrollbar del carrusel horizontal */
        .gz-events-scroll::-webkit-scrollbar,
        .gz-mobile-fan-scroll::-webkit-scrollbar {
          display: none;
        }
        .gz-events-scroll,
        .gz-mobile-fan-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
        }
        @media (prefers-reduced-motion: reduce) {
          .gz-sparkle,
          .gz-shoot-streak {
            animation: none;
          }
          .gz-shoot-streak {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
