import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";
import { getEventCoverImageUrl } from "@/lib/eventCoverImage";
import { fetchPublicEventById } from "@/lib/publicApi";
import { precomputeServerFooterThemes } from "@/lib/serverEventFooterColor";
import { CheckoutClient } from "./CheckoutClient";

export default async function CheckoutPage({ params }: { params: { eventId: string } }) {
  const event = await fetchPublicEventById(params.eventId);
  let serverFooterTheme: EventImageFooterTheme | null = null;
  let initialCoverForTheme: string | null = null;
  if (event) {
    initialCoverForTheme = getEventCoverImageUrl(event);
    if (initialCoverForTheme) {
      const themes = await precomputeServerFooterThemes(
        [{ id: event.id, image: initialCoverForTheme }],
        { maxUniqueImages: 1, concurrency: 1 }
      );
      serverFooterTheme = themes[event.id] ?? null;
    }
  }

  return (
    <CheckoutClient
      eventId={params.eventId}
      initialCoverForTheme={initialCoverForTheme}
      serverFooterTheme={serverFooterTheme}
    />
  );
}
