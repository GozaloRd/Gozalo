"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles } from "lucide-react";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchDashboardAnalytics } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

type Row = {
  eventId: string;
  title: string;
  revenue: number;
  attendance: number;
  occupancyPct: number;
  avgTicket: number;
};

export function EventComparisonSection() {
  const { venueId } = useDashboard();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const a = (await fetchDashboardAnalytics({ range: "30d" }, venueId)) as Record<string, unknown>;
      const charts = a?.charts as {
        revenueByEvent?: { eventId?: string; eventTitle?: string; total?: number }[];
        entriesVsTables?: { eventId?: string; eventTitle?: string; tickets?: number; tables?: number }[];
      };
      const occ = (a?.tables as { occupancyByEvent?: { eventId?: string; eventTitle?: string; occupancyRate?: number; attended?: number }[] })
        ?.occupancyByEvent;
      const rev = charts?.revenueByEvent ?? [];
      const ent = charts?.entriesVsTables ?? [];
      const byId = new Map<string, Row>();
      for (const r of rev) {
        const id = String(r.eventId ?? r.eventTitle ?? "");
        if (!id) continue;
        byId.set(id, {
          eventId: id,
          title: String(r.eventTitle ?? "Evento"),
          revenue: Number(r.total ?? 0),
          attendance: 0,
          occupancyPct: 0,
          avgTicket: 0,
        });
      }
      for (const e of ent) {
        const id = String(e.eventId ?? e.eventTitle ?? "");
        const cur = byId.get(id);
        const att = Number(e.tickets ?? 0) + Number(e.tables ?? 0);
        if (cur) {
          cur.attendance = att;
        } else {
          byId.set(id, {
            eventId: id,
            title: String(e.eventTitle ?? "Evento"),
            revenue: 0,
            attendance: att,
            occupancyPct: 0,
            avgTicket: 0,
          });
        }
      }
      for (const o of occ ?? []) {
        const id = String(o.eventId ?? o.eventTitle ?? "");
        const cur = byId.get(id);
        if (cur) {
          cur.occupancyPct = Number(o.occupancyRate ?? 0);
        }
      }
      for (const r of Array.from(byId.values())) {
        r.avgTicket = r.attendance > 0 ? r.revenue / r.attendance : 0;
      }
      setRows(Array.from(byId.values()).filter((x) => x.title));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const compareList = useMemo(() => {
    const picked = rows.filter((r) => selected.has(r.eventId)).slice(0, 4);
    if (picked.length >= 2) return picked;
    return rows.slice(0, Math.min(4, rows.length));
  }, [rows, selected]);

  const winners = useMemo(() => {
    if (compareList.length < 2) return null;
    const maxRev = Math.max(...compareList.map((r) => r.revenue));
    const maxAtt = Math.max(...compareList.map((r) => r.attendance));
    const maxOcc = Math.max(...compareList.map((r) => r.occupancyPct));
    const maxAvg = Math.max(...compareList.map((r) => r.avgTicket));
    return {
      revenue: compareList.find((r) => r.revenue === maxRev)?.eventId,
      attendance: compareList.find((r) => r.attendance === maxAtt)?.eventId,
      occupancy: compareList.find((r) => r.occupancyPct === maxOcc)?.eventId,
      avgTicket: compareList.find((r) => r.avgTicket === maxAvg)?.eventId,
    };
  }, [compareList]);

  const chartData = useMemo(
    () =>
      compareList.map((r) => ({
        name: r.title.slice(0, 14) + (r.title.length > 14 ? "…" : ""),
        Ingresos: r.revenue,
      })),
    [compareList]
  );

  function exportJson() {
    const blob = new Blob([JSON.stringify({ compared: compareList, generatedAt: new Date().toISOString() }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `comparativa-eventos-${Date.now()}.json`;
    a.click();
  }

  if (!venueId) return <p className="text-sm text-slate-500">Selecciona un local.</p>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Elige 2–4 eventos. Si eliges menos de 2, se comparan los primeros resultados disponibles.
      </p>
      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-500">No hay eventos con datos en el período.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {rows.map((r) => {
              const on = selected.has(r.eventId);
              return (
                <button
                  key={r.eventId}
                  type="button"
                  onClick={() => toggle(r.eventId)}
                  className={`min-h-[40px] rounded-full border px-3 py-2 text-xs font-medium transition ${
                    on
                      ? "border-pink-500 bg-pink-500/20 text-white"
                      : "border-white/10 bg-zinc-800/50 text-slate-300"
                  }`}
                >
                  {r.title.slice(0, 22)}
                  {r.title.length > 22 ? "…" : ""}
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto rounded-xl bg-zinc-800/50">
            <table className="w-full min-w-[320px] text-left text-xs">
              <thead className="border-b border-white/[0.08] text-slate-500">
                <tr>
                  <th className="px-2 py-2">Métrica</th>
                  {compareList.map((r) => (
                    <th key={r.eventId} className="px-2 py-2 font-medium text-white">
                      {r.title.slice(0, 12)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-t border-white/[0.06]">
                  <td className="px-2 py-2">Ingresos</td>
                  {compareList.map((r) => (
                    <td key={r.eventId} className="px-2 py-2 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {formatMoney(r.revenue)}
                        {winners?.revenue === r.eventId ? <Sparkles className="h-3.5 w-3.5 text-amber-400" /> : null}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-white/[0.06]">
                  <td className="px-2 py-2">Asistencia</td>
                  {compareList.map((r) => (
                    <td key={r.eventId} className="px-2 py-2 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {r.attendance}
                        {winners?.attendance === r.eventId ? <Sparkles className="h-3.5 w-3.5 text-amber-400" /> : null}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-white/[0.06]">
                  <td className="px-2 py-2">Ocupación %</td>
                  {compareList.map((r) => (
                    <td key={r.eventId} className="px-2 py-2 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {Math.round(r.occupancyPct)}%
                        {winners?.occupancy === r.eventId ? <Sparkles className="h-3.5 w-3.5 text-amber-400" /> : null}
                      </span>
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-white/[0.06]">
                  <td className="px-2 py-2">Ticket prom.</td>
                  {compareList.map((r) => (
                    <td key={r.eventId} className="px-2 py-2 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {formatMoney(r.avgTicket)}
                        {winners?.avgTicket === r.eventId ? <Sparkles className="h-3.5 w-3.5 text-amber-400" /> : null}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="h-48 w-full">
            {chartData.length < 2 ? (
              <p className="flex h-full items-center justify-center text-xs text-slate-500">Selecciona al menos dos eventos con datos.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: number) => formatMoney(v)}
                />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#EC4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <button
            type="button"
            onClick={exportJson}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Exportar comparativa (JSON)
          </button>
        </>
      )}
    </div>
  );
}
