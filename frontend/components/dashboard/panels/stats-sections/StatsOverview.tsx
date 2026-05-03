"use client";

import type { ComponentType } from "react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { BarChart3, CalendarRange, Ticket, TrendingUp, Users } from "lucide-react";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import { formatMoney } from "@/lib/format";

const ACCENT_CLASS = "text-[#EC4899]";

function Kpi({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-800/50 p-3">
      <Icon className={`h-4 w-4 ${ACCENT_CLASS}`} aria-hidden />
      <p className="mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-base font-bold tabular-nums ${ACCENT_CLASS}`}>{value}</p>
    </div>
  );
}

/**
 * Vista fija superior del panel móvil Estadísticas (sin título de sección).
 */
export function StatsOverview({
  stats,
  analytics,
}: {
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
}) {
  const occ = analytics?.summary?.occupancyCurrent;
  const salesByDay = analytics?.charts?.salesByDay ?? [];
  const revMonth = stats?.revenue?.totalRD?.month ?? 0;
  const avgTicket =
    analytics?.summary?.tickets?.total && analytics.summary.revenue?.total
      ? analytics.summary.revenue.total / Math.max(1, analytics.summary.tickets.total)
      : 0;

  const nEvents = analytics?.charts?.revenueByEvent?.length ?? 0;
  const ticketsTotal = analytics?.summary?.tickets?.total;
  const asistenciaStr = ticketsTotal != null ? String(ticketsTotal) : "—";
  const ocupacionMedia = occ ? `${Math.round(occ.percentage)}%` : "—";

  const monthlySeries = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of salesByDay) {
      const key = String(d.day).slice(0, 7);
      m.set(key, (m.get(key) ?? 0) + d.total);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, total]) => ({
        label: mes.slice(5),
        total,
      }));
  }, [salesByDay]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Kpi icon={TrendingUp} label="Ingresos totales del mes" value={formatMoney(Number(revMonth) || 0)} />
        <Kpi icon={CalendarRange} label="Eventos realizados" value={String(nEvents)} />
        <Kpi icon={Users} label="Asistencia total" value={asistenciaStr} />
        <Kpi icon={Ticket} label="Ticket promedio global" value={avgTicket > 0 ? formatMoney(avgTicket) : "—"} />
        <Kpi icon={BarChart3} label="Tasa de ocupación media" value={ocupacionMedia} />
      </div>

      <div>
        <p className={`mb-2 text-[11px] font-medium uppercase tracking-wide ${ACCENT_CLASS}`}>Evolución mensual</p>
        <div className="h-36 w-full">
          {monthlySeries.length === 0 ? (
            <p className="flex h-full items-center justify-center text-xs text-slate-500">Sin datos de evolución.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlySeries} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewPink" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    background: "#18181b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [formatMoney(v), "Ingresos"]}
                />
                <Area type="monotone" dataKey="total" stroke="#EC4899" fill="url(#overviewPink)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
