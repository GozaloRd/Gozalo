import { api, getToken } from "./api";
import type { VenuePickItem } from "./dashboardApi";

export type AdminDashboardSummary = {
  totalUsers: number;
  venuesPending: number;
  venuesApproved: number;
  totalVolumeRD: number;
  platformCommissionsRD: number;
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

export async function fetchAllVenuesMineList(): Promise<VenuePickItem[]> {
  return api<VenuePickItem[]>("/api/venues/mine/list", {});
}

export async function patchVenueStatus(venueId: string, status: string) {
  return api(`/api/venues/${venueId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
