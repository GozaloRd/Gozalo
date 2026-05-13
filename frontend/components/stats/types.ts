export type StatsMainView = "dashboard" | "events" | "comparative" | "trends" | "channels";

export type EventSelectorItem = {
  id: string;
  name: string;
  dateLabel: string;
  sold: number;
  total: number;
  /** Poster / portada (mock o API vía merge) */
  imageUrl?: string;
};

export type MetricCard = {
  label: string;
  value: string;
  sub?: string;
  change?: string;
  changeNegative?: boolean;
};

export type LineDatum = {
  label: string;
  value: number;
  secondary?: number;
};

export type ChannelDatum = {
  id: string;
  name: string;
  amount: number;
  color: string;
};

export type ComparativeRow = {
  eventId: string;
  name: string;
  revenue: number;
  attendance: number;
  ticketAvg: number;
  occupancyPct: number;
};

export type TrendsGranularity = "month" | "weekday" | "hour";
