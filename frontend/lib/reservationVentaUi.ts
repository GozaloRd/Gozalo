import type { DashboardReservationListRow } from "@/components/dashboard/panels/orders-flow/mergeVentasFeed";
import type { OrderStatus } from "@/components/sales/types";

const RESERVATION_ESTADO_ES: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  checked_in: "Check-in",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

/** Etiqueta en español para el estado persistido de la reserva. */
export function formatReservationEstadoDb(es: string | undefined | null): string {
  const k = String(es || "").toLowerCase();
  return RESERVATION_ESTADO_ES[k] ?? (es ? String(es) : "—");
}

/** Icono/clasificación Ventas para reserva: saldo en local ⇒ pendiente aunque confirmed. */
export function reservationVentasStatus(r: DashboardReservationListRow): OrderStatus {
  const e = String(r.estado || "").toLowerCase();
  if (e === "cancelled" || e === "no_show") return "refunded";
  if (e === "pending") return "pending";
  if (["confirmed", "checked_in", "completed"].includes(e)) {
    const saldo =
      r.saldoPendienteRD != null && Number.isFinite(Number(r.saldoPendienteRD))
        ? Number(r.saldoPendienteRD)
        : null;
    if (saldo != null && saldo > 0.009) return "pending";
    return "completed";
  }
  return "pending";
}

export function formatReservationVentaMontoLine(
  r: DashboardReservationListRow,
  formatMoney: (n: number) => string
): string {
  const pagado =
    r.pagadoEnLineaRD != null && Number.isFinite(Number(r.pagadoEnLineaRD))
      ? Number(r.pagadoEnLineaRD)
      : null;
  const saldo =
    r.saldoPendienteRD != null && Number.isFinite(Number(r.saldoPendienteRD))
      ? Number(r.saldoPendienteRD)
      : null;
  if (pagado != null && saldo != null && saldo > 0.009) {
    return `${formatMoney(pagado)} cobrado · ${formatMoney(saldo)} pendiente evento`;
  }
  if (pagado != null) {
    return formatMoney(pagado);
  }
  return formatMoney(Number(r.montoRD || 0));
}
