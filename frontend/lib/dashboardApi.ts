import { api, getToken } from "./api";

function q(venueId?: string | null) {
  return venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
}

export type VenuePickItem = {
  id: string;
  name: string;
  city?: string;
  status?: string;
  slug?: string;
  owner?: { id: string; fullName?: string; email?: string };
};

export async function fetchMineVenue(venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const qs = venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
  return api<{
    venue: {
      id: string;
      name: string;
      city?: string;
      capacity?: number;
      status?: string;
      description?: string;
      coverImageUrl?: string | null;
      slug?: string;
      address?: string | null;
      createdAt?: string;
      owner?: { id: string; fullName?: string; email?: string };
      payoutProfile?: {
        bankName?: string;
        accountHolder?: string;
        idTax?: string;
        accountType?: string;
        accountNumber?: string;
        bankSwiftOrRouting?: string;
        transferInstructions?: string;
      } | null;
    } | null;
    stats?: unknown | null;
    needsVenue?: boolean;
    needsVenuePick?: boolean;
    venues?: VenuePickItem[];
    viewerRole?: string;
  }>(`/api/venues/mine${qs}`, { token });
}

export async function createVenue(body: {
  name: string;
  city: string;
  description?: string;
  address?: string;
  capacity?: number;
}) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ id: string; name: string; city?: string }>(`/api/venues`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateVenue(
  id: string,
  body: {
    name?: string;
    description?: string;
    city?: string;
    address?: string;
    capacity?: number;
    coverImageUrl?: string | null;
    payoutProfile?: Record<string, unknown> | null;
  }
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{
    id: string;
    payoutProfile?: unknown;
  }>(`/api/venues/${id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function fetchDashboardStats(venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/stats${q(venueId)}`, { token });
}

export async function fetchDashboardReservations(
  params: Record<string, string | undefined>,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams();
  if (venueId) search.set("venueId", venueId);
  Object.entries(params).forEach(([k, v]) => {
    if (v) search.set(k, v);
  });
  const qs = search.toString();
  return api(`/api/dashboard/reservations${qs ? `?${qs}` : ""}`, { token });
}

export async function fetchDashboardTickets(
  params: Record<string, string | undefined>,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams();
  if (venueId) search.set("venueId", venueId);
  Object.entries(params).forEach(([k, v]) => {
    if (v) search.set(k, v);
  });
  const qs = search.toString();
  return api(`/api/dashboard/tickets${qs ? `?${qs}` : ""}`, { token });
}

export async function fetchDashboardEvents(scope: string, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams({ scope });
  if (venueId) search.set("venueId", venueId);
  return api(`/api/dashboard/events?${search.toString()}`, { token });
}

export async function createDashboardEvent(body: object, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/events${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateDashboardEvent(
  id: string,
  body: object,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/events/${id}${q(venueId)}`, {
    method: "PUT",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateEventCollage(
  id: string,
  photos: string[],
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ eventId: string; collagePhotos: string[] }>(
    `/api/dashboard/events/${id}/collage${q(venueId)}`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({ photos }),
    }
  );
}

export async function cancelDashboardEvent(id: string, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/events/${id}${q(venueId)}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchDashboardTables(
  eventId: string | null,
  venueId?: string | null,
  opts?: { tableScope?: "event" }
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams();
  if (venueId) search.set("venueId", venueId);
  if (eventId) search.set("eventId", eventId);
  if (opts?.tableScope === "event") search.set("tableScope", "event");
  return api<{
    mesas: VenueTableRow[];
    zonas: Record<string, VenueTableRow[]>;
  }>(`/api/dashboard/tables?${search.toString()}`, { token });
}

export type VenueTableRow = {
  id: string;
  venueId: string;
  eventId?: string | null;
  zone: string;
  label: string;
  capacity: number;
  minPrice?: string | number | null;
  /** 1–100: adelanto al reservar; 100 = pago completo online */
  initialPaymentPercent?: number | null;
  posX: number;
  posY: number;
  active?: boolean;
};

export async function createDashboardTable(
  body: {
    eventId?: string | null;
    zone: string;
    label: string;
    capacity?: number;
    minPrice?: number | null;
    initialPaymentPercent?: number;
    posX?: number;
    posY?: number;
  },
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<VenueTableRow>(`/api/dashboard/tables${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function updateDashboardTable(
  id: string,
  body: Partial<{
    eventId: string | null;
    zone: string;
    label: string;
    capacity: number;
    minPrice: number | null;
    initialPaymentPercent: number;
    posX: number;
    posY: number;
    active: boolean;
  }>,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<VenueTableRow>(`/api/dashboard/tables/${id}${q(venueId)}`, {
    method: "PUT",
    token,
    body: JSON.stringify(body),
  });
}

export async function deactivateDashboardTable(id: string, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ ok: boolean }>(`/api/dashboard/tables/${id}${q(venueId)}`, {
    method: "DELETE",
    token,
  });
}

export async function fetchPosProducts(venueId: string) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/pos/products/${venueId}`, { token });
}

export async function fetchDashboardOrders(eventId: string | null, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams();
  if (venueId) search.set("venueId", venueId);
  if (eventId) search.set("eventId", eventId);
  return api(`/api/dashboard/orders?${search.toString()}`, { token });
}

export async function createPosOrder(body: object, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/orders${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function addOrderItem(
  orderId: string,
  body: { productId: string; quantity: number },
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/orders/${orderId}/items${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function closeOrder(
  orderId: string,
  method: string,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/orders/${orderId}/close${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify({ method }),
  });
}

export async function scanAccess(payload: string, eventId: string, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/access/scan${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify({ payload, eventId }),
  });
}

export async function fetchOccupancy(eventId: string, venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/access/occupancy/${eventId}${q(venueId)}`, { token });
}

export async function fetchReports(venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/reports${q(venueId)}`, { token });
}

export async function fetchDashboardAnalytics(
  params?: { range?: "7d" | "30d" | "all"; eventId?: string },
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  const search = new URLSearchParams();
  if (venueId) search.set("venueId", venueId);
  if (params?.range) search.set("range", params.range);
  if (params?.eventId) search.set("eventId", params.eventId);
  const qs = search.toString();
  return api(`/api/dashboard/analytics${qs ? `?${qs}` : ""}`, { token });
}

export async function fetchDashboardStaff(venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/staff${q(venueId)}`, { token });
}

export async function fetchCashClosings(venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/cash-closing${q(venueId)}`, { token });
}

export async function createCashClosing(
  body: Record<string, unknown>,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/dashboard/cash-closing${q(venueId)}`, {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function patchReservationStatus(
  id: string,
  status: string
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api(`/api/reservations/${id}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}
