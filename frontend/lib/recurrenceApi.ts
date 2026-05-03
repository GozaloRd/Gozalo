import { api, getToken } from "./api";

export type RecurrenceRule = {
  type: "weekly";
  weeksGenerated?: number;
  lastGeneratedAt?: string;
  until?: string;
};

export type RecurrenceParent = {
  id: string;
  title: string;
  slug: string;
  startAt: string;
  rule: RecurrenceRule;
  totalChildren: number;
  upcomingChildren: number;
};

export type WeeklyCreateResult = {
  parentId: string;
  parentTitle: string;
  created: Array<{
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    slug: string;
    status: string;
  }>;
};

function q(venueId?: string | null) {
  return venueId ? `?venueId=${encodeURIComponent(venueId)}` : "";
}

export async function fetchRecurrences(venueId?: string | null) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<{ data: RecurrenceParent[] }>(
    `/api/dashboard/recurrences${q(venueId)}`,
    { token }
  );
}

export async function createWeeklyRecurrence(
  body: {
    sourceEventId: string;
    weeks: number;
    copyTickets?: boolean;
    publish?: boolean;
  },
  venueId?: string | null
) {
  const token = getToken();
  if (!token) throw new Error("No autenticado");
  return api<WeeklyCreateResult>(
    `/api/dashboard/recurrences/weekly${q(venueId)}`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }
  );
}
