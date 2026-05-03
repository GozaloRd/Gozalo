import type { PublicEventDetail } from "@/lib/publicApi";

/**
 * Misma prioridad de imagen que en ficha pública (portada, galería, local).
 */
export function getEventCoverImageUrl(e: PublicEventDetail): string | null {
  const c = e.coverImageUrl?.trim();
  if (c) return c;
  const first = e.images?.find((u) => typeof u === "string" && u.trim().length > 0);
  if (first) return first;
  if (e.venue?.logo?.trim()) return e.venue.logo;
  if (e.venue?.coverImageUrl?.trim()) return e.venue.coverImageUrl;
  return null;
}
