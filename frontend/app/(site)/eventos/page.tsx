import Link from "next/link";
import { CITIES_RD, MUSIC_CATEGORIES } from "@/lib/constants";
import { fetchPublicEvents, type PublicEventListItem } from "@/lib/publicApi";
import {
  EventPosterCard,
  type EventPosterCardData,
} from "@/components/site/EventPosterCard";
import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";
import { precomputeServerFooterThemes } from "@/lib/serverEventFooterColor";

function pickEventImage(ev: PublicEventListItem): string | null {
  return (
    (ev.coverImageUrl && ev.coverImageUrl.trim().length > 0
      ? ev.coverImageUrl
      : null) ??
    (ev.images && ev.images.length > 0 ? ev.images[0] : null) ??
    ev.venue?.coverImageUrl ??
    ev.venue?.logo ??
    null
  );
}

function toCardData(
  ev: PublicEventListItem,
  serverFooterTheme?: EventImageFooterTheme | null,
): EventPosterCardData {
  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    startAt: ev.startAt,
    endAt: ev.endAt,
    city: ev.city || ev.venue?.city || null,
    venueName: ev.venue?.name ?? null,
    image: pickEventImage(ev),
    serverFooterTheme: serverFooterTheme ?? null,
  };
}

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

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const city = typeof searchParams.city === "string" ? searchParams.city : "";
  const category =
    typeof searchParams.category === "string" ? searchParams.category : "";
  const from = typeof searchParams.from === "string" ? searchParams.from : "";

  const resp = await fetchPublicEvents({
    page: 1,
    pageSize: 200,
    city: city || undefined,
    category: category || undefined,
    from: from || undefined,
    status: "published",
  });

  const list = resp.data.filter((e) => e.publicado !== false);

  const serverFooterThemes = await precomputeServerFooterThemes(
    list.map((ev) => ({ id: ev.id, image: pickEventImage(ev) })),
  );

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      {/* Glow superior morado (coherente con el home) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(155,127,202,0.15), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-12 md:px-6 md:pt-16">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#D4C2EE]">
            <IconCalendar className="h-3.5 w-3.5" />
            Eventos disponibles
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
            Todos los{" "}
            <span className="text-[#9B7FCA]">eventos próximos</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/55 md:text-base">
            Descubre lo que los mejores locales están preparando para ti.
            Filtra por ciudad, música o fecha y reserva en segundos.
          </p>
        </div>

        {/* Filtros */}
        <form
          method="get"
          className="mx-auto mt-10 grid w-full max-w-4xl gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur md:grid-cols-[1fr_1fr_1fr_auto]"
        >
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Ciudad
            </label>
            <select
              name="city"
              defaultValue={city}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white focus:border-[#9B7FCA]/60 focus:outline-none"
            >
              <option value="">Todas</option>
              {CITIES_RD.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Categoría
            </label>
            <select
              name="category"
              defaultValue={category}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white focus:border-[#9B7FCA]/60 focus:outline-none"
            >
              <option value="">Todas</option>
              {MUSIC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
              Desde
            </label>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white focus:border-[#9B7FCA]/60 focus:outline-none [color-scheme:dark]"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-br from-[#9B7FCA] to-[#7B5EA7] px-5 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(155,127,202,0.35)] transition-all hover:shadow-[0_10px_32px_rgba(155,127,202,0.5)]"
            >
              Aplicar
            </button>
          </div>
        </form>

        {/* Grid */}
        {list.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-white/80">
              No hay eventos con estos filtros
            </p>
            <p className="mt-2 text-sm text-white/40">
              Prueba con otra ciudad, categoría o fecha distinta.
            </p>
            <Link
              href="/eventos"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-4 py-2 text-sm font-semibold text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
            >
              Limpiar filtros
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-10 text-xs uppercase tracking-[0.15em] text-white/40">
              {list.length} evento{list.length === 1 ? "" : "s"}
            </p>

            {/* Móvil: siempre 2 columnas; huecos fluidos según el ancho */}
            <div className="mt-6 grid grid-cols-2 items-start gap-x-[clamp(0.5rem,3.2vw,0.875rem)] gap-y-6 md:hidden">
              {list.map((ev, i) => (
                <div key={ev.id} className="min-w-0 self-start">
                  <EventPosterCard
                    event={toCardData(
                      ev,
                      serverFooterThemes[ev.id] ?? null,
                    )}
                    index={i}
                    className="!max-w-none w-full"
                  />
                </div>
              ))}
            </div>

            {/* Escritorio: desde md 3 columnas (mejor en ventana estrecha); xl 4 columnas */}
            <div className="mt-6 hidden items-start gap-x-5 gap-y-8 md:grid md:grid-cols-3 lg:gap-x-6 lg:gap-y-10 xl:grid-cols-4">
              {list.map((ev, i) => (
                <EventPosterCard
                  key={ev.id}
                  event={toCardData(
                    ev,
                    serverFooterThemes[ev.id] ?? null,
                  )}
                  index={i}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
