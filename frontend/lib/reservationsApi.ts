import { api, getToken } from "./api";

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "cancelled"
  | "completed"
  | "no_show";

export type MyReservation = {
  id: string;
  status: ReservationStatus;
  partySize: number;
  totalAmount: string | number;
  qrPayload: string;
  notes?: string;
  checkedInAt?: string;
  createdAt: string;
  event?: {
    id: string;
    title: string;
    startAt: string;
    coverImageUrl?: string;
    venue?: { id: string; name: string };
  };
  table?: {
    id: string;
    zone: string;
    label: string;
    capacity: number;
  };
};

export async function fetchMyReservations(): Promise<MyReservation[]> {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<MyReservation[]>("/api/reservations/my", { token });
}

export async function cancelMyReservation(id: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  await api<unknown>(`/api/reservations/${id}`, { method: "DELETE", token });
}
