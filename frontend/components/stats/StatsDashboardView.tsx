"use client";

import { motion } from "framer-motion";
import {
  BarChart2,
  ChevronRight,
  GitCompare,
  PieChart,
  TrendingUp,
} from "lucide-react";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import { useMonthlyEvolutionSeries, useStatsOverviewKpis } from "@/hooks/useStatsMobileOverview";
import { useSalesPanelMetrics } from "@/hooks/useSalesMetrics";
import type { StatsMainView } from "./types";
import { StatsLineChart } from "./StatsLineChart";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function StatsDashboardView({
  onNavigate,
  venueId,
  stats,
  analytics,
}: {
  onNavigate: (v: Exclude<StatsMainView, "dashboard">) => void;
  venueId: string;
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
}) {
  const { data: salesMetrics } = useSalesPanelMetrics(venueId || null);
  const kpis = useStatsOverviewKpis(stats, analytics, salesMetrics ?? undefined);
  const { points } = useMonthlyEvolutionSeries(analytics);
  const row1 = kpis.slice(0, 3);
  const row2 = kpis.slice(3, 6);
  const evolution = points.map((p) => ({ label: p.label, value: p.revenue }));

  const accesses: {
    id: Exclude<StatsMainView, "dashboard">;
    title: string;
    sub: string;
    Icon: typeof BarChart2;
  }[] = [
    {
      id: "events",
      title: "Estadísticas por evento",
      sub: "Detalle de cada evento",
      Icon: BarChart2,
    },
    {
      id: "comparative",
      title: "Comparativa entre eventos",
      sub: "Compara métricas lado a lado",
      Icon: GitCompare,
    },
    {
      id: "trends",
      title: "Tendencias por mes / día",
      sub: "Patrones temporales",
      Icon: TrendingUp,
    },
    {
      id: "channels",
      title: "Análisis de canales",
      sub: "Tickets · Mesas",
      Icon: PieChart,
    },
  ];

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            WORKSPACE · ESTADÍSTICAS
          </p>
          <h1 className="mt-1 text-lg font-semibold text-white">Estadísticas</h1>
        </div>
        <span className="rounded-full border border-pink-500/40 bg-pink-500/15 px-3 py-1 text-xs font-medium text-pink-400">
          Estadísticas
        </span>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {row1.map((m) => {
            const Icon = m.Icon;
            return (
              <motion.div
                key={m.label}
                variants={itemVariants}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-pink-500" aria-hidden />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{m.label}</p>
                </div>
                <p className="mt-3 text-xl font-bold text-white">{m.value}</p>
                {m.subLine ? <p className="mt-2 text-xs text-white/40">{m.subLine}</p> : null}
                {m.trendText ? (
                  <p
                    className={`mt-2 text-xs ${
                      m.trendText === "—"
                        ? "text-white/30"
                        : m.trendKind === "down"
                          ? "text-red-400"
                          : m.trendKind === "up"
                            ? "text-emerald-400"
                            : "text-white/40"
                    }`}
                  >
                    {m.trendText}
                  </p>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {row2.map((m) => {
            const Icon = m.Icon;
            return (
              <motion.div
                key={m.label}
                variants={itemVariants}
                className="rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-pink-500" aria-hidden />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{m.label}</p>
                </div>
                <p className="mt-3 text-xl font-bold text-white">{m.value}</p>
                {m.subLine ? <p className="mt-2 text-xs text-white/40">{m.subLine}</p> : null}
                {m.trendText ? (
                  <p
                    className={`mt-2 text-xs ${
                      m.trendText === "—"
                        ? "text-white/30"
                        : m.trendKind === "down"
                          ? "text-red-400"
                          : m.trendKind === "up"
                            ? "text-emerald-400"
                            : "text-white/40"
                    }`}
                  >
                    {m.trendText}
                  </p>
                ) : null}
              </motion.div>
            );
          })}
        </div>

        {/* Fila 3: 60% evolución / 40% accesos */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-6">
          <motion.div variants={itemVariants} className="rounded-xl border border-white/10 bg-white/5 p-5 lg:col-span-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Evolución mensual</p>
            <div className="mt-4 min-h-[240px]">
              {evolution.length === 0 ? (
                <p className="flex min-h-[240px] items-center justify-center text-sm text-white/45">
                  Sin historial de ingresos para graficar.
                </p>
              ) : (
                <StatsLineChart data={evolution} showSecondLine={false} showArea={false} height={260} />
              )}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="rounded-xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Análisis detallado</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {accesses.map((a) => (
                <motion.button
                  key={a.id}
                  type="button"
                  onClick={() => onNavigate(a.id)}
                  whileHover={{ scale: 1.02, borderColor: "rgba(236,72,153,0.35)" }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/[0.08]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a.Icon className="h-4 w-4 shrink-0 text-pink-500" aria-hidden />
                      <span className="text-sm font-medium text-white">{a.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">{a.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/30" aria-hidden />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
