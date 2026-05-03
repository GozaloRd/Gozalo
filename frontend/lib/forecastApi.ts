import { api, getToken } from "./api";

export type ForecastFactor = {
  label: string;
  impact: "positive" | "negative" | "warn";
  detail: string;
};

export type EventForecast = {
  eventId: string;
  eventTitle: string;
  hasEnoughData: boolean;
  forecast: number | null;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  expectedAttendance?: number;
  basedOn: number;
  dayOfWeek?: string;
  factors: ForecastFactor[];
  message?: string;
  generatedAt?: string;
};

function q(venueId?: string | null) {
  return venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
}

export async function fetchEventForecast(
  eventId: string,
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<EventForecast>(
    `/api/dashboard/events/${eventId}/forecast${q(venueId)}`,
    { token }
  );
}
