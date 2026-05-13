import type { DashboardOrderRow } from "@/lib/dashboardApi";

export type UiOrderStatus =
  | "completed"
  | "pending"
  | "processing"
  | "cancelled"
  | "refunded"
  | "failed";

export function deriveUiStatus(order: DashboardOrderRow): UiOrderStatus {
  const payments = order.payments ?? [];
  if (order.status === "open") {
    const hasPending = payments.some((p) => p.status === "pending");
    if (hasPending) return "processing";
    return "pending";
  }
  if (order.status === "paid") return "completed";
  if (order.status === "cancelled") {
    const refunded = payments.some((p) => p.status === "refunded");
    if (refunded) return "refunded";
    return "cancelled";
  }
  const failed = payments.some((p) => p.status === "failed");
  if (failed) return "failed";
  return "cancelled";
}

export function orderKind(order: DashboardOrderRow): "ticket" | "mesa" | "bar" | "combo" | "cortesia" {
  const hasTickets = (order.tickets?.length ?? 0) > 0;
  if (order.type === "tickets" || order.type === "mixed" || hasTickets) return "ticket";
  if (order.tableId) return "mesa";
  const names = (order.items ?? []).map((i) => (i.product?.name ?? "").toLowerCase()).join(" ");
  if (names.includes("cortesía") || names.includes("cortesia")) return "cortesia";
  if ((order.items?.length ?? 0) > 2) return "combo";
  return "bar";
}

export function statusClasses(s: UiOrderStatus): string {
  switch (s) {
    case "completed":
      return "text-emerald-400";
    case "pending":
      return "text-amber-400";
    case "processing":
      return "text-blue-400";
    case "cancelled":
      return "text-red-400";
    case "refunded":
      return "text-purple-400";
    case "failed":
      return "text-orange-400";
    default:
      return "text-slate-400";
  }
}

/** Monto que ve el local: suma de precios de entradas, o total del pago POS / pedido. */
export function orderVenueNetTotal(order: DashboardOrderRow): number {
  if (order.venueNetTotal != null && Number.isFinite(Number(order.venueNetTotal))) {
    return Number(order.venueNetTotal);
  }
  const activeTickets = (order.tickets ?? []).filter(
    (t) => String(t.status || "").toLowerCase() !== "cancelled"
  );
  if (activeTickets.length > 0) {
    return Number(activeTickets.reduce((s, t) => s + Number(t.unitPrice || 0), 0).toFixed(2));
  }
  const type = order.type;
  if (type === "tickets" || type === "mixed") {
    return 0;
  }
  const primary = (order.payments ?? []).find((p) => p.status === "completed");
  if (primary) {
    return Number(Number(primary.amount || 0).toFixed(2));
  }
  return Number(order.total ?? 0);
}
