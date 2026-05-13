import type { ChannelDatum, ComparativeRow, LineDatum, MetricCard } from "./types";

/** Vista 1 — filas 1–2 */
export const MOCK_STATS_DASHBOARD_ROW1: MetricCard[] = [
  {
    label: "INGRESOS TOTALES DEL MES",
    value: "RD$ 16,557",
    sub: "Misma base que Ventas (últimos 30 días)",
    change: "▼ -86%",
    changeNegative: true,
  },
  {
    label: "EVENTOS REALIZADOS",
    value: "5",
    sub: "2 activos",
    change: "—",
    changeNegative: false,
  },
  {
    label: "ENTRADAS VENDIDAS",
    value: "9",
    sub: "En el periodo del informe (últ. 30 días)",
    change: "▼ -20%",
    changeNegative: true,
  },
];

export const MOCK_STATS_DASHBOARD_ROW2: MetricCard[] = [
  {
    label: "TICKET PROMEDIO",
    value: "RD$ 1,285",
    change: "▼ -86%",
    changeNegative: true,
  },
  {
    label: "TASA DE OCUPACIÓN MEDIA",
    value: "1%",
    sub: "—",
  },
  {
    label: "NUEVOS CLIENTES",
    value: "0",
    sub: "Reservas del mes (proxy demanda)",
    change: "▼ -100%",
    changeNegative: true,
  },
];

/** Evolución mensual (línea + proyección) */
export const MOCK_MONTHLY_EVOLUTION: LineDatum[] = [
  { label: "abr 26", value: 1200, secondary: 1000 },
  { label: "abr 27", value: 2400, secondary: 2200 },
  { label: "abr 28", value: 800, secondary: 1500 },
  { label: "abr 29", value: 4200, secondary: 3800 },
  { label: "abr 30", value: 6200, secondary: 5000 },
  { label: "may 01", value: 3100, secondary: 3400 },
  { label: "may 03", value: 8900, secondary: 7200 },
  { label: "may 06", value: 12400, secondary: 11000 },
  { label: "may 26", value: 15200, secondary: 14500 },
];

/** Detalle evento 2B — métricas 3×2 */
export const MOCK_EVENT_DETAIL_METRICS: MetricCard[] = [
  { label: "INGRESOS", value: "RD$ 16,557", sub: "1% vs aforo (vend.)" },
  { label: "CAPACIDAD / ASIGNACIÓN", value: "3/499", sub: "1% ocupación" },
  { label: "TICKET PROM.", value: "RD$ 5,519" },
  {
    label: "PICO DE VENTAS (HORA)",
    value: "Día 04-30",
    sub: "Máx. RD$ 3,998",
  },
  { label: "TIPO DE ENTRADA TOP", value: "ONLY", sub: "Del catálogo" },
  {
    label: "NO-SHOW (ESTIM.)",
    value: "100%",
    sub: "0 validaciones · entradas pagadas vs accesos",
  },
];

export const MOCK_EVENT_VELOCITY: LineDatum[] = [
  { label: "24 abr", value: 0 },
  { label: "26 abr", value: 800 },
  { label: "28 abr", value: 1200 },
  { label: "30 abr", value: 3200 },
  { label: "02 may", value: 2100 },
  { label: "04 may", value: 3998 },
  { label: "06 may", value: 2800 },
  { label: "08 may", value: 1500 },
];

/** Mix ingresos: vacío vs con datos — usar con datos para demo */
export const MOCK_EVENT_MIX_CHANNELS: ChannelDatum[] = [
  { id: "t", name: "Tickets", amount: 12000, color: "#ec4899" },
  { id: "m", name: "Mesas", amount: 4557, color: "#a855f7" },
];

/** Comparativa */
export const MOCK_COMPARATIVE: ComparativeRow[] = [
  { eventId: "e3", name: "Cupid", revenue: 10060, attendance: 6, ticketAvg: 1677, occupancyPct: 3 },
  { eventId: "e2", name: "LOST IN TIME", revenue: 5997, attendance: 3, ticketAvg: 1999, occupancyPct: 1 },
  {
    eventId: "e1",
    name: "The Last dance",
    revenue: 500,
    attendance: 1,
    ticketAvg: 500,
    occupancyPct: 0,
  },
  { eventId: "e4", name: "NTG PARTY", revenue: 0, attendance: 0, ticketAvg: 0, occupancyPct: 0 },
];

export const MOCK_COMPARATIVE_ALL: ComparativeRow[] = [
  ...MOCK_COMPARATIVE,
  { eventId: "e5", name: "bjvks", revenue: 0, attendance: 0, ticketAvg: 0, occupancyPct: 0 },
];

/** Tendencias */
export const MOCK_TRENDS_WEEKDAY: LineDatum[] = [
  { label: "Dom", value: 0 },
  { label: "Lun", value: 2800 },
  { label: "Mar", value: 3000 },
  { label: "Mié", value: 7800 },
  { label: "Jue", value: 4600 },
  { label: "Vie", value: 1000 },
  { label: "Sáb", value: 2000 },
];

export const MOCK_TRENDS_MONTH: LineDatum[] = [
  { label: "Ene", value: 1200 },
  { label: "Feb", value: 2100 },
  { label: "Mar", value: 3400 },
  { label: "Abr", value: 8900 },
  { label: "May", value: 16557 },
];

const HOUR_VALS = [
  120, 80, 60, 90, 110, 240, 400, 520, 380, 290, 310, 340, 360, 400, 450, 380, 420, 1800, 2100, 2400, 2200, 1600,
  900, 400,
];
export const MOCK_TRENDS_HOUR: LineDatum[] = HOUR_VALS.map((value, h) => ({
  label: `${String(h).padStart(2, "0")}:00`,
  value,
}));

/** Canales — poner montos vacíos para estado vacío */
export const MOCK_CHANNELS: ChannelDatum[] = [
  { id: "d", name: "Tickets digitales", amount: 10500, color: "#ec4899" },
  { id: "r", name: "Reservas de mesa", amount: 4200, color: "#e879f9" },
  { id: "c", name: "Cierre manual", amount: 1200, color: "#c084fc" },
  { id: "o", name: "Otro", amount: 657, color: "#818cf8" },
];

/** Alternar para probar estado vacío */
export const SHOW_CHANNELS_EMPTY = false;
