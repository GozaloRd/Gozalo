import { api } from "./api";

export type MyTicket = {
  id: string;
  ticketType: string;
  status: string;
  unitPrice?: number;
  qrPayload?: string;
  qrImage?: string;
  createdAt: string;
  event?: {
    id: string;
    slug?: string;
    title: string;
    startAt?: string;
    endAt?: string | null;
    coverImageUrl?: string | null;
    venue?: { id: string; name: string; city?: string };
  };
};

export type MyReservation = {
  id: string;
  status: string;
  partySize: number;
  totalAmount?: number;
  qrPayload?: string;
  qrImage?: string;
  notes?: string;
  createdAt: string;
  event?: {
    id: string;
    slug?: string;
    title: string;
    startAt?: string;
    venue?: { id: string; name: string; city?: string };
  };
  table?: { zone?: string; label?: string; capacity?: number };
};

export async function fetchMyTickets(): Promise<MyTicket[]> {
  return api<MyTicket[]>("/api/tickets/my", {});
}

export async function fetchMyReservations(): Promise<MyReservation[]> {
  return api<MyReservation[]>("/api/reservations/my", {});
}

export async function deleteMyReservation(id: string) {
  return api<{ ok: boolean }>(`/api/reservations/${id}`, { method: "DELETE" });
}

export type PurchasedTicket = {
  id: string;
  ticketType: string;
  unitPrice: number;
  status: string;
  qrPayload: string;
  qrImage?: string;
};

export async function purchaseTickets(input: {
  eventId: string;
  items: Array<{ ticketType: string; quantity: number; unitPrice: number }>;
  /** Compra invitada (sin JWT): el backend crea o reutiliza usuario por email. */
  buyerEmail?: string;
  buyerFullName?: string;
}) {
  return api<{ order: { id: string; total: number }; tickets: PurchasedTicket[] }>("/api/tickets/purchase", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type ReservationBreakdown = {
  paymentVersion?: number;
  table: { id: string; zone: string; label: string; capacity: number; amount: number };
  cover: { ticketType: string; quantity: number; unitPrice: number; amount: number } | null;
  /** Mesa + cover — ingreso base del local (sin recargo). */
  subtotalLocal: number;
  consumerSurchargeRate: number;
  totalLocalContract: number;
  /** Contrato cliente (base + 5% solo consumidor web). */
  totalCustomerContract: number;
  paymentOption: "total" | "partial";
  upfrontPercent: number;
  payNowLocalBase: number;
  payNowCustomer: number;
  platformCommissionOnPayment: number;
  pendingLocalBase: number;
  /** @deprecated usar pendingLocalBase */
  pendingAtVenue: number;
  /** Igual que totalCustomerContract */
  total: number;
  /** Igual que payNowCustomer — cobro online del tramo */
  payNow: number;
};

export async function createReservation(input: {
  eventId: string;
  tableId: string;
  partySize: number;
  notes?: string;
  paymentOption: "total" | "partial";
  upfrontPercent?: number;
  cover?: { ticketType: string; quantity: number; unitPrice: number };
  buyerEmail?: string;
  buyerFullName?: string;
}) {
  return api<{ reservation: { id: string; status: string }; qrImage?: string; breakdown: ReservationBreakdown }>(
    "/api/reservations",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}
