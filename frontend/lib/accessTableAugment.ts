import type { VenueTableRow } from "@/lib/dashboardApi";
import type { DashboardReservationRow } from "@/lib/dashboardEventReservations";
import { reservationMatchesTable } from "@/lib/dashboardEventReservations";
import { paymentInfo } from "@/lib/reservationPayment";

export type MesaUiState = "libre" | "reservada" | "ocupada";

export type AugmentedAccessTable = {
  table: VenueTableRow;
  state: MesaUiState;
  matches: DashboardReservationRow[];
  primary: DashboardReservationRow | null;
  pendingTotal: number;
};

export function augmentTablesForAccess(
  tables: VenueTableRow[],
  reservations: DashboardReservationRow[],
  eventId: string
): AugmentedAccessTable[] {
  const forEvent = reservations.filter((r) => r.evento?.id === eventId && r.estado !== "cancelled");
  return tables.map((t) => {
    const matches = forEvent.filter((r) => reservationMatchesTable(r, t));
    const checked = matches.filter((r) => r.estado === "checked_in" || r.estado === "completed");
    const reservedOnly = matches.filter((r) => r.estado === "pending" || r.estado === "confirmed");
    let state: MesaUiState = "libre";
    if (checked.length > 0) state = "ocupada";
    else if (reservedOnly.length > 0) state = "reservada";
    const primary = checked[0] ?? reservedOnly[0] ?? null;
    const pendingTotal = matches.reduce((acc, r) => acc + paymentInfo(r).pendingAtVenue, 0);
    return { table: t, state, matches, primary, pendingTotal };
  });
}

export function countStates(rows: AugmentedAccessTable[]) {
  let libres = 0;
  let reserv = 0;
  let ocup = 0;
  for (const r of rows) {
    if (r.state === "libre") libres += 1;
    else if (r.state === "reservada") reserv += 1;
    else ocup += 1;
  }
  return { libres, reserv, ocup };
}
