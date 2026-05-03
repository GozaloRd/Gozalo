"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchDashboardAnalytics, fetchDashboardEvents } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

type Period = "7d" | "30d" | "all";

const COLORS = ["#9B7FCA", "#3B82F6", "#6B7280", "#10B981"];

type RevenueChannelsPayload = {
  grandDigitalRD: number;
  grandManualRD: number;
  grandCombinedRD: number;
};

export default function EstadisticasPage() {
  const { venueId } = useDashboard();
  const [period, setPeriod] = useState<Period>("30d");
  const [eventId, setEventId] = useState<string>("");
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const [ana, ev] = await Promise.all([
        fetchDashboardAnalytics({ range: period, eventId: eventId || undefined }, venueId),
        fetchDashboardEvents("all", venueId),
      ]);
      setAnalytics(ana as Record<string, unknown>);
      const list = ((ev as { data?: { id: string; title: string }[] })?.data ?? []).map((x) => ({
        id: x.id,
        title: x.title,
      }));
      setEvents(list);
    } catch {
      setAnalytics(null);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [venueId, period, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const charts = analytics?.charts as
    | { salesByDay?: { day: string; total: number }[]; entriesVsTables?: unknown[]; revenueByEvent?: unknown[] }
    | undefined;
  const tables = analytics?.tables as { top5Events?: unknown[]; occupancyByEvent?: unknown[] } | undefined;
  const salesByDay = (charts?.salesByDay ?? []).map((x) => ({ day: String(x.day).slice(5), total: Number(x.total || 0) }));
  const entriesVsTables = (charts?.entriesVsTables ?? []) as { eventTitle: string; tickets: number; tables: number }[];
  const revenueByEvent = (charts?.revenueByEvent ?? []) as { eventTitle: string; total: number }[];
  const top5 = (tables?.top5Events ?? []) as { eventTitle: string; tickets: number; tables: number }[];
  const occupancyRows = (tables?.occupancyByEvent ?? []) as {
    eventTitle: string;
    capacity: number;
    attended: number;
    occupancyRate: number;
  }[];

  const revenueChannels = analytics?.revenueChannels as RevenueChannelsPayload | undefined;

  const appFueraPie = useMemo(() => {
    if (!revenueChannels) return [];
    return [
      { name: "En la app", value: Math.max(0, revenueChannels.grandDigitalRD) },
      { name: "Fuera de la app (caja)", value: Math.max(0, revenueChannels.grandManualRD) },
    ].filter((x) => x.value > 0);
  }, [revenueChannels]);

  if (loading) {
    return <div className="animate-pulse text-sm text-[#6B7280]">Cargando estadísticas...</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#111118] p-3">
        {(["7d", "30d", "all"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setPeriod(k)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition duration-150 ${
              period === k
                ? "border-[#9B7FCA] text-[#9B7FCA]"
                : "border-white/[0.08] text-[#9CA3AF] hover:bg-white/[0.03]"
            }`}
          >
            {k === "7d" ? "7 días" : k === "30d" ? "30 días" : "Todo"}
          </button>
        ))}
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="ml-auto rounded-md border border-white/10 bg-[#0A0A0F] px-3 py-1.5 text-xs text-white"
        >
          <option value="">Todos los eventos</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#111118] p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Ventas por día</p>
          <p className="mb-2 text-xs text-slate-500">
            Cada día suma pagos completados en la app más los reportes de caja registrados ese día.
          </p>
          <div className="h-72">
            {salesByDay.length === 0 ? (
              <div className="py-20 text-center text-slate-500">Sin datos para el período seleccionado.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByDay}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <YAxis tick={{ fill: "#9CA3AF", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: "#0f111a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
                    formatter={(v: number) => formatMoney(v)}
                  />
                  <Area dataKey="total" stroke="#FF8A4C" fill="rgba(255,138,76,0.18)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111118] p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Entradas vs Mesas</p>
          <div className="h-72">
            {entriesVsTables.length === 0 ? (
              <div className="py-20 text-center text-slate-500">Sin datos de comparación.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Entradas", value: entriesVsTables.reduce((s, x) => s + x.tickets, 0) },
                      { name: "Mesas", value: entriesVsTables.reduce((s, x) => s + x.tables, 0) },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                  >
                    <Cell fill="#FF8A4C" />
                    <Cell fill="#3B82F6" />
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#111118] p-5">
        <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Ingresos por evento</p>
        <p className="mb-2 text-xs text-slate-500">
          Incluye montos de tickets y reservas del evento más lo reportado en Caja asociado a ese evento.
        </p>
        <div className="h-80">
          {revenueByEvent.length === 0 ? (
            <div className="py-24 text-center text-slate-500">Sin ingresos por evento.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByEvent.slice(0, 12)} layout="vertical">
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis type="number" tick={{ fill: "#6B7280", fontSize: 11 }} />
                <YAxis dataKey="eventTitle" type="category" tick={{ fill: "#6B7280", fontSize: 11 }} width={160} />
                <Tooltip
                  contentStyle={{
                    background: "#111118",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 8,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Bar dataKey="total" fill="#9B7FCA" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-[#111118] p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Top 5 eventos más vendidos</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="py-2">Evento</th>
                  <th className="py-2">Entradas</th>
                  <th className="py-2">Mesas</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((row) => (
                  <tr key={row.eventTitle} className="border-t border-white/10">
                    <td className="py-2 text-white">{row.eventTitle}</td>
                    <td className="py-2 text-slate-300">{row.tickets}</td>
                    <td className="py-2 text-slate-300">{row.tables}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {top5.length === 0 && <div className="py-8 text-center text-slate-500">Sin eventos vendidos.</div>}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111118] p-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400">Ocupación por evento</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-slate-400">
                <tr>
                  <th className="py-2">Evento</th>
                  <th className="py-2">Asistencia</th>
                  <th className="py-2">Capacidad</th>
                  <th className="py-2">Ocupación</th>
                </tr>
              </thead>
              <tbody>
                {occupancyRows.map((row) => (
                  <tr key={row.eventTitle} className="border-t border-white/10">
                    <td className="py-2 text-white">{row.eventTitle}</td>
                    <td className="py-2 text-slate-300">{row.attended}</td>
                    <td className="py-2 text-slate-300">{row.capacity || "—"}</td>
                    <td className="py-2 text-slate-300">{row.occupancyRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {occupancyRows.length === 0 && <div className="py-8 text-center text-slate-500">Sin datos de ocupación.</div>}
        </section>
      </div>

      {revenueChannels && (
        <section className="rounded-2xl border border-white/10 bg-[#111118] p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Ingreso: en la app vs fuera de la app</p>
          <p className="mt-1 text-xs text-slate-500">
            El resto de gráficos y totales del período ya mezclan pagos registrados en la app con lo reportado en
            Caja. Esta vista solo separa esas dos fuentes.
          </p>
          <div className="mt-6 grid items-center gap-8 lg:grid-cols-2">
            <div className="h-64">
              {appFueraPie.reduce((s, x) => s + x.value, 0) <= 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Sin ingresos registrados en este período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={appFueraPie}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {appFueraPie.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? "#3B82F6" : "#9B7FCA"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-4 text-sm">
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Total combinado (período)</p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {formatMoney(revenueChannels.grandCombinedRD)}
                </p>
              </div>
              <div className="rounded-xl border border-[#3B82F6]/25 bg-[#3B82F6]/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-blue-300/90">Generado en la app</p>
                <p className="mt-1 text-lg font-semibold text-blue-200">
                  {formatMoney(revenueChannels.grandDigitalRD)}
                </p>
              </div>
              <div className="rounded-xl border border-[#9B7FCA]/25 bg-[#9B7FCA]/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-[#C4B5FD]">Fuera de la app (reportes de caja)</p>
                <p className="mt-1 text-lg font-semibold text-[#E9D5FF]">
                  {formatMoney(revenueChannels.grandManualRD)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
