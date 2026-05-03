import Link from "next/link";
import { CITIES_RD, MUSIC_CATEGORIES } from "@/lib/constants";
import { fetchPublicEvents, type PublicEventListItem } from "@/lib/publicApi";
import {
  EventPosterCard,
  type EventPosterCardData,
} from "@/components/site/EventPosterCard";

/* ==========================================================
   Iconos
========================================================== */

function IconSparkles({ className = "h-4 w-4" }: { className?: string }) {
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
      <path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M3 12h2M19 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function IconClose({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/* ==========================================================
   Mapeo de periodo → fecha "desde"
========================================================== */

type PeriodKey = "" | "week" | "month" | "3months" | "year";

const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "", label: "Todo" },
  { key: "week", label: "Última semana" },
  { key: "month", label: "Último mes" },
  { key: "3months", label: "Últimos 3 meses" },
  { key: "year", label: "Este año" },
];

function periodToFrom(period: PeriodKey): string | undefined {
  const now = new Date();
  switch (period) {
    case "week":
      return new Date(now.getTime() - 7 * 86400000).toISOString();
    case "month":
      return new Date(now.getTime() - 30 * 86400000).toISOString();
    case "3months":
      return new Date(now.getTime() - 90 * 86400000).toISOString();
    case "year":
      return new Date(now.getFullYear(), 0, 1).toISOString();
    default:
      return undefined;
  }
}

function isValidPeriod(v: string): v is PeriodKey {
  return ["", "week", "month", "3months", "year"].includes(v);
}

function toCardData(ev: PublicEventListItem): EventPosterCardData {
  const image =
    (ev.coverImageUrl && ev.coverImageUrl.trim().length > 0
      ? ev.coverImageUrl
      : null) ??
    (ev.images && ev.images.length > 0 ? ev.images[0] : null) ??
    ev.venue?.coverImageUrl ??
    ev.venue?.logo ??
    null;
  return {
    id: ev.id,
    slug: ev.slug,
    title: ev.title,
    startAt: ev.startAt,
    endAt: ev.endAt,
    city: ev.city || ev.venue?.city || null,
    venueName: ev.venue?.name ?? null,
    image,
  };
}

/* ==========================================================
   Helpers para construir querystrings conservando filtros
========================================================== */

function buildHref(
  base: string,
  current: {
    period: PeriodKey;
    city: string;
    category: string;
    venueId: string;
  },
  override: Partial<{ period: PeriodKey; city: string; category: string; venueId: string }>,
): string {
  const merged = { ...current, ...override };
  const params = new URLSearchParams();
  if (merged.period) params.set("period", merged.period);
  if (merged.city) params.set("city", merged.city);
  if (merged.category) params.set("category", merged.category);
  if (merged.venueId) params.set("venueId", merged.venueId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export default async function CollagePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const city = typeof searchParams.city === "string" ? searchParams.city : "";
  const category =
    typeof searchParams.category === "string" ? searchParams.category : "";
  const rawPeriod =
    typeof searchParams.period === "string" ? searchParams.period : "";
  const period: PeriodKey = isValidPeriod(rawPeriod) ? rawPeriod : "";
  const venueId =
    typeof searchParams.venueId === "string" ? searchParams.venueId.trim() : "";

  const resp = await fetchPublicEvents({
    page: 1,
    pageSize: 100,
    past: true,
    from: periodToFrom(period),
    city: city || undefined,
    category: category || undefined,
    venueId: venueId || undefined,
    status: "published",
  });

  const list = resp.data.filter((e) => e.publicado !== false);
  const activeCount =
    (period ? 1 : 0) + (city ? 1 : 0) + (category ? 1 : 0) + (venueId ? 1 : 0);

  const current = { period, city, category, venueId };
  const venueNameFromList = list[0]?.venue?.name?.trim() || null;

  return (
    <div className="relative min-h-screen bg-[#0A0A0F] text-white">
      {/* Glow superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(155,127,202,0.18), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-12 md:px-6 md:pt-16">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#D4C2EE]">
            <IconSparkles className="h-3.5 w-3.5" />
            Collage
          </span>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
            Los mejores{" "}
            <span className="text-[#9B7FCA]">momentos vividos</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-white/55 md:text-base">
            {venueId ? (
              <>
                Mostrando recuerdos de{" "}
                <span className="text-[#D4C2EE]">{venueNameFromList || "tu local de interés"}</span>.{" "}
                <Link
                  href={buildHref("/collage", current, { venueId: "" })}
                  className="font-medium text-[#9B7FCA] underline decoration-[#9B7FCA]/50 underline-offset-2 hover:text-white"
                >
                  Ver el collage general
                </Link>
              </>
            ) : (
              <>
                Fotos de eventos pasados, ambiente y gente en los locales que
                confían en Gózalo. Una forma rápida de ver lo que se vive antes de
                ir.
              </>
            )}
          </p>
        </div>

        {/* Panel de filtros */}
        <div className="mx-auto mt-10 w-full max-w-4xl rounded-3xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur md:p-6">
          {/* Chips de periodo */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Cuándo
              </span>
              {activeCount > 0 && (
                <Link
                  href="/collage"
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                >
                  <IconClose />
                  Limpiar ({activeCount})
                </Link>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((opt) => {
                const isActive = opt.key === period;
                return (
                  <Link
                    key={opt.key || "all"}
                    href={buildHref("/collage", current, {
                      period: opt.key,
                    })}
                    className={
                      isActive
                        ? "inline-flex items-center rounded-full border border-[#9B7FCA] bg-gradient-to-br from-[#9B7FCA] to-[#7B5EA7] px-4 py-1.5 text-[13px] font-semibold text-white shadow-[0_6px_18px_rgba(155,127,202,0.35)]"
                        : "inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.03] px-4 py-1.5 text-[13px] font-medium text-white/65 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white"
                    }
                  >
                    {opt.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Separador fino */}
          <div aria-hidden className="my-5 h-px bg-white/[0.06]" />

          {/* Ciudad + Categoría */}
          <form
            method="get"
            className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            {/* Mantener el periodo y el local al submit de este form */}
            {period && <input type="hidden" name="period" value={period} />}
            {venueId && <input type="hidden" name="venueId" value={venueId} />}

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Ciudad
              </label>
              <select
                name="city"
                defaultValue={city}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white focus:border-[#9B7FCA]/60 focus:outline-none"
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
              <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                Categoría
              </label>
              <select
                name="category"
                defaultValue={category}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white focus:border-[#9B7FCA]/60 focus:outline-none"
              >
                <option value="">Todas</option>
                {MUSIC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-[42px] rounded-xl bg-gradient-to-br from-[#9B7FCA] to-[#7B5EA7] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(155,127,202,0.35)] transition-all hover:shadow-[0_10px_32px_rgba(155,127,202,0.5)]"
            >
              Aplicar
            </button>
          </form>

          {/* Chips de filtros activos (local / ciudad / categoría) */}
          {(venueId || city || category) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
              <span className="text-white/40">Activos:</span>
              {venueId && (
                <Link
                  href={buildHref("/collage", current, { venueId: "" })}
                  className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 px-3 py-1 font-medium text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
                  title="Quitar filtro de local"
                >
                  <span className="truncate">{venueNameFromList || "Local"}</span>
                  <IconClose />
                </Link>
              )}
              {city && (
                <Link
                  href={buildHref("/collage", current, { city: "" })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 px-3 py-1 font-medium text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
                >
                  {city}
                  <IconClose />
                </Link>
              )}
              {category && (
                <Link
                  href={buildHref("/collage", current, { category: "" })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 px-3 py-1 font-medium text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
                >
                  {category}
                  <IconClose />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Grid */}
        {list.length === 0 ? (
          <div className="mt-16 rounded-3xl border border-dashed border-white/[0.08] bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-lg font-semibold text-white/80">
              Aún no hay recuerdos con estos filtros
            </p>
            <p className="mt-2 text-sm text-white/40">
              Prueba con otro período, ciudad o categoría.
            </p>
            <Link
              href="/collage"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-4 py-2 text-sm font-semibold text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
            >
              Ver todo el collage
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-10 text-xs uppercase tracking-[0.15em] text-white/40">
              {list.length} recuerdo{list.length === 1 ? "" : "s"}
            </p>

            {/* Móvil: 2 col · tablet/escritorio estrecho: 3 col (evita 2 tarjetas gigantes) · xl: 4 col */}
            <div className="mt-6 grid grid-cols-2 items-start gap-x-[clamp(0.5rem,3.2vw,0.875rem)] gap-y-6 md:grid-cols-3 md:gap-x-5 md:gap-y-8 lg:gap-x-6 lg:gap-y-10 xl:grid-cols-4">
              {list.map((ev, i) => (
                <div key={ev.id} className="min-w-0">
                  <EventPosterCard
                    event={toCardData(ev)}
                    index={i}
                    className="max-md:!max-w-none max-md:w-full"
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
