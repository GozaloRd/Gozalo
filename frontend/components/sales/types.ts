export type OrderStatus = "completed" | "pending" | "refunded";

export type MockOrder = {
  id: string;
  eventName: string;
  timeLabel: string;
  amountRD: number;
  status: OrderStatus;
  /** tickets | mesas — for filter */
  kind: "tickets" | "mesas";
  /** optional client hint for search */
  clientHint?: string;
};

export type PeriodFilter = "today" | "week" | "month";
export type StatusFilter = "all" | OrderStatus;
export type TypeFilter = "all" | "tickets" | "mesas";

export type SalesKpiCard = {
  key: string;
  label: string;
  valueFormatted: string;
  changeLabel: string | null;
  changePositive?: boolean | null;
};

export type EventSalesRow = {
  id: string;
  name: string;
  amountRD: number;
};

export type TicketEventRow = {
  id: string;
  name: string;
  dateLabel: string;
  sold: number;
  total: number;
  revenueRD: number;
};

export type MesaEventRow = {
  id: string;
  name: string;
  reserved: number | null;
  totalMesas: number | null;
  /** Cobrado online (adelantos). */
  revenueRD: number | null;
  /** Saldo pactado por cobrar en el local (si existe desglose). */
  pendienteVenueRD?: number | null;
};

export type TicketMetricsStrip = {
  vendidos: number;
  recaudadoRD: number;
  conversionPct: number;
};

export type MesaMetricsStrip = {
  reservadas: number;
  cobradoEnLineaRD: number;
  pendienteEnLocalRD: number;
  ocupacionPct: number;
};
