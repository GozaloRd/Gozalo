import type {
  EventSalesRow,
  MesaEventRow,
  MockOrder,
  SalesKpiCard,
  TicketEventRow,
  MesaMetricsStrip,
  TicketMetricsStrip,
} from "./types";

export const MOCK_KPIS: SalesKpiCard[] = [
  {
    key: "today",
    label: "HOY",
    valueFormatted: "RD$ 0",
    changeLabel: "—",
    changePositive: null,
  },
  {
    key: "week",
    label: "SEMANA · ÚLT. 7 DÍAS",
    valueFormatted: "RD$ 13,558",
    changeLabel: "▲ +352%",
    changePositive: true,
  },
  {
    key: "month",
    label: "MES · ÚLT. 30 DÍAS",
    valueFormatted: "RD$ 16,557",
    changeLabel: "—",
    changePositive: null,
  },
  {
    key: "avg",
    label: "TICKET PROM. (30D)",
    valueFormatted: "RD$ 1,285",
    changeLabel: null,
    changePositive: null,
  },
];

export const MOCK_VENTAS_POR_EVENTO: EventSalesRow[] = [
  { id: "1", name: "Cupid", amountRD: 10_060 },
  { id: "2", name: "Lost in Time", amountRD: 5997 },
  { id: "3", name: "The Last Dance", amountRD: 500 },
];

/** Vista 1: solo 3 eventos en lista */
export const MOCK_VENTAS_EVENTOS_VISTA1 = MOCK_VENTAS_POR_EVENTO.slice(0, 3);

export const MOCK_TICKET_STRIP: TicketMetricsStrip = {
  vendidos: 9,
  recaudadoRD: 8997,
  conversionPct: 0.9,
};

export const MOCK_TICKET_TABLE: TicketEventRow[] = [
  { id: "t1", name: "The Last Dance", dateLabel: "28 Abr", sold: 1, total: 270, revenueRD: 500 },
  { id: "t2", name: "Lost in Time", dateLabel: "3 May", sold: 3, total: 199, revenueRD: 5997 },
  { id: "t3", name: "Cupid", dateLabel: "20 May", sold: 5, total: 170, revenueRD: 8060 },
  { id: "t4", name: "NTG Party", dateLabel: "27 May", sold: 0, total: 354, revenueRD: 0 },
];

export const MOCK_MESA_STRIP: MesaMetricsStrip = {
  reservadas: 1,
  cobradoEnLineaRD: 7560,
  pendienteEnLocalRD: 0,
  ocupacionPct: 10,
};

export const MOCK_MESA_EVENTOS: MesaEventRow[] = [
  { id: "m1", name: "Cupid", reserved: 1, totalMesas: 5, revenueRD: 7560 },
  { id: "m2", name: "The Last Dance", reserved: 0, totalMesas: 5, revenueRD: 0 },
  { id: "m3", name: "Lost in Time", reserved: null, totalMesas: null, revenueRD: null },
  { id: "m4", name: "NTG Party", reserved: null, totalMesas: null, revenueRD: null },
];

/** Órdenes recientes (Vista 1) — 6 filas */
export const MOCK_RECENT_ORDERS: MockOrder[] = [
  {
    id: "6A04E8B7",
    eventName: "Cupid",
    timeLabel: "hace 2 días",
    amountRD: 1000,
    status: "completed",
    kind: "tickets",
  },
  {
    id: "85A000ED",
    eventName: "Cupid",
    timeLabel: "hace 2 días",
    amountRD: 1000,
    status: "completed",
    kind: "tickets",
  },
  {
    id: "12149D10",
    eventName: "Lost in Time",
    timeLabel: "hace 5 días",
    amountRD: 1999,
    status: "completed",
    kind: "tickets",
  },
  {
    id: "995B8F72",
    eventName: "Lost in Time",
    timeLabel: "hace 5 días",
    amountRD: 1999,
    status: "completed",
    kind: "tickets",
  },
  {
    id: "99FC1694",
    eventName: "Cupid",
    timeLabel: "hace 5 días",
    amountRD: 7560,
    status: "pending",
    kind: "mesas",
  },
  {
    id: "01F5460B",
    eventName: "Cupid",
    timeLabel: "hace 7 días",
    amountRD: 500,
    status: "completed",
    kind: "tickets",
  },
];

/** Lista extendida para Vista 2 (filtrado mock) */
export const MOCK_ALL_ORDERS: MockOrder[] = [
  ...MOCK_RECENT_ORDERS,
  {
    id: "A1B2C3D4",
    eventName: "NTG Party",
    timeLabel: "hace 10 días",
    amountRD: 250,
    status: "refunded",
    kind: "tickets",
    clientHint: "María",
  },
  {
    id: "E5F60789",
    eventName: "Cupid",
    timeLabel: "hace 1 día",
    amountRD: 3200,
    status: "pending",
    kind: "mesas",
  },
];
