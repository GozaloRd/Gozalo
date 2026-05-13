"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DM_Sans } from "next/font/google";
import { CreditCard, Receipt, Target, Ticket, TrendingUp } from "lucide-react";
import useSWR from "swr";
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import { MobileCard } from "@/components/dashboard/mobile/shared/MobileCard";
import { PanelFooterLinks } from "@/components/dashboard/panels/PanelFooterLinks";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import { RecentOrdersFlow } from "@/components/dashboard/panels/orders-flow/RecentOrdersFlow";
import { TablesFlow } from "@/components/dashboard/panels/tables-flow/TablesFlow";
import { TicketsFlow } from "@/components/dashboard/panels/tickets-flow/TicketsFlow";
import { useSalesPanelMetrics } from "@/hooks/useSalesMetrics";
import { fetchDashboardOrdersSummary } from "@/lib/dashboardApi";
import { buildSalesPanelFallbackMetrics } from "@/lib/salesPanelFallback";
import { MobilePanelRow } from "@/components/dashboard/mobile/shared/MobilePanelRow";
import { formatMoney } from "@/lib/format";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fadeSlide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
};

function SalesTrendIndicator({
  percentChange,
  trend,
  hasComparison,
}: {
  percentChange: number | null | undefined;
  trend: "up" | "down" | "neutral" | null | undefined;
  hasComparison: boolean;
}) {
  if (!hasComparison || percentChange == null || trend == null) {
    return (
      <span className="text-[10px] font-normal tabular-nums tracking-normal text-white/[0.28]">—</span>
    );
  }
  if (trend === "neutral") {
    return (
      <span className="text-[10px] font-medium tabular-nums tracking-normal text-white/[0.28]">
        → 0%
      </span>
    );
  }
  const up = trend === "up";
  const label = `${percentChange > 0 ? "+" : ""}${Math.round(percentChange)}%`;
  return (
    <span
      className={`text-[10px] font-medium tabular-nums tracking-normal [font-variant-numeric:tabular-nums] ${up ? "text-emerald-500" : "text-red-400"}`}
    >
      {up ? "↗" : "↘"} {label}
    </span>
  );
}

export function SalesPanel({
  area,
  stats,
  analytics,
  opsAlertCount,
  venueId,
  nowMs,
  onRegisterVentasCloseGuard,
}: {
  area: QuickAreaConfig;
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
  opsAlertCount: number;
  venueId?: string;
  nowMs?: number;
  onRegisterVentasCloseGuard?: (fn: (() => boolean) | null) => void;
}) {
  const [ticketsMode, setTicketsMode] = useState(false);
  const [tablesMode, setTablesMode] = useState(false);
  const [ordersMode, setOrdersMode] = useState(false);

  const {
    data: salesMetrics,
    error: salesMetricsError,
    isLoading: salesMetricsLoading,
    mutate: mutateSalesMetrics,
  } = useSalesPanelMetrics(venueId ?? null);

  const fallbackMetrics = useMemo(
    () => buildSalesPanelFallbackMetrics(stats, analytics),
    [stats, analytics]
  );
  const effectiveMetrics = salesMetrics ?? fallbackMetrics;

  const { data: ordersSummary } = useSWR(
    venueId ? ["sales-orders-hint", venueId] : null,
    () => fetchDashboardOrdersSummary(venueId!, { period: "today" }),
    { refreshInterval: 30_000 }
  );

  const todayBlock = effectiveMetrics?.today;
  const weekBlock = effectiveMetrics?.week;
  const monthBlock = effectiveMetrics?.month;
  const today = todayBlock?.total ?? 0;
  const week = weekBlock?.total ?? 0;

  /** Card Mes = suma de las filas del desglose mensual (mismo origen que "Ventas por evento"). */
  const monthListSum =
    salesMetrics?.revenueByEvent != null
      ? salesMetrics.revenueByEvent.reduce((s, r) => s + Number(r.total || 0), 0)
      : null;
  const month =
    monthListSum != null
      ? monthListSum > 0.005
        ? Number(monthListSum.toFixed(2))
        : (salesMetrics?.month?.total ?? monthBlock?.total ?? 0)
      : monthBlock?.total ?? 0;

  const orderTotal =
    salesMetrics?.ordersToday.total ?? ordersSummary?.totalOrders ?? effectiveMetrics?.ordersToday.total ?? 0;
  const orderPending =
    salesMetrics?.ordersToday.pending ?? ordersSummary?.pendingCount ?? effectiveMetrics?.ordersToday.pending ?? 0;

  const showMetricsSkeleton = salesMetricsLoading && !effectiveMetrics;
  const avgLabel = (() => {
    if (showMetricsSkeleton) return "…";
    if (!effectiveMetrics) return "Sin datos aún";
    const n = effectiveMetrics.averageTicketNote;
    if (n === "ok" && effectiveMetrics.averageTicket != null) {
      return formatMoney(effectiveMetrics.averageTicket);
    }
    if (n === "insufficient") return "Sin datos suficientes";
    if (n === "no_orders") return "Sin órdenes en este período";
    if (effectiveMetrics.averageTicket != null) return formatMoney(effectiveMetrics.averageTicket);
    return "Sin datos aún";
  })();

  const ticketsHint =
    effectiveMetrics != null
      ? effectiveMetrics.ticketsSoldToday > 0
        ? `${effectiveMetrics.ticketsSoldToday} vendidos hoy`
        : "Sin ventas hoy"
      : undefined;
  const reservHint =
    effectiveMetrics != null
      ? effectiveMetrics.reservationsToday > 0
        ? `${effectiveMetrics.reservationsToday} reservas hoy`
        : "Sin reservas hoy"
      : undefined;
  const ordersHint =
    effectiveMetrics != null
      ? orderTotal > 0 || orderPending > 0
        ? `${orderTotal} hoy · ${orderPending} pendientes`
        : "Sin órdenes hoy"
      : undefined;
  const showHardError = Boolean(salesMetricsError && !fallbackMetrics);
  const showSoftDegraded = Boolean(salesMetricsError && fallbackMetrics);

  useEffect(() => {
    if (!onRegisterVentasCloseGuard) return;
    const fn = () => {
      if (ordersMode) {
        setOrdersMode(false);
        return true;
      }
      if (tablesMode) {
        setTablesMode(false);
        return true;
      }
      if (ticketsMode) {
        setTicketsMode(false);
        return true;
      }
      return false;
    };
    onRegisterVentasCloseGuard(fn);
    return () => onRegisterVentasCloseGuard(null);
  }, [onRegisterVentasCloseGuard, tablesMode, ticketsMode, ordersMode]);

  const showTicketsFlow = Boolean(ticketsMode && venueId);
  const showTablesFlow = Boolean(tablesMode && venueId);
  const showOrdersFlow = Boolean(ordersMode && venueId);

  const chartEv = salesMetrics?.revenueByEvent ?? [];
  const ventasPorEventoSubtitle =
    salesMetrics?.periodLabels?.revenueByEventScope === "30d"
      ? "Últimos 30 días"
      : salesMetricsError || !salesMetrics
        ? "Carga el resumen (conexión) para ver ingresos del mes por evento"
        : null;

  return (
    <div className={`${dmSans.className} tracking-normal`}>
    <AnimatePresence mode="wait">
      {showTicketsFlow ? (
        <motion.div
          key="sales-tickets-flow"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <TicketsFlow
            venueId={venueId!}
            nowMs={nowMs ?? Date.now()}
            onBackToVentas={() => setTicketsMode(false)}
          />
        </motion.div>
      ) : showTablesFlow ? (
        <motion.div
          key="sales-tables-flow"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <TablesFlow
            venueId={venueId!}
            nowMs={nowMs ?? Date.now()}
            onBackToVentas={() => setTablesMode(false)}
          />
        </motion.div>
      ) : showOrdersFlow ? (
        <motion.div
          key="sales-orders-flow"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <RecentOrdersFlow venueId={venueId!} onBack={() => setOrdersMode(false)} />
        </motion.div>
      ) : (
        <motion.div
          key="sales-main"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0 xl:grid-cols-3 [&>*]:min-w-0"
        >
          {showHardError ? (
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-center text-xs text-red-200 lg:col-span-2 xl:col-span-3">
              No se pudieron cargar las ventas.{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => void mutateSalesMetrics()}
              >
                Reintentar
              </button>
            </div>
          ) : null}
          {showSoftDegraded ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-1.5 text-center text-[11px] text-amber-200/90 lg:col-span-2 xl:col-span-3">
              Resumen detallado no disponible; mostrando totales del dashboard.{" "}
              <button
                type="button"
                className="font-semibold underline underline-offset-2"
                onClick={() => void mutateSalesMetrics()}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 lg:col-span-2 xl:col-span-3">
            {showMetricsSkeleton
              ? (["Hoy", "Semana", "Mes"] as const).map((k) => (
                  <div
                    key={k}
                    className="rounded-xl border border-white/[0.08] bg-zinc-950/60 px-2 py-3 text-center"
                  >
                    <p className="text-[10px] font-normal uppercase tracking-[0.12em] text-white/[0.28]">
                      {k}
                    </p>
                    <div className="mx-auto mt-2 h-5 w-16 animate-pulse rounded bg-zinc-800" />
                    <div className="mx-auto mt-2 h-3 w-10 animate-pulse rounded bg-zinc-800" />
                  </div>
                ))
              : (
                  [
                    { k: "Hoy" as const, v: today, block: todayBlock },
                    { k: "Semana" as const, v: week, block: weekBlock },
                    { k: "Mes" as const, v: month, block: monthBlock },
                  ] as const
                ).map((x) => (
                  <div
                    key={x.k}
                    className="rounded-xl border border-white/[0.08] bg-zinc-950/60 px-2 py-3 text-center"
                  >
                    <p className="text-[10px] font-normal uppercase tracking-[0.12em] text-white/[0.28]">
                      {x.k}
                    </p>
                    {x.k === "Semana" ? (
                      <p className="text-[10px] font-normal leading-tight tracking-normal text-white/[0.20]">
                        últ. 7 días
                      </p>
                    ) : null}
                    {x.k === "Mes" ? (
                      <p className="text-[10px] font-normal leading-tight tracking-normal text-white/[0.20]">
                        últ. 30 días
                      </p>
                    ) : null}
                    <p className="mt-1 text-base font-bold tabular-nums tracking-normal text-white [font-variant-numeric:tabular-nums]">
                      {formatMoney(x.v)}
                    </p>
                    <div className="mt-1 flex justify-center">
                      <SalesTrendIndicator
                        percentChange={x.block?.percentChange}
                        trend={x.block?.trend}
                        hasComparison={Boolean(x.block?.hasComparison)}
                      />
                    </div>
                  </div>
                ))}
          </div>

          <MobileCard variant="inner" area="ventas">
            <div className="flex items-center gap-3">
              <div
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.10)] text-[#22c55e]"
                aria-hidden
              >
                <Target className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-normal leading-snug tracking-normal text-white/[0.45]">
                  Ticket promedio (30d)
                </p>
                <p
                  className={`mt-0.5 text-[13px] font-semibold tabular-nums tracking-normal [font-variant-numeric:tabular-nums] ${
                    effectiveMetrics?.averageTicketNote === "ok" && effectiveMetrics.averageTicket != null
                      ? "text-[#22c55e]"
                      : "text-white/[0.35]"
                  }`}
                >
                  {showMetricsSkeleton ? "…" : avgLabel}
                </p>
              </div>
            </div>
          </MobileCard>

          <MobileCard variant="inner" area="ventas">
            <div className="flex items-start gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(34,197,94,0.09)] text-[#22c55e]"
                aria-hidden
              >
                <TrendingUp className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-semibold leading-snug tracking-normal text-white/[0.75]">
                  Ventas por evento
                </h3>
                {ventasPorEventoSubtitle ? (
                  <p className="mt-0.5 text-[11px] font-normal leading-snug tracking-normal text-white/[0.25]">
                    {ventasPorEventoSubtitle}
                  </p>
                ) : null}
              </div>
            </div>
            <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
              {chartEv.length === 0 ? (
                <li className="text-[11px] font-normal tracking-normal text-white/[0.25]">
                  Sin datos de período reciente.
                </li>
              ) : (
                chartEv.slice(0, 12).map((r) => (
                  <li
                    key={r.eventId}
                    className="flex items-center justify-between gap-2 tracking-normal"
                  >
                    <span className="min-w-0 truncate text-[14px] font-normal text-white/[0.75]">
                      {r.eventTitle}
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-[#22c55e] [font-variant-numeric:tabular-nums]">
                      {formatMoney(r.total)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </MobileCard>

          <div className="space-y-3 lg:col-span-2 xl:col-span-3">
            <MobilePanelRow
              Icon={Ticket}
              label="Tickets"
              hint={ticketsHint}
              tone="ventas"
              onRowClick={() => {
                setTicketsMode(true);
                setTablesMode(false);
                setOrdersMode(false);
              }}
            />
            <MobilePanelRow
              Icon={Receipt}
              label="Mesas / reservas"
              hint={reservHint}
              tone="ventas"
              onRowClick={() => {
                setTablesMode(true);
                setTicketsMode(false);
                setOrdersMode(false);
              }}
            />
            <MobilePanelRow
              Icon={CreditCard}
              label="Órdenes recientes"
              hint={ordersHint}
              tone="ventas"
              badgeCount={orderPending > 0 ? orderPending : undefined}
              onRowClick={() => {
                setOrdersMode(true);
                setTicketsMode(false);
                setTablesMode(false);
              }}
            />
          </div>

          <PanelFooterLinks area={area} items={area.items} opsAlertCount={opsAlertCount} />
        </motion.div>
      )}
    </AnimatePresence>
    </div>
  );
}

