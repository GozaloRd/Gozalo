import { fetchDashboardReservations, type VenueTableRow } from "@/lib/dashboardApi";

/** Fila de reserva del dashboard (compatible con `mesas/page.tsx`). */
export type DashboardReservationRow = {
  id: string;
  cliente?: { nombre?: string; email?: string; telefono?: string };
  evento?: { id?: string; titulo?: string };
  mesa?: string;
  tableId?: string | null;
  montoRD?: number;
  estado?: string;
  notes?: string | null;
  createdAt?: string;
};

export function reservationMatchesTable(r: DashboardReservationRow, t: VenueTableRow): boolean {
  if (r.estado === "cancelled") return false;
  if (r.tableId && r.tableId === t.id) return true;
  const mesaText = String(r.mesa ?? "").toLowerCase();
  const byId = mesaText.includes(String(t.id).toLowerCase());
  const byLabel = mesaText.includes(String(t.label).toLowerCase());
  const byZoneLabel = mesaText.includes(`${t.zone} ${t.label}`.toLowerCase());
  return byId || byLabel || byZoneLabel;
}

export async function loadAllEventReservations(
  eventId: string,
  venueId: string
): Promise<DashboardReservationRow[]> {
  const out: DashboardReservationRow[] = [];
  let page = 1;
  for (;;) {
    const res = (await fetchDashboardReservations(
      { eventId, page: String(page), pageSize: "100" },
      venueId
    )) as { data?: DashboardReservationRow[] };
    const batch = res.data ?? [];
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
    if (page > 50) break;
  }
  return out;
}
