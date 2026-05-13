import type { LucideIcon } from "lucide-react";
import { BarChart3, Calendar, Target, TrendingUp, UserPlus, Users } from "lucide-react";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import type { DashboardSalesPanelMetrics } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

export type StatsTrendKind = "up" | "down" | "neutral" | "none";

export type StatsKpiDerived = {
  key: string;
  label: string;
  value: string;
  subLine?: string;
  trendKind: StatsTrendKind;
  trendText: string;
  Icon: LucideIcon;
};

const MIN_PCT = 0.05;

function kindFromMonthPct(pct: number | null | undefined): { kind: StatsTrendKind; text: string; has: boolean } {
  if (pct == null || !Number.isFinite(pct)) return { kind: "none", text: "—", has: false };
  if (Math.abs(pct) < MIN_PCT) return { kind: "neutral", text: "→ 0%", has: true };
  if (pct > 0) return { kind: "up", text: `↗ +${Math.round(pct)}%`, has: true };
  return { kind: "down", text: `↘ ${Math.round(pct)}%`, has: true };
}

/** KPIs 2×3 — prioriza `/dashboard/sales-metrics` (misma fuente que Ventas) cuando existe. */
export function buildStatsKpis(
  stats: MobileStats | null,
  analytics: MobileAnalytics | null,
  salesMetrics?: DashboardSalesPanelMetrics | null
): StatsKpiDerived[] {
  const smMonth = salesMetrics?.month?.total != null ? Number(salesMetrics.month.total) : null;
  const revMonth =
    smMonth != null && smMonth > 0.005
      ? smMonth
      : Number(stats?.revenue?.totalRD?.month ?? 0);
  const revTr = kindFromMonthPct(stats?.revenue?.changeVsPrevious?.monthPct);
  const ingresosSub =
    smMonth != null && smMonth > 0.005 ? "Misma base que Ventas (últimos 30 días)" : undefined;

  const nEvents = analytics?.charts?.revenueByEvent?.length ?? 0;
  const eventsSub =
    stats?.activeEvents != null ? `${stats.activeEvents} activos` : undefined;

  const ticketsTotal = analytics?.summary?.tickets?.total;
  const asistStr = ticketsTotal != null ? String(ticketsTotal) : "0";
  const asistSubEmpty =
    ticketsTotal == null
      ? "Aún no recibimos el total de entradas del período; debería alinearse con el panel de Tickets."
      : undefined;
  const asistTr = kindFromMonthPct(stats?.ticketsSold?.changeVsPrevious?.monthPct);

  const ticketRevenue = Number(analytics?.revenueChannels?.combined?.entradas?.total ?? 0);
  const avgFromAnalytics =
    ticketsTotal != null && ticketsTotal > 0 && ticketRevenue > 0 ? ticketRevenue / ticketsTotal : 0;

  let avgTicketDisplay: string;
  let avgTicketSubLine: string | undefined;
  if (avgFromAnalytics > 0) {
    avgTicketDisplay = formatMoney(avgFromAnalytics);
    avgTicketSubLine = "Solo tickets, no incluye mesas";
  } else if (salesMetrics?.averageTicketNote === "ok" && salesMetrics.averageTicket != null) {
    avgTicketDisplay = formatMoney(salesMetrics.averageTicket);
    avgTicketSubLine = "Promedio de órdenes pagadas";
  } else {
    avgTicketDisplay = "Sin ventas";
    avgTicketSubLine = "Registra entradas vendidas en el período; el promedio coincidirá con Ventas.";
  }

  const revPct = stats?.revenue?.changeVsPrevious?.monthPct;
  const tktPct = stats?.ticketsSold?.changeVsPrevious?.monthPct;
  let ticketTr: { kind: StatsTrendKind; text: string };
  if (salesMetrics?.averageTicketNote === "ok") {
    const k = kindFromMonthPct(revPct);
    ticketTr = { kind: k.kind, text: k.has ? k.text : "—" };
  } else if (revPct != null && tktPct != null && Number.isFinite(revPct) && Number.isFinite(tktPct)) {
    const diff = revPct - tktPct;
    const k = kindFromMonthPct(diff);
    ticketTr = k.has ? { kind: k.kind, text: k.text } : { kind: "none", text: "—" };
  } else {
    ticketTr = { kind: "none", text: "—" };
  }


  const occRows = analytics?.tables?.occupancyByEvent ?? [];
  const occAvg =
    occRows.length > 0
      ? occRows.reduce((s, r) => s + Number(r.occupancyRate ?? 0), 0) / occRows.length
      : Number(analytics?.summary?.occupancyCurrent?.percentage ?? 0);
  const occStr = occAvg > 0 ? `${Math.round(occAvg)}%` : "Sin datos";
  const occSubLine =
    occAvg <= 0 ? "Cuando haya ventas y control de aforo/validaciones, mostramos la ocupación media." : undefined;
  const occTr = { kind: "none" as StatsTrendKind, text: "—" };

  const resMonth = Number(stats?.reservations?.month ?? 0);
  const nuevosTr = kindFromMonthPct(stats?.reservations?.changeVsPrevious?.monthPct);
  const nuevosStr = resMonth > 0 ? String(resMonth) : "0";
  const nuevosSub = "Reservas del mes (proxy demanda)";

  return [
    {
      key: "ingresos",
      label: "Ingresos totales del mes",
      subLine: ingresosSub,
      value: formatMoney(revMonth),
      trendKind: revTr.kind,
      trendText: revTr.text,
      Icon: TrendingUp,
    },
    {
      key: "eventos",
      label: "Eventos realizados",
      value: String(nEvents),
      subLine: eventsSub,
      trendKind: "none",
      trendText: "—",
      Icon: Calendar,
    },
    {
      key: "asistencia",
      label: "Entradas vendidas",
      subLine: asistSubEmpty ?? "En el período del informe (p. ej. últimos 30 días)",
      value: asistStr,
      trendKind: asistTr.kind,
      trendText: asistTr.text,
      Icon: Users,
    },
    {
      key: "ticketProm",
      label: "Ticket promedio",
      subLine: avgTicketSubLine,
      value: avgTicketDisplay,
      trendKind: ticketTr.kind,
      trendText: ticketTr.text,
      Icon: Target,
    },
    {
      key: "ocupacion",
      label: "Tasa de ocupación media",
      subLine: occSubLine,
      value: occStr,
      trendKind: occTr.kind,
      trendText: occTr.text,
      Icon: BarChart3,
    },
    {
      key: "nuevos",
      label: "Nuevos clientes",
      value: nuevosStr,
      subLine: nuevosSub,
      trendKind: nuevosTr.kind,
      trendText: nuevosTr.text,
      Icon: UserPlus,
    },
  ];
}

export type MonthlyEvolutionPoint = {
  key: string;
  label: string;
  revenue: number;
  /** Mantenido por compatibilidad visual; sin serie real de asistencia mensual, siempre 0. */
  attendanceHint: number;
};

export function buildMonthlyEvolution(
  analytics: MobileAnalytics | null,
  maxMonths = 12
): MonthlyEvolutionPoint[] {
  const salesByDay = analytics?.charts?.salesByDay ?? [];
  const m = new Map<string, number>();
  for (const d of salesByDay) {
    const key = String(d.day).slice(0, 7);
    m.set(key, (m.get(key) ?? 0) + Number(d.total || 0));
  }
  const sorted = Array.from(m.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-maxMonths);

  return sorted.map(([ym, revenue]) => {
    const [y, mo] = ym.split("-");
    const date = new Date(Number(y), Number(mo) - 1, 1);
    const label = date.toLocaleDateString("es-DO", { month: "short" });
    return {
      key: ym,
      label: `${label} ${y?.slice(2) ?? ""}`.trim(),
      revenue: Number(revenue.toFixed(2)),
      attendanceHint: 0,
    };
  });
}
