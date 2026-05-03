import { api, getToken } from "./api";

export type SetlistTrack = {
  position: number;
  title: string;
  artist?: string;
  duration?: string;
  notes?: string;
};

export type EventRider = {
  id: string;
  title: string;
  startAt: string;
  riderFiles?: string[];
  setlist?: SetlistTrack[];
  artistNotes?: string;
  staffWhatsappLink?: string;
};

function q(venueId?: string | null) {
  return venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
}

export async function fetchEventRider(eventId: string, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<EventRider>(`/api/dashboard/events/${eventId}/rider${q(venueId)}`, { token });
}

export async function updateEventRider(
  eventId: string,
  body: Partial<Pick<EventRider, "riderFiles" | "setlist" | "artistNotes" | "staffWhatsappLink">>,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<EventRider>(`/api/dashboard/events/${eventId}/rider${q(venueId)}`, {
    method: "PUT",
    token,
    body: JSON.stringify(body),
  });
}
