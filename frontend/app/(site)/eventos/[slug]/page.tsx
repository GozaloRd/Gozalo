import type { ComponentProps } from "react";
import { notFound } from "next/navigation";
import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";
import { precomputeServerFooterThemes } from "@/lib/serverEventFooterColor";
import { fetchPublicEventBySlug } from "@/lib/publicApi";
import { EventDetailClient } from "./EventDetailClient";

type EventDetail = ComponentProps<typeof EventDetailClient>["event"];

function pickCoverForTheme(ev: EventDetail): string | null {
  const c = ev.coverImageUrl?.trim();
  if (c) return c;
  const first = ev.images?.find((u) => typeof u === "string" && u.trim().length > 0);
  if (first) return first;
  if (ev.venue?.logo?.trim()) return ev.venue.logo;
  if (ev.venue?.coverImageUrl?.trim()) return ev.venue.coverImageUrl;
  return null;
}

async function loadEvent(slug: string): Promise<EventDetail | null> {
  const event = await fetchPublicEventBySlug(slug);
  if (!event?.venue) return null;
  return event as EventDetail;
}

export default async function EventDetailPage({ params }: { params: { slug: string } }) {
  const event = await loadEvent(params.slug);
  if (!event) notFound();

  let serverFooterTheme: EventImageFooterTheme | null = null;
  const img = pickCoverForTheme(event);
  if (img && process.env.NODE_ENV !== "development") {
    const themes = await precomputeServerFooterThemes(
      [{ id: event.id, image: img }],
      { maxUniqueImages: 1, concurrency: 1 }
    );
    serverFooterTheme = themes[event.id] ?? null;
  }

  return (
    <EventDetailClient
      event={event}
      serverFooterTheme={serverFooterTheme}
    />
  );
}
