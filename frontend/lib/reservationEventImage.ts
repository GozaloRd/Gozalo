import type { PublicEventDetail } from "@/lib/publicApi";

function pickUrl(u: unknown): string | null {
  if (typeof u === "string" && u.trim()) return u.trim();
  return null;
}

/**
 * Solo la foto del plano subida en el panel (paso Mesas — "Plano/foto del local").
 * En /reservar no se usa portada ni galería para no confundir con esa imagen.
 * Acepta `table_layout_image_url` si el JSON viene en snake_case.
 */
export function getReservationTableLayoutUrl(ev: PublicEventDetail): string | null {
  const raw = ev as Record<string, unknown>;
  return (
    pickUrl(ev.tableLayoutImageUrl) ??
    pickUrl(raw["table_layout_image_url"]) ??
    pickUrl(raw["tableLayoutImageUrl"])
  );
}
