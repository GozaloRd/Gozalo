import {
  GozaloLandingPremium,
  type LandingEvent,
} from "@/components/site/GozaloLandingPremium";
import {
  fetchPublicEvents,
  type PublicEventListItem,
} from "@/lib/publicApi";
import { precomputeServerFooterThemes } from "@/lib/serverEventFooterColor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function toLandingEvent(ev: PublicEventListItem): LandingEvent {
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
    category: ev.category || "Evento",
    city: ev.city || ev.venue?.city || "",
    startAt: ev.startAt,
    endAt: ev.endAt,
    venueName: ev.venue?.name ?? null,
    image,
  };
}

export default async function HomePage() {
  let apiEvents: PublicEventListItem[] = [];
  try {
    const res = await fetchPublicEvents({
      status: "published",
      page: 1,
      pageSize: 200,
    });
    apiEvents = res.data;
  } catch {
    apiEvents = [];
  }

  const merged = apiEvents.filter(
    (e) => e.publicado !== false,
  );

  const now = Date.now();

  // El API ya devuelve solo eventos con endAt >= ahora (vigentes o futuros).
  // No filtrar por startAt aquí: si no, se ocultan eventos multi‑día ya iniciados
  // y otros que el backend sí considera activos.
  const upcoming = merged
    .filter((e) => {
      const end = new Date(e.endAt).getTime();
      return Number.isFinite(end) && end >= now;
    })
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    )
    .map(toLandingEvent);

  // Featured: destacados primero; si no hay, usar los primeros upcoming
  const featuredFromApi = merged
    .filter((e) => e.featured === true || e.destacado === true)
    .sort(
      (a, b) =>
        new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    )
    .slice(0, 5)
    .map(toLandingEvent);

  const featuredEvents =
    featuredFromApi.length > 0 ? featuredFromApi : upcoming.slice(0, 5);

  const uniqueForFooter = Array.from(
    new Map(
      [...upcoming, ...featuredEvents].map((e) => [e.id, e] as const),
    ).values(),
  );
  const serverFooterThemes = await precomputeServerFooterThemes(
    uniqueForFooter.map((e) => ({ id: e.id, image: e.image })),
  );
  const withServerFooter = (e: LandingEvent): LandingEvent => ({
    ...e,
    serverFooterTheme: serverFooterThemes[e.id] ?? null,
  });

  return (
    <GozaloLandingPremium
      featuredEvents={featuredEvents.map(withServerFooter)}
      upcomingEvents={upcoming.map(withServerFooter)}
    />
  );
}
