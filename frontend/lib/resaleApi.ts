import { api, getToken } from "./api";

export type ResaleStatus = "listed" | "claimed" | "completed" | "cancelled" | "expired";

export type ResaleListing = {
  id: string;
  ticketId: string;
  sellerUserId: string;
  eventId: string;
  /** Precio original del ticket (bloqueado) */
  askPrice: number;
  buyerFee: number;
  sellerFee: number;
  /** Precio que paga el comprador = askPrice * 1.10 */
  finalPrice: number;
  /** Importe que recibirá el vendedor = askPrice * 0.90 */
  sellerPayout: number;
  sellerPayoutStatus: "pending" | "paid";
  sellerPayoutAt?: string;
  status: ResaleStatus;
  newQrPayload?: string;
  listedAt: string;
  claimedAt?: string;
  completedAt?: string;
  ticket?: { id: string; ticketType: string; unitPrice: number; status?: string };
  seller?: { id: string; fullName: string; email?: string };
  buyer?: { id: string; fullName: string };
  event?: { id: string; title: string; startAt: string; venueId?: string };
};

export type ClaimResult = {
  resale: ResaleListing;
  newTicket: { id: string; ticketType: string; qrPayload: string; status: string };
};

function q(p?: string | null) {
  return p ? `?venueId=${encodeURIComponent(p)}` : "";
}
void q;

export async function fetchEventResales(eventId: string) {
  return api<{ data: ResaleListing[] }>(`/api/resale/events/${eventId}`);
}

export async function fetchMyListings() {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ data: ResaleListing[] }>(`/api/resale/my/listings`, { token });
}

export async function fetchMyPurchases() {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ data: ResaleListing[] }>(`/api/resale/my/purchases`, { token });
}

/** El precio lo fija el backend (precio original del ticket). Solo se envía ticketId. */
export async function listTicketForResale(body: { ticketId: string }) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ resale: ResaleListing; breakdown: { askPrice: number; finalPrice: number; sellerPayout: number; platformNet: number } }>(
    `/api/resale/list`,
    { method: "POST", token, body: JSON.stringify(body) }
  );
}

/** Dashboard: lista reventas completadas con pago al vendedor pendiente. */
export async function fetchPendingPayouts() {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ data: ResaleListing[] }>(`/api/resale/dashboard/payouts`, { token });
}

/** Dashboard: marcar pago al vendedor como realizado. */
export async function markSellerPaid(resaleId: string) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ ok: boolean; sellerPayout: number }>(`/api/resale/dashboard/payouts/${resaleId}/paid`, {
    method: "PATCH",
    token,
  });
}

export async function cancelResaleListing(resaleId: string) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ ok: boolean }>(`/api/resale/${resaleId}`, {
    method: "DELETE",
    token,
  });
}

export async function claimResale(resaleId: string) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<ClaimResult>(`/api/resale/${resaleId}/claim`, {
    method: "POST",
    token,
  });
}
