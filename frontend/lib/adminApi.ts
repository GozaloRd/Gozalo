import { api, getToken } from "./api";
import type { VenuePickItem } from "./dashboardApi";

export type AdminDashboardSummary = {
  totalUsers: number;
  usersByRole?: Record<string, number>;
  venuesPending: number;
  venuesApproved: number;
  venuesSuspended?: number;
  eventsTotal?: number;
  eventsPublished?: number;
  eventsDraft?: number;
  totalVolumeRD: number;
  platformCommissionsRD: number;
  actualStoredCommissionsRD?: number;
  localRevenueRD?: number;
  reservationsGrossRD?: number;
  ticketsGrossRD?: number;
  estimatedTicketsCommissionRD?: number;
  estimatedReservationsCommissionRD?: number;
  estimatedAppCommissionsRD?: number;
  commissionPolicy?: {
    ticketsPercent: number;
    reservationsPercent: number;
  };
  issues?: {
    total: number;
    pendingVenues: number;
    pendingPayments: number;
    failedPayments: number;
    ticketEmailErrors: number;
    paidReservationsStillPending: number;
    venuesWithoutOwner: number;
    publishedEventsWithoutSalesConfig: number;
  };
  topVenues?: {
    venueId: string | null;
    venueName: string;
    venueCity: string | null;
    localRevenueRD: number;
    appCommissionRD: number;
  }[];
};

export async function fetchAdminDashboard(): Promise<AdminDashboardSummary> {
  return api<AdminDashboardSummary>("/api/admin/dashboard", {});
}

export async function fetchAdminPendingVenues() {
  return api<
    {
      id: string;
      name: string;
      city?: string;
      description?: string | null;
      coverImageUrl?: string | null;
      status: string;
      createdAt: string;
      owner?: { id: string; email: string; fullName?: string; phone?: string };
    }[]
  >("/api/admin/venues/pending", {});
}

export async function fetchAdminUsers() {
  return api<
    {
      id: string;
      email: string;
      fullName: string;
      phone?: string | null;
      role: string;
      points?: number;
      createdAt: string;
    }[]
  >("/api/admin/users", {});
}

export async function patchUserRole(userId: string, role: string) {
  return api(`/api/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function deleteAdminUser(userId: string) {
  return api<{ ok: boolean }>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export async function fetchAdminTransactions() {
  return api<unknown[]>("/api/admin/transactions", {});
}

export type AdminRevenueByVenueRow = {
  venueId: string | null;
  venueName: string;
  venueCity: string | null;
  reservationsGross: number;
  reservationsCommission: number;
  ticketsGross: number;
  ticketsCommission: number;
  totalControlledGross: number;
  totalControlledCommission: number;
};

export type AdminRevenueByVenueResponse = {
  rows: AdminRevenueByVenueRow[];
  totals: {
    reservationsGross: number;
    reservationsCommission: number;
    ticketsGross: number;
    ticketsCommission: number;
    totalControlledGross: number;
    totalControlledCommission: number;
  };
};

export async function fetchAdminRevenueByVenue(params?: { from?: string; to?: string }) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const qs = search.toString();
  return api<AdminRevenueByVenueResponse>(`/api/admin/revenue-by-venue${qs ? `?${qs}` : ""}`, {});
}

export type AdminVenueDetail = {
  venue: {
    id: string;
    name: string;
    city?: string | null;
    address?: string | null;
    status: string;
    createdAt?: string;
    owner?: {
      id: string;
      fullName?: string;
      email?: string;
      phone?: string | null;
      createdAt?: string;
    } | null;
  };
  period: { from: string | null; to: string | null };
  revenue: {
    reservationsGross: number;
    reservationsCommission: number;
    ticketsGross: number;
    ticketsCommission: number;
    localRevenue: number;
    appCommission: number;
    customerCollected: number;
  };
  reconciliation: {
    customerCollected: number;
    localRevenue: number;
    appCommission: number;
    pendingToCollect: number;
    failedAmount: number;
    completedPayments: number;
    pendingPayments: number;
    failedPayments: number;
  };
  counts: {
    eventsTotal?: number;
    eventsPublished?: number;
    upcomingEvents?: number;
    reservationsActive?: number;
    ticketsActive?: number;
  };
  issues: {
    total: number;
    pendingPayments: number;
    failedPayments: number;
    ticketEmailErrors: number;
    paidReservationsStillPending: number;
    publishedEventsWithoutSalesConfig: number;
  };
  events: {
    id: string;
    title: string;
    status: string;
    startAt: string;
    publicado?: boolean;
  }[];
  lastActivityAt?: string | null;
};

export async function fetchAdminVenueDetail(
  venueId: string,
  params?: { from?: string; to?: string }
) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  const qs = search.toString();
  return api<AdminVenueDetail>(`/api/admin/venues/${venueId}/detail${qs ? `?${qs}` : ""}`, {});
}

export type AdminGlobalEventSales = {
  ticketsCount: number;
  ticketsGross: number;
  reservationsCount: number;
  reservationsGross: number;
  totalGross: number;
  ticketsByType: { ticketType: string; count: number; gross: number }[];
};

export type AdminGlobalEventRow = {
  id: string;
  venueId: string;
  title: string;
  slug: string;
  status: string;
  startAt: string;
  endAt: string;
  publicado?: boolean;
  city?: string;
  category?: string;
  venue: {
    id: string;
    name: string;
    city?: string | null;
    status: string;
  } | null;
  sales?: AdminGlobalEventSales;
};

export type AdminGlobalEventsResponse = {
  events: AdminGlobalEventRow[];
};

export async function fetchAdminGlobalEvents(params?: {
  from?: string;
  to?: string;
  status?: string;
  q?: string;
  limit?: number;
}) {
  const search = new URLSearchParams();
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  if (params?.status) search.set("status", params.status);
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.limit != null) search.set("limit", String(params.limit));
  const qs = search.toString();
  return api<AdminGlobalEventsResponse>(`/api/admin/events${qs ? `?${qs}` : ""}`, {});
}

export type AdminEventSalesBuyer = {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
};

export type AdminEventSalesTicketRow = {
  id: string;
  ticketType: string;
  unitPrice: number;
  catalogLineRD: number;
  customerPaidRD: number;
  orderFeeAllocatedRD: number;
  orderSubtotalRD: number | null;
  orderTotalRD: number | null;
  orderTaxRD: number | null;
  status: string;
  createdAt: string;
  orderId: string | null;
  orderType: string | null;
  orderStatus: string | null;
  orderCreatedAt: string | null;
  buyer: AdminEventSalesBuyer | null;
};

export type AdminEventSalesReservationRow = {
  id: string;
  status: string;
  partySize: number;
  totalAmount: number;
  customerPaidOnlineRD: number;
  contractLocalTotalRD: number | null;
  pendingAtVenueRD: number | null;
  createdAt: string;
  tableLabel: string | null;
  buyer: AdminEventSalesBuyer | null;
};

export type AdminEventSalesSums = {
  ticketsCatalogTotalRD: number;
  ticketsCustomerPaidTotalRD: number;
  reservationsCustomerPaidTotalRD: number;
  reservationsContractTotalRD: number;
  reservationsPendingVenueTotalRD: number;
  customerPaidGrandTotalRD: number;
};

export type AdminEventSalesDetailResponse = {
  event: {
    id: string;
    title: string;
    slug: string;
    startAt: string;
    status: string;
    venueId: string;
    venue: { id: string; name: string; city?: string | null } | null;
  };
  tickets: AdminEventSalesTicketRow[];
  reservations: AdminEventSalesReservationRow[];
  sums: AdminEventSalesSums;
};

export async function fetchAdminEventSalesDetail(eventId: string) {
  return api<AdminEventSalesDetailResponse>(`/api/admin/events/${eventId}/sales`, {});
}

export async function fetchAllVenuesMineList(): Promise<VenuePickItem[]> {
  return api<VenuePickItem[]>("/api/venues/mine/list", {});
}

export async function patchVenueStatus(venueId: string, status: string) {
  return api(`/api/venues/${venueId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
