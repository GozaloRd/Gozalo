"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardList,
  TableProperties,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo } from "react";
import useSWR from "swr";
import { useDashboard } from "@/contexts/DashboardContext";
import { deriveUiStatus, orderVenueNetTotal } from "@/components/dashboard/panels/orders-flow/orderUi";
import {
  mergeVentasFeed,
  periodRangeISO,
  inFeedPeriod,
  type DashboardReservationListRow,
  type DashboardTicketListRow,
} from "@/components/dashboard/panels/orders-flow/mergeVentasFeed";
import { formatMoney } from "@/lib/format";
import {
  formatReservationVentaMontoLine,
  reservationVentasStatus,
} from "@/lib/reservationVentaUi";
import {
  fetchDashboardEvents,
  fetchDashboardOrders,
  fetchDashboardReservations,
  fetchDashboardTables,
  fetchDashboardTickets,
  type DashboardOrderRow,
  type SalesPeriodBlock,
} from "@/lib/dashboardApi";
import {
  useSalesPanelMetrics,
  type DashboardSalesPanelMetrics,
} from "@/hooks/useSalesMetrics";
import type { MesaEventRow, OrderStatus, SalesKpiCard, TicketEventRow } from "./types";
import { ProgressBar } from "./ProgressBar";
import { StatusIcon } from "./StatusIcon";

type DbEventLite = {
  id: string;
  title: string;
  startAt: string;
  status?: string;
  publicado?: boolean;
  ticketTypes?: { quantityTotal?: number | null; active?: boolean }[];
};

function publishedVenueEvents(rows: DbEventLite[]) {
  return rows.filter(
    (e) =>
      e.status !== "cancelled" && (e.status === "published" || e.publicado === true)
  );
}

function pctLine(block?: SalesPeriodBlock): { label: string | null; positive: boolean | null } {
  if (!block?.hasComparison || block.percentChange == null || block.trend == null) {
    return { label: null, positive: null };
  }
  if (block.trend === "neutral") {
    return { label: "→ 0%", positive: null };
  }
  const pct = `${block.percentChange > 0 ? "+" : ""}${Math.round(block.percentChange)}%`;
  return block.trend === "up"
    ? { label: `↗ ${pct}`, positive: true }
    : { label: `↘ ${pct}`, positive: false };
}

function buildKpis(m: DashboardSalesPanelMetrics): SalesKpiCard[] {
  const weekLabel = `SEMANA · ${m.periodLabels?.week?.toUpperCase() ?? "ÚLT. 7 DÍAS"}`;
  const monthLabel = `MES · ${m.periodLabels?.month?.toUpperCase() ?? "ÚLT. 30 DÍAS"}`;
  const monthListSum =
    m.revenueByEvent != null
      ? m.revenueByEvent.reduce((s, r) => s + Number(r.total || 0), 0)
      : null;
  const monthNum =
    monthListSum != null
      ? monthListSum > 0.005
        ? Number(monthListSum.toFixed(2))
        : m.month?.total ?? 0
      : m.month?.total ?? 0;

  const avg =
    m.averageTicketNote === "ok" && m.averageTicket != null
      ? formatMoney(m.averageTicket)
      : m.averageTicketNote === "insufficient"
        ? "Sin datos suficientes"
        : m.averageTicketNote === "no_orders"
          ? "Sin órdenes en período"
          : m.averageTicket != null
            ? formatMoney(m.averageTicket)
            : "Sin datos";

  const td = pctLine(m.today);
  const wk = pctLine(m.week);
  const mn = pctLine(m.month);

  return [
    {
      key: "today",
      label: "HOY",
      valueFormatted: formatMoney(m.today?.total ?? 0),
      changeLabel: td.label ?? "—",
      changePositive: td.positive,
    },
    {
      key: "week",
      label: weekLabel,
      valueFormatted: formatMoney(m.week?.total ?? 0),
      changeLabel: wk.label ?? "—",
      changePositive: wk.positive,
    },
    {
      key: "month",
      label: monthLabel,
      valueFormatted: formatMoney(monthNum),
      changeLabel: mn.label ?? "—",
      changePositive: mn.positive,
    },
    {
      key: "avg",
      label: "TICKET PROM. (30D)",
      valueFormatted: avg,
      changeLabel: null,
      changePositive: null,
    },
  ];
}

function statusFromOrder(order: DashboardOrderRow): OrderStatus {
  const ui = deriveUiStatus(order);
  if (ui === "completed") return "completed";
  if (ui === "pending" || ui === "processing") return "pending";
  return "refunded";
}

function ticketPaid(estado: string) {
  return ["paid", "valid", "used"].includes(String(estado || "").toLowerCase());
}

function reservationActive(estado: string) {
  const e = String(estado || "").toLowerCase();
  return !["cancelled", "no_show"].includes(e);
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35 },
  },
};

export function DashboardView({ onOpenAllOrders }: { onOpenAllOrders: () => void }) {
  const { venueId } = useDashboard();
  const {
    data: salesMetrics,
    error: salesError,
    isLoading: salesLoading,
  } = useSalesPanelMetrics(venueId ?? null);

  const { data: detail, error: detailError } = useSWR(
    venueId ? (["sales-desktop-ventas-detail", venueId] as const) : null,
    async ([_, vId]) => {
      const range = periodRangeISO("month");
      const listParams: Record<string, string> = {
        page: "1",
        pageSize: "500",
        from: range.from,
        to: range.to,
      };

      const [evRes, ticketsRes, reservationsRes, ordersRes] = await Promise.all([
        fetchDashboardEvents("all", vId),
        fetchDashboardTickets(listParams, vId),
        fetchDashboardReservations(listParams, vId),
        fetchDashboardOrders(vId, {
          period: "month",
          status: "all",
          type: "all",
          limit: 200,
          offset: 0,
        }),
      ]);

      const eventsRaw = ((evRes as { data?: DbEventLite[] })?.data ?? []).filter(
        (e) => e.status !== "cancelled"
      );
      const pub = publishedVenueEvents(eventsRaw);
      const sortedEv = [...pub].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

      const ticketRows =
        (ticketsRes as { data?: DashboardTicketListRow[] }).data ?? [];
      const resvRows =
        (reservationsRes as { data?: DashboardReservationListRow[] }).data ?? [];
      const orderRows = (ordersRes as { data?: DashboardOrderRow[] }).data ?? [];

      const tableTotals = new Map<string, number>();
      await Promise.all(
        sortedEv.slice(0, 18).map(async (ev) => {
          try {
            const tb = await fetchDashboardTables(ev.id, vId, { tableScope: "event" });
            const mesas =
              (
                tb as {
                  mesas?: { active?: boolean }[];
                }
              ).mesas ?? [];
            tableTotals.set(
              ev.id,
              mesas.filter((m) => m.active !== false).length
            );
          } catch {
            tableTotals.set(ev.id, 0);
          }
        })
      );

      const byTicket = new Map<string, { sold: number; revenue: number }>();
      for (const t of ticketRows) {
        if (!inFeedPeriod(t.creadoEn, "month")) continue;
        if (!ticketPaid(t.estado)) continue;
        const eid = t.evento?.id;
        if (!eid) continue;
        const cur = byTicket.get(eid) ?? { sold: 0, revenue: 0 };
        cur.sold += 1;
        cur.revenue += Number(t.montoRD || 0);
        byTicket.set(eid, cur);
      }

      const byResv = new Map<string, { n: number; cobrado: number; pendiente: number }>();
      for (const r of resvRows) {
        if (!inFeedPeriod(r.creadoEn, "month")) continue;
        if (!reservationActive(r.estado)) continue;
        const eid = r.evento?.id;
        if (!eid) continue;
        const cur = byResv.get(eid) ?? { n: 0, cobrado: 0, pendiente: 0 };
        cur.n += 1;
        const cobrado =
          r.ingresoNetoLocalRD != null && Number.isFinite(Number(r.ingresoNetoLocalRD))
            ? Number(r.ingresoNetoLocalRD)
            : r.pagadoEnLineaRD != null && Number.isFinite(Number(r.pagadoEnLineaRD))
              ? Number(r.pagadoEnLineaRD)
              : Number(r.montoRD || 0);
        const pend =
          r.saldoPendienteRD != null && Number.isFinite(Number(r.saldoPendienteRD))
            ? Number(r.saldoPendienteRD)
            : 0;
        cur.cobrado += cobrado;
        cur.pendiente += pend;
        byResv.set(eid, cur);
      }

      let capSum = 0;
      let soldSum = 0;
      let revSumTickets = 0;
      const ticketTable: TicketEventRow[] = sortedEv.map((ev) => {
        const slots = (ev.ticketTypes ?? [])
          .filter((tt) => tt.active !== false)
          .reduce((s, tt) => s + (Number(tt.quantityTotal) || 0), 0);
        capSum += slots;
        const agg = byTicket.get(ev.id) ?? { sold: 0, revenue: 0 };
        soldSum += agg.sold;
        revSumTickets += agg.revenue;
        const d = new Date(ev.startAt);
        const dateLabel = d.toLocaleDateString("es-DO", { day: "numeric", month: "short" });
        return {
          id: ev.id,
          name: ev.title,
          dateLabel,
          sold: agg.sold,
          total: slots || 0,
          revenueRD: agg.revenue,
        };
      });

      let resvN = 0;
      let resvCobrado = 0;
      let resvPendiente = 0;
      let totalMesasVenue = 0;
      const mesaRows: MesaEventRow[] = sortedEv.map((ev) => {
        const totals = tableTotals.get(ev.id) ?? 0;
        totalMesasVenue += totals;
        const m = byResv.get(ev.id);
        const n = m?.n ?? 0;
        const cobrado = m?.cobrado ?? 0;
        const pendiente = m?.pendiente ?? 0;
        resvN += n;
        resvCobrado += cobrado;
        resvPendiente += pendiente;
        return {
          id: ev.id,
          name: ev.title,
          reserved: totals > 0 ? n : null,
          totalMesas: totals > 0 ? totals : null,
          revenueRD: totals > 0 ? cobrado : null,
          pendienteVenueRD: totals > 0 && pendiente > 0 ? pendiente : null,
        };
      });

      const conversionPct =
        capSum > 0 ? Math.min(100, Math.round((soldSum / capSum) * 1000) / 10) : 0;

      const merged = mergeVentasFeed(orderRows, ticketRows, resvRows, {
        period: "month",
        status: "all",
        type: "all",
        eventId: null,
      }, "");

      const recent = merged.slice(0, 6).map((it) => {
        let amountRD = 0;
        let eventName = "—";
        let status: OrderStatus = "completed";
        let id = "";
        let sortMs = 0;
        if (it.kind === "order") {
          amountRD = orderVenueNetTotal(it.order);
          eventName = it.order.event?.title ?? "Sin evento";
          status = statusFromOrder(it.order);
          id = String(it.order.id).slice(0, 8).toUpperCase();
          sortMs = it.sortAt;
        } else if (it.kind === "ticket") {
          amountRD = Number(it.ticket.montoRD || 0);
          eventName = it.ticket.evento?.titulo ?? "Evento";
          const e = String(it.ticket.estado || "").toLowerCase();
          status =
            e === "cancelled"
              ? "refunded"
              : ["paid", "valid", "used"].includes(e)
                ? "completed"
                : "pending";
          id = String(it.ticket.id).slice(0, 8).toUpperCase();
          sortMs = it.sortAt;
        } else {
          const ingreso =
            it.reservation.ingresoNetoLocalRD != null &&
            Number.isFinite(Number(it.reservation.ingresoNetoLocalRD))
              ? Number(it.reservation.ingresoNetoLocalRD)
              : null;
          amountRD =
            ingreso ??
            (it.reservation.pagadoEnLineaRD != null
              ? Number(it.reservation.pagadoEnLineaRD)
              : Number(it.reservation.montoRD || 0));
          eventName = it.reservation.evento?.titulo ?? "Evento";
          status = reservationVentasStatus(it.reservation);
          id = String(it.reservation.id).slice(0, 8).toUpperCase();
          sortMs = it.sortAt;
        }
        const timeLabel = formatDistanceToNow(new Date(sortMs), {
          addSuffix: true,
          locale: es,
        });
        const amountLine =
          it.kind === "reservation"
            ? formatReservationVentaMontoLine(it.reservation, formatMoney)
            : undefined;
        return { id, eventName, timeLabel, amountRD, amountLine, status };
      });

      const ocupacionPct =
        totalMesasVenue > 0 ? Math.min(100, Math.round((resvN / totalMesasVenue) * 100)) : 0;

      return {
        ticketStrip: { vendidos: soldSum, recaudadoRD: revSumTickets, conversionPct },
        ticketTable,
        mesaStrip: {
          reservadas: resvN,
          cobradoEnLineaRD: resvCobrado,
          pendienteEnLocalRD: resvPendiente,
          ocupacionPct,
        },
        mesaRows,
        recent,
      };
    },
    {
      refreshInterval: 35_000,
      revalidateOnFocus: true,
    }
  );

  const kpis = useMemo(
    () => (salesMetrics ? buildKpis(salesMetrics) : null),
    [salesMetrics]
  );

  const ventasPorEvento = useMemo(() => {
    const rows =
      salesMetrics?.revenueByEvent?.map((r) => ({
        id: r.eventId,
        name: r.eventTitle,
        amountRD: Number(r.total || 0),
      })) ?? [];
    return [...rows].sort((a, b) => b.amountRD - a.amountRD);
  }, [salesMetrics]);
  const maxVentas = Math.max(...ventasPorEvento.map((e) => e.amountRD), 1);

  const showSalesSkeleton = salesLoading && !salesMetrics;
  const detailErr = Boolean(detailError);

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pb-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            WORKSPACE · VENTAS
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">Ventas</h1>
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
          Ventas
        </span>
      </div>

      {salesError ? (
        <p className="text-sm text-red-400/90">
          No se pudieron cargar las métricas de ventas. Revisa tu conexión o vuelve a intentar.
        </p>
      ) : null}

      <motion.div
        className="flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(showSalesSkeleton ? [0, 1, 2, 3] : kpis ?? []).map((k, idx) =>
            typeof k === "number" ? (
              <motion.div
                key={`sk-${idx}`}
                variants={cardVariants}
                className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="mt-4 h-7 w-32 rounded bg-white/10" />
              </motion.div>
            ) : (
              <motion.div
                key={k.key}
                variants={cardVariants}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <p className="text-[10px] uppercase tracking-widest text-white/40">{k.label}</p>
                <p className="mt-3 text-xl font-bold text-white">{k.valueFormatted}</p>
                {k.changeLabel != null ? (
                  <p
                    className={`mt-2 text-xs ${
                      k.changePositive === true
                        ? "text-emerald-400"
                        : k.changePositive === false
                          ? "text-red-400"
                          : "text-white/30"
                    }`}
                  >
                    {k.changeLabel}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-transparent">—</p>
                )}
              </motion.div>
            )
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.div variants={cardVariants} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  Ventas por evento
                </h2>
              </div>
              <span className="text-[10px] text-white/30">
                {salesMetrics?.periodLabels?.revenueByEventScope === "30d"
                  ? salesMetrics.periodLabels.month ?? "Últimos 30 días"
                  : "Periodo configurado"}
              </span>
            </div>
            <ul className="mt-4 space-y-4">
              {ventasPorEvento.length === 0 && !showSalesSkeleton ? (
                <li className="text-sm text-white/40">Sin ingresos atribuidos a eventos en este período.</li>
              ) : ventasPorEvento.length === 0 && showSalesSkeleton ? (
                <li className="animate-pulse text-sm text-white/20">Cargando…</li>
              ) : (
                ventasPorEvento.map((ev) => {
                  const pct = maxVentas > 0 ? (ev.amountRD / maxVentas) * 100 : 0;
                  return (
                    <li key={ev.id}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-white/80">{ev.name}</span>
                        <span className="shrink-0 tabular-nums text-emerald-400">
                          {formatMoney(ev.amountRD)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar pct={pct} />
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </motion.div>

          <motion.div variants={cardVariants} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 shrink-0 text-pink-400" aria-hidden />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60">Tickets</h2>
            </div>
            {detailErr ? (
              <p className="mt-3 text-xs text-white/40">Detalle por evento no disponible.</p>
            ) : detail ? (
              <p className="mt-3 text-[10px] uppercase tracking-wider text-white/50">
                {detail.ticketStrip.vendidos} vendidos ·{" "}
                {formatMoney(detail.ticketStrip.recaudadoRD)} recaudado ·{" "}
                {detail.ticketStrip.conversionPct}% conversión
              </p>
            ) : (
              <p className="mt-3 text-[10px] text-white/30">…</p>
            )}
            <div className="mt-4 border-b border-white/5 pb-2 text-[10px] uppercase tracking-widest text-white/40">
              <div className="grid grid-cols-[minmax(0,1.2fr)_auto_auto_auto] gap-2">
                <span>Nombre</span>
                <span className="text-center">Fecha</span>
                <span className="text-center">Vend./Tot.</span>
                <span className="text-right">Recaudado</span>
              </div>
            </div>
            <ul className="divide-y divide-white/5">
              {(detail?.ticketTable ?? []).map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-[minmax(0,1.2fr)_auto_auto_auto] gap-2 py-3 text-sm text-white/80"
                >
                  <span className="min-w-0 truncate">{row.name}</span>
                  <span className="text-center text-white/50">{row.dateLabel}</span>
                  <span className="text-center tabular-nums text-white/70">
                    {row.sold}/{row.total || "—"}
                  </span>
                  <span className="text-right tabular-nums text-emerald-400/90">
                    {formatMoney(row.revenueRD)}
                  </span>
                </li>
              ))}
              {!detail && !detailErr ? (
                <li className="py-6 text-center text-sm text-white/30">Cargando tabla…</li>
              ) : null}
              {detailErr ? (
                <li className="py-6 text-center text-xs text-white/40">Sin datos.</li>
              ) : null}
            </ul>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <motion.div variants={cardVariants} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2">
              <TableProperties className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60">
                Mesas / reservas
              </h2>
            </div>
            {detailErr ? (
              <p className="mt-3 text-xs text-white/40">Detalle no disponible.</p>
            ) : detail ? (
              <p className="mt-3 text-[10px] uppercase tracking-wider text-white/50">
                {detail.mesaStrip.reservadas} reservadas ·{" "}
                <span className="text-emerald-300">{formatMoney(detail.mesaStrip.cobradoEnLineaRD)} cobrado</span>
                {detail.mesaStrip.pendienteEnLocalRD > 0.009 ? (
                  <>
                    {" "}
                    · <span className="text-amber-200">{formatMoney(detail.mesaStrip.pendienteEnLocalRD)} pend.</span>
                  </>
                ) : null}{" "}
                · {detail.mesaStrip.ocupacionPct}% ocupación
              </p>
            ) : (
              <p className="mt-3 text-[10px] text-white/30">…</p>
            )}
            <ul className="mt-4 space-y-4">
              {(detail?.mesaRows ?? []).map((ev) => {
                const hasMesas = ev.totalMesas != null && ev.totalMesas > 0;
                const pct =
                  hasMesas && ev.reserved != null && ev.totalMesas != null
                    ? (ev.reserved / ev.totalMesas) * 100
                    : 0;
                return (
                  <li key={ev.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate text-white/80">{ev.name}</span>
                      <span className="shrink-0 text-right text-white/70">
                        {hasMesas && ev.reserved != null ? (
                          <>
                            {ev.reserved}/{ev.totalMesas} mesas ·{" "}
                            <span className="tabular-nums text-emerald-400">
                              {ev.revenueRD != null ? formatMoney(ev.revenueRD) : "—"} cob.
                            </span>
                            {ev.pendienteVenueRD != null && ev.pendienteVenueRD > 0.009 ? (
                              <span className="tabular-nums text-amber-300">
                                {" "}
                                · {formatMoney(ev.pendienteVenueRD)} pend.
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-white/40">Sin mesas · —</span>
                        )}
                      </span>
                    </div>
                    {hasMesas ? (
                      <div className="mt-2">
                        <ProgressBar pct={pct} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {!detail && !detailErr ? (
                <li className="text-sm text-white/30">Cargando…</li>
              ) : null}
            </ul>
          </motion.div>

          <motion.div variants={cardVariants} className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 shrink-0 text-blue-400" aria-hidden />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/60">
                  Órdenes recientes
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenAllOrders}
                className="group inline-flex items-center gap-1 text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Ver todas
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </button>
            </div>
            <ul className="mt-4 space-y-3">
              {(detail?.recent ?? []).map((o) => (
                <li
                  key={`${o.id}-${o.timeLabel}-${o.amountRD}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2 text-sm"
                >
                  <StatusIcon status={o.status} />
                  <span className="font-mono text-xs text-white/70">#{o.id}</span>
                  <span className="min-w-0 truncate text-white/80">{o.eventName}</span>
                  <span className="text-right text-xs text-white/40">{o.timeLabel}</span>
                  <span className="max-w-[52%] text-right text-xs tabular-nums text-white sm:text-sm">
                    {o.amountLine ?? formatMoney(o.amountRD)}
                  </span>
                </li>
              ))}
              {!detail && !detailErr ? (
                <li className="text-sm text-white/30">Cargando órdenes…</li>
              ) : null}
              {detailErr ? <li className="text-xs text-white/40">Sin datos.</li> : null}
            </ul>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
