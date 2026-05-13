import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { resolveDashboardMediaUrl } from "@/lib/dashboardMediaUrl";
import type { EventSelectorItem } from "./types";

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleString("es-DO", { day: "numeric", month: "short" })
    .replace(/\./g, "");
}

/** Primera URL de imagen usable (portada o galería). */
export function dashboardEventThumbUrl(ev: UpcomingEventModel): string | null {
  const c = resolveDashboardMediaUrl(ev.coverImageUrl);
  if (c) return c;
  const gal = ev.images?.find((u) => typeof u === "string" && u.trim().length > 0);
  return resolveDashboardMediaUrl(gal ?? null);
}

/**
 * Lista del selector estadísticas: **solo eventos del local** (próximos + pasados vía scope `all`).
 */
export function buildStatsEventSelectorRows(events: UpcomingEventModel[]): EventSelectorItem[] {
  const sorted = [...events].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  );

  return sorted.map((ev) => {
    const sold = ev.metricas?.ticketsVendidos ?? 0;
    const total = ev.maxCapacity ?? 0;
    return {
      id: ev.id,
      name: ev.title,
      dateLabel: formatShortDate(ev.startAt),
      sold,
      total: total > 0 ? total : sold > 0 ? sold : 0,
      imageUrl: dashboardEventThumbUrl(ev) ?? undefined,
    };
  });
}
