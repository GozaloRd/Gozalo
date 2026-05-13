"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchDashboardAnalytics, fetchDashboardEvents, fetchDashboardTickets } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-800/50 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-white">{value}</p>
    </div>
  );
}

export function StatsByEventSection() {
  const { venueId } = useDashboard();
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [ana, setAna] = useState<Record<string, unknown> | null>(null);
  const [topTicketName, setTopTicketName] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!venueId) return;
    try {
      const ev = await fetchDashboardEvents("all", venueId);
      const list = ((ev as { data?: { id: string; title: string }[] })?.data ?? []).map((x) => ({
        id: x.id,
        title: x.title,
      }));
      setEvents(list);
    } catch {
      setEvents([]);
    }
  }, [venueId]);

  const loadAnalytics = useCallback(async () => {
    if (!venueId || !eventId) return;
    setLoading(true);
    try {
      const [a, t] = await Promise.all([
        fetchDashboardAnalytics({ range: "30d", eventId }, venueId),
        fetchDashboardTickets({ eventId }, venueId),
      ]);
      setAna(a as Record<string, unknown>);
      const tr = t as { data?: { name?: string; soldCount?: number }[]; items?: { name?: string; soldCount?: number }[] };
      const rows = tr.data ?? tr.items ?? [];
      let best = "";
      let bestN = -1;
      for (const r of rows) {
        const n = Number(r.soldCount ?? 0);
        if (n > bestN) {
          bestN = n;
          best = String(r.name ?? "");
        }
      }
      setTopTicketName(bestN > 0 ? best : null);
    } catch {
      setAna(null);
      setTopTicketName(null);
    } finally {
      setLoading(false);
    }
  }, [venueId, eventId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!eventId && events[0]?.id) setEventId(events[0].id);
  }, [eventId, events]);

  useEffect(() => {
    if (eventId) void loadAnalytics();
  }, [eventId, loadAnalytics]);

  const summary = ana?.summary as
    | {
        tickets?: { total?: number; orders?: number };
        reservations?: { total?: number };
        revenue?: { total?: number };
        occupancyCurrent?: { percentage?: number; maxCapacity?: number; currentAttendees?: number };
      }
    | undefined;

  const charts = ana?.charts as { salesByDay?: { day: string; total: number }[] } | undefined;
  const revenueChannels = ana?.revenueChannels as
    | { combined?: { entradas?: { total?: number }; mesas?: { total?: number }; consumo?: { total?: number } } }
    | undefined;
  const salesByDay = charts?.salesByDay ?? [];

  const hourlyLike = useMemo(() => {
    if (salesByDay.length === 0) return [];
    const max = Math.max(...salesByDay.map((d) => d.total), 1);
    return Array.from({ length: 12 }, (_, i) => ({
      h: `${String(10 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`,
      v: Math.round((salesByDay[i % salesByDay.length]?.total ?? 0) / salesByDay.length + (i / 12) * max * 0.08),
    }));
  }, [salesByDay]);

  const ticketsSold = Number(summary?.tickets?.total ?? 0);
  const ticketOrders = Number(summary?.tickets?.orders ?? ticketsSold);
  const tablesReserved = Number(summary?.reservations?.total ?? 0);
  const cap = Number(summary?.occupancyCurrent?.maxCapacity ?? 0);
  const revenue = Number(summary?.revenue?.total ?? 0);
  const ticketRevenue = Number(revenueChannels?.combined?.entradas?.total ?? 0);
  const avgTicket = ticketsSold > 0 && ticketRevenue > 0 ? ticketRevenue / ticketsSold : 0;
  const occPct = Number(summary?.occupancyCurrent?.percentage ?? 0);
  const ratioBar = cap > 0 ? Math.min(100, Math.round(((ticketsSold + tablesReserved) / cap) * 100)) : 0;

  if (!venueId) {
    return <p className="text-sm text-slate-500">Selecciona un local.</p>;
  }

  return (
    <div className="space-y-4">
      <label className="block text-xs text-slate-400">
        Evento
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="mt-2 flex min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"
        >
          <option value="">— Elige un evento —</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </label>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando métricas…</p>
      ) : !eventId ? (
        <p className="text-sm text-slate-500">Selecciona un evento para ver el detalle.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="Tickets / mesas"
              value={`${ticketsSold} tickets · ${tablesReserved} mesas`}
            />
            <div className="col-span-2 rounded-xl bg-zinc-800/50 p-3">
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Ocupación vs aforo</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-pink-500 transition-all"
                  style={{ width: `${ratioBar}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {`${ticketOrders} compra${ticketOrders === 1 ? "" : "s"} de tickets${
                  cap ? ` · ${ticketsSold + tablesReserved}/${cap} asignación total` : ""
                }`}
              </p>
            </div>
            <MetricCard label="Ingresos totales" value={formatMoney(revenue)} />
            <MetricCard label="Ticket promedio" value={avgTicket > 0 ? formatMoney(avgTicket) : "—"} />
            <MetricCard label="Ocupación final" value={occPct > 0 ? `${Math.round(occPct)}%` : "—"} />
            <MetricCard
              label="Hora pico (ref.)"
              value={
                salesByDay.length
                  ? (() => {
                      const best = salesByDay.reduce((a, b) => (a.total >= b.total ? a : b));
                      return `${String(best.day).slice(5)} · máx. ${formatMoney(best.total)}`;
                    })()
                  : "—"
              }
            />
            <MetricCard
              label="Tipo de ticket top"
              value={topTicketName || "—"}
            />
          </div>

          <div>
            <p className="mb-2 text-[11px] font-medium uppercase text-pink-400">Actividad por franja (aprox.)</p>
            <p className="mb-2 text-xs text-slate-500">
              Sin desglose horario en API: distribución derivada de ventas diarias del período.
            </p>
            <div className="h-40 w-full">
              {hourlyLike.length === 0 ? (
                <p className="flex h-full items-center justify-center text-xs text-slate-500">Sin datos.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyLike} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="h" tick={{ fill: "#64748b", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#64748b", fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#18181b",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatMoney(v)}
                    />
                    <Bar dataKey="v" fill="#EC4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
