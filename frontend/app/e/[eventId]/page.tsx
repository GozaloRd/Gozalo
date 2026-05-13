import { notFound } from "next/navigation";
import { EventPageMobile } from "@/components/public-event/EventPageMobile";
import type { PublicEvent } from "@/components/public-event/types";
import { fetchPublicEventById, fetchPublicEventBySlug } from "@/lib/publicApi";

function apiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

function absoluteMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return `${apiBase()}${url.startsWith("/") ? url : `/${url}`}`;
}

function mapEvent(raw: Awaited<ReturnType<typeof fetchPublicEventById>>): PublicEvent | null {
  if (!raw) return null;
  const tickets = (raw.ticketTypes ?? []).map((t) => ({
    id: String(t.id ?? t.name),
    name: t.name,
    description: t.description ?? undefined,
    price: Number(t.price || 0),
    available: Math.max(Number(t.quantityTotal ?? 0), 0),
    highDemand: Number(t.quantityTotal ?? 0) > 0 && Number(t.quantityTotal ?? 0) <= 25,
    includesFees: false,
  }));
  const tables = (raw.tables ?? []).map((table) => {
    const zone = String(table.zone ?? "").trim() || "General";
    return {
      id: table.id,
      zone,
      label: String(table.label ?? ""),
      name: table.zone ? `${table.zone} ${table.label}` : `Mesa ${table.label}`,
      description: `Capacidad ${table.capacity} personas`,
      minPrice: Number(table.minPrice || 0),
      colorDots: [],
      status: table.isAvailable === false || table.estado === "reservada" ? ("occupied" as const) : ("available" as const),
    };
  });
  const imageUrl = absoluteMediaUrl(raw.coverImageUrl ?? raw.images?.[0] ?? raw.venue?.coverImageUrl ?? raw.venue?.logo ?? null);
  const tableLayoutImageUrl = absoluteMediaUrl(raw.tableLayoutImageUrl ?? null);
  return {
    id: raw.id,
    name: raw.title,
    description: raw.description ?? undefined,
    date: raw.startAt,
    startTime: raw.startAt,
    endTime: raw.endAt,
    city: raw.city,
    country: raw.venue?.city ?? "",
    address: raw.venue?.address ?? raw.city,
    venueName: raw.venue?.name ?? "",
    imageUrl,
    tableLayoutImageUrl,
    ageRestriction: undefined,
    tags: raw.category ? [raw.category] : [],
    tickets,
    tables,
  };
}

export default async function PublicEventPage({ params }: { params: { eventId: string } }) {
  const rawEvent = (await fetchPublicEventById(params.eventId)) ?? (await fetchPublicEventBySlug(params.eventId));
  if (!rawEvent) notFound();
  const event = mapEvent(rawEvent);
  if (!event) notFound();
  return <EventPageMobile event={event} />;
}
