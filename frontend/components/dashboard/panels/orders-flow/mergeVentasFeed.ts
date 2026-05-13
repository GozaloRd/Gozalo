import type { DashboardOrderRow } from "@/lib/dashboardApi";
import type { OrdersFilterState } from "@/components/dashboard/panels/orders-flow/OrdersFilters";

export type DashboardTicketListRow = {
  id: string;
  orderId?: string | null;
  comprador: { nombre?: string; email?: string };
  evento: { id: string; titulo: string } | null;
  tipoEntrada: string;
  montoRD: number;
  estado: string;
  creadoEn: string;
};

export type DashboardReservationListRow = {
  id: string;
  cliente: { nombre?: string; email?: string; telefono?: string };
  evento: { id: string; titulo: string; fecha?: string } | null;
  mesa: string | null;
  partySize?: number;
  montoRD: number;
  /** Total del contrato (incl. parte a pagar en local) si hay desglose en notas. */
  totalContratoRD?: number | null;
  pagadoEnLineaRD?: number | null;
  saldoPendienteRD?: number | null;
  /** Tramo cobrado en línea atribuible al local (mismo criterio que KPIs). */
  ingresoNetoLocalRD?: number | null;
  estado: string;
  creadoEn: string;
  notes?: string | null;
};

export type FeedItem =
  | { kind: "order"; sortAt: number; order: DashboardOrderRow; key: string }
  | { kind: "ticket"; sortAt: number; ticket: DashboardTicketListRow; key: string }
  | { kind: "reservation"; sortAt: number; reservation: DashboardReservationListRow; key: string };

function periodStartMs(period: OrdersFilterState["period"]): number {
  const start = new Date();
  if (period === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }
  return start.getTime();
}

export function inFeedPeriod(iso: string, period: OrdersFilterState["period"]): boolean {
  return new Date(iso).getTime() >= periodStartMs(period);
}

/** Rango que debe usar el backend (tickets/reservas) para no limitarse a las últimas N filas globales. */
export function periodRangeISO(period: OrdersFilterState["period"]): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

function ticketMatchesStatus(t: DashboardTicketListRow, status: OrdersFilterState["status"]): boolean {
  const e = (t.estado || "").toLowerCase();
  if (status === "all") return e !== "cancelled";
  if (status === "completed") return ["paid", "valid", "used"].includes(e);
  if (status === "pending") return e === "pending";
  if (status === "refunded") return e === "cancelled";
  return true;
}

function resvSaldo(r: DashboardReservationListRow): number | null {
  if (r.saldoPendienteRD == null || !Number.isFinite(Number(r.saldoPendienteRD))) return null;
  return Number(r.saldoPendienteRD);
}

function resvMatchesStatus(r: DashboardReservationListRow, status: OrdersFilterState["status"]): boolean {
  const e = (r.estado || "").toLowerCase();
  if (status === "all") return !["cancelled", "no_show"].includes(e);
  const saldo = resvSaldo(r);

  if (status === "refunded") return e === "cancelled" || e === "no_show";

  const openSaldo =
    saldo != null &&
    Number.isFinite(saldo) &&
    saldo > 0.009 &&
    ["confirmed", "checked_in", "completed"].includes(e);

  if (status === "pending") {
    if (e === "pending") return true;
    if (openSaldo) return true;
    return false;
  }
  if (status === "completed") {
    if (["cancelled", "no_show"].includes(e)) return false;
    if (e === "pending") return false;
    if (["confirmed", "checked_in", "completed"].includes(e)) {
      if (openSaldo) return false;
      return true;
    }
    return false;
  }
  return true;
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

function searchMatchesTicket(t: DashboardTicketListRow, q: string): boolean {
  if (!q) return true;
  const n = norm(q);
  const hay = [
    t.id,
    t.comprador?.nombre,
    t.comprador?.email,
    t.evento?.titulo,
    t.tipoEntrada,
    String(t.montoRD),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(n);
}

function searchMatchesResv(r: DashboardReservationListRow, q: string): boolean {
  if (!q) return true;
  const n = norm(q);
  const hay = [
    r.id,
    r.cliente?.nombre,
    r.cliente?.email,
    r.cliente?.telefono,
    r.evento?.titulo,
    r.mesa,
    String(r.montoRD),
    r.ingresoNetoLocalRD != null ? String(r.ingresoNetoLocalRD) : "",
    r.pagadoEnLineaRD != null ? String(r.pagadoEnLineaRD) : "",
    r.saldoPendienteRD != null ? String(r.saldoPendienteRD) : "",
    r.totalContratoRD != null ? String(r.totalContratoRD) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(n);
}

export function orderApiType(t: OrdersFilterState["type"]): "all" | "tickets" | "mesas" {
  if (t === "tickets") return "tickets";
  if (t === "mesas") return "mesas";
  return "all";
}

/**
 * Combina órdenes POS/web + filas sueltas de tickets y reservas (sin duplicar ticket ya cubierto por una orden).
 */
export function mergeVentasFeed(
  ordersData: DashboardOrderRow[],
  ticketRows: DashboardTicketListRow[],
  resvRows: DashboardReservationListRow[],
  filters: OrdersFilterState,
  debouncedQ: string
): FeedItem[] {
  const orderIdSet = new Set(ordersData.map((o) => o.id));

  const standaloneTickets = ticketRows.filter(
    (t) => t.orderId == null || String(t.orderId).length === 0 || !orderIdSet.has(String(t.orderId))
  );

  const items: FeedItem[] = [];

  for (const order of ordersData) {
    items.push({
      kind: "order",
      sortAt: new Date(order.createdAt).getTime(),
      order,
      key: `order:${order.id}`,
    });
  }

  for (const t of standaloneTickets) {
    if (filters.type === "mesas") continue;
    if (!inFeedPeriod(t.creadoEn, filters.period)) continue;
    if (!ticketMatchesStatus(t, filters.status)) continue;
    if (!searchMatchesTicket(t, debouncedQ)) continue;
    items.push({
      kind: "ticket",
      sortAt: new Date(t.creadoEn).getTime(),
      ticket: t,
      key: `ticket:${t.id}`,
    });
  }

  for (const r of resvRows) {
    if (filters.type === "tickets") continue;
    if (!inFeedPeriod(r.creadoEn, filters.period)) continue;
    if (!resvMatchesStatus(r, filters.status)) continue;
    if (!searchMatchesResv(r, debouncedQ)) continue;
    items.push({
      kind: "reservation",
      sortAt: new Date(r.creadoEn).getTime(),
      reservation: r,
      key: `resv:${r.id}`,
    });
  }

  items.sort((a, b) => b.sortAt - a.sortAt);
  return items;
}
