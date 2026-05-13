import type { VenueTableRow } from "@/lib/dashboardApi";
import {
  reservationMatchesTable,
  type DashboardReservationRow,
} from "@/lib/dashboardEventReservations";
import { paymentInfo } from "@/lib/reservationPayment";

export type MesaUiEstado = "disponible" | "reservada" | "ocupada" | "sin_pago" | "bloqueada";

export function deriveMesaUiEstado(
  table: VenueTableRow,
  matches: DashboardReservationRow[]
): MesaUiEstado {
  if (table.active === false) return "bloqueada";
  const active = matches.filter((r) => !["cancelled", "no_show"].includes(String(r.estado ?? "")));
  if (active.length === 0) return "disponible";
  const debt = active.some((r) => paymentInfo(r).pendingAtVenue > 0);
  if (debt) return "sin_pago";
  return "ocupada";
}

export const MESA_ESTADO_META: Record<
  MesaUiEstado,
  { label: string; dot: string; border: string; short: string }
> = {
  disponible: {
    label: "Disp",
    dot: "bg-emerald-500",
    border: "border-emerald-500/55",
    short: "Disp",
  },
  reservada: {
    label: "Reserv",
    dot: "bg-amber-400",
    border: "border-amber-500/55",
    short: "Rese",
  },
  ocupada: {
    label: "Ocup",
    dot: "bg-sky-500",
    border: "border-sky-500/55",
    short: "Ocup",
  },
  sin_pago: {
    label: "SinP",
    dot: "bg-red-500",
    border: "border-red-500/55",
    short: "SinP",
  },
  bloqueada: {
    label: "Bloq",
    dot: "bg-zinc-500",
    border: "border-zinc-500/55",
    short: "Blq",
  },
};

export type AugmentedTable = VenueTableRow & {
  estadoUi: MesaUiEstado;
  matches: DashboardReservationRow[];
  pendingTotal: number;
  displayName: string;
};

export function augmentTablesForEvent(
  tables: VenueTableRow[],
  reservations: DashboardReservationRow[],
  eventId: string
): AugmentedTable[] {
  const forEvent = reservations.filter((r) => r.evento?.id === eventId);
  return tables.map((t) => {
    const matches = forEvent.filter((r) => reservationMatchesTable(r, t));
    const pendingTotal = matches.reduce((acc, r) => acc + paymentInfo(r).pendingAtVenue, 0);
    const estadoUi = deriveMesaUiEstado(t, matches);
    return {
      ...t,
      estadoUi,
      matches,
      pendingTotal,
      displayName: `${t.zone} · ${t.label}`,
    };
  });
}

export function groupByZone(rows: AugmentedTable[]): Record<string, AugmentedTable[]> {
  const out: Record<string, AugmentedTable[]> = {};
  for (const r of rows) {
    const z = r.zone || "General";
    if (!out[z]) out[z] = [];
    out[z].push(r);
  }
  for (const z of Object.keys(out)) {
    out[z].sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { numeric: true }));
  }
  return out;
}

export type ZoneAggregate = {
  zone: string;
  tables: AugmentedTable[];
  totalMesas: number;
  reservadasCount: number;
  personasConfirmadas: number;
  revenueRd: number;
  pctReserved: number;
};

export function aggregateZone(zone: string, tables: AugmentedTable[]): ZoneAggregate {
  const totalMesas = tables.length;
  const nonFree = tables.filter((t) => t.estadoUi !== "disponible").length;
  let personasConfirmadas = 0;
  let revenueRd = 0;
  for (const t of tables) {
    for (const r of t.matches) {
      if (["cancelled", "no_show"].includes(String(r.estado ?? ""))) continue;
      personasConfirmadas += Number(r.partySize ?? 0);
      revenueRd += Number(r.montoRD ?? 0);
    }
  }
  const pctReserved = totalMesas > 0 ? Math.round((nonFree / totalMesas) * 100) : 0;
  return {
    zone,
    tables,
    totalMesas,
    reservadasCount: nonFree,
    personasConfirmadas,
    revenueRd,
    pctReserved,
  };
}

export type ZoneUiEstado = "activo" | "agotado" | "inactivo";

export function deriveZoneUiEstado(z: ZoneAggregate): ZoneUiEstado {
  const activeTables = z.tables.filter((t) => t.active !== false);
  if (activeTables.length === 0) return "inactivo";
  const soldOut = z.totalMesas > 0 && z.reservadasCount >= z.totalMesas;
  if (soldOut) return "agotado";
  return "activo";
}

export function zoneInsightSpanish(z: ZoneAggregate, estado: ZoneUiEstado): string | null {
  if (estado === "agotado") return "🔥 Zona completa: considera lista de espera o liberar mesas.";
  if (z.pctReserved < 35 && z.totalMesas >= 4)
    return "💡 Esta zona se vende lento: revisa consumo mínimo o promoción.";
  return null;
}
