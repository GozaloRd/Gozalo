import { api, getToken } from "./api";

export type AlertSeverity = "danger" | "warn" | "info";
export type AlertCategory = "aforo" | "mesa" | "caja" | "evento";

export type OpsAlert = {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  detail: string;
  href?: string;
  context?: Record<string, unknown>;
};

export type AlertsResponse = {
  data: OpsAlert[];
  summary: { total: number; danger: number; warn: number; info: number };
  generatedAt: string;
};

function q(venueId?: string | null) {
  return venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
}

export async function fetchOpsAlerts(venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<AlertsResponse>(`/api/dashboard/alerts${q(venueId)}`, { token });
}
