import { api, getToken } from "./api";

export type GuestListStatus = "pending" | "checked_in" | "no_show" | "cancelled";

export type GuestListEntry = {
  id: string;
  eventId: string;
  venueId: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  partySize: number;
  category?: string | null;
  notes?: string | null;
  qrPayload: string;
  status: GuestListStatus;
  checkedInAt?: string | null;
  createdAt: string;
};

export type GuestListSummary = {
  totalEntries: number;
  totalGuests: number;
  checkedIn: number;
};

function q(venueId?: string | null) {
  return venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
}

export async function fetchEventGuestList(
  eventId: string,
  venueId?: string | null,
  status?: GuestListStatus
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams();
  if (venueId) search.set("venueId", venueId);
  if (status) search.set("status", status);
  const qs = search.toString();
  return api<{ data: GuestListEntry[]; summary: GuestListSummary }>(
    `/api/dashboard/events/${eventId}/guestlist${qs ? `?${qs}` : ""}`,
    { token }
  );
}

export async function createGuestEntry(
  eventId: string,
  body: {
    fullName: string;
    phone?: string;
    email?: string;
    partySize?: number;
    category?: string;
    notes?: string;
  },
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<GuestListEntry>(`/api/dashboard/events/${eventId}/guestlist${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateGuestEntry(
  eventId: string,
  entryId: string,
  body: Partial<{
    fullName: string;
    phone: string;
    email: string;
    partySize: number;
    category: string;
    notes: string;
    status: GuestListStatus;
  }>,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<GuestListEntry>(
    `/api/dashboard/events/${eventId}/guestlist/${entryId}${q(venueId)}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify(body),
    }
  );
}

export async function deleteGuestEntry(eventId: string, entryId: string, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ ok: boolean }>(
    `/api/dashboard/events/${eventId}/guestlist/${entryId}${q(venueId)}`,
    { method: "DELETE", token }
  );
}
