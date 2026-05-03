import { api, getToken } from "./api";

export type WaitlistStatus = "waiting" | "offered" | "claimed" | "expired" | "cancelled";

export type WaitlistEntry = {
  id: string;
  eventId: string;
  userId: string;
  partySize: number;
  ticketTypeId: string | null;
  status: WaitlistStatus;
  notifiedAt?: string | null;
  claimedAt?: string | null;
  note?: string | null;
  createdAt: string;
};

export async function joinWaitlist(
  eventId: string,
  body?: { partySize?: number; ticketTypeId?: string; note?: string }
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ entry: WaitlistEntry; position: number | null }>(
    `/api/waitlist/events/${eventId}/join`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body || {}),
    }
  );
}

export async function leaveWaitlist(eventId: string) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ ok: boolean }>(`/api/waitlist/events/${eventId}/leave`, {
    method: "DELETE",
    token,
  });
}

export async function getMyWaitlistEntry(eventId: string) {
  const token = getToken();
  if (!token) return null;
  return api<{ entry: WaitlistEntry; position: number | null } | null>(
    `/api/waitlist/events/${eventId}/mine`,
    { token }
  );
}

export async function listEventWaitlist(
  eventId: string,
  venueId: string,
  status?: WaitlistStatus
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams({ venueId });
  if (status) search.set("status", status);
  return api<{ data: (WaitlistEntry & { user?: { id: string; fullName?: string; email?: string; phone?: string } })[] }>(
    `/api/waitlist/events/${eventId}?${search.toString()}`,
    { token }
  );
}

export async function notifyNextInWaitlist(eventId: string, venueId: string, count = 1) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ notified: number; entries: WaitlistEntry[] }>(
    `/api/waitlist/events/${eventId}/notify-next?venueId=${encodeURIComponent(venueId)}`,
    {
      method: "POST",
      token,
      body: JSON.stringify({ count }),
    }
  );
}
