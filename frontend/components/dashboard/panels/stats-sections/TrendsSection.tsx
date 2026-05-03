"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchDashboardAnalytics } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function TrendsSection() {
  const { venueId } = useDashboard();
  const [mode, setMode] = useState<"mes" | "dia">("mes");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [salesByDay, setSalesByDay] = useState<{ day: string; total: number }[]>([]);
  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const a = (await fetchDashboardAnalytics({ range: "all" }, venueId)) as Record<string, unknown>;
      const charts = a?.charts as { salesByDay?: { day: string; total: number }[] };
      setSalesByDay(charts?.salesByDay ?? []);
    } catch {
      setSalesByDay([]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDays = useMemo(() => {
    let list = salesByDay;
    if (from) list = list.filter((d) => d.day >= from);
    if (to) list = list.filter((d) => d.day <= to);
    return list;
  }, [salesByDay, from, to]);

  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of filteredDays) {
      const key = d.day.slice(0, 7);
      m.set(key, (m.get(key) ?? 0) + d.total);
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mes, total]) => ({ label: mes, total }));
  }, [filteredDays]);

  const byWeekday = useMemo(() => {
    const acc = [0, 0, 0, 0, 0, 0, 0];
    const n = [0, 0, 0, 0, 0, 0, 0];
    for (const d of filteredDays) {
      const wd = new Date(d.day + "T12:00:00").getDay();
      acc[wd] += d.total;
      n[wd] += 1;
    }
    return DOW.map((label, i) => ({
      label,
      total: n[i] > 0 ? acc[i] / n[i] : 0,
    }));
  }, [filteredDays]);

  const insight = useMemo(() => {
    if (mode === "dia") {
      let best = 0;
      let bestI = 0;
      byWeekday.forEach((x, i) => {
        if (x.total > best) {
          best = x.total;
          bestI = i;
        }
      });
      const avg = byWeekday.reduce((s, x) => s + x.total, 0) / Math.max(1, byWeekday.filter((x) => x.total > 0).length);
      const pct = avg > 0 ? Math.round(((best - avg) / avg) * 100) : 0;
      return `Tu mejor día es el ${DOW[bestI]} con un ${pct >= 0 ? pct : 0}% más de ingresos respecto al promedio diario (aprox.).`;
    }
    const last = byMonth.slice(-2);
    if (last.length === 2 && last[0].total > 0) {
      const pct = Math.round(((last[1].total - last[0].total) / last[0].total) * 100);
      return `Último mes vs anterior: ${pct >= 0 ? "+" : ""}${pct}% en ingresos registrados.`;
    }
    return "Añade más histórico de ventas para ver insights comparativos.";
  }, [mode, byWeekday, byMonth]);

  const chartData = mode === "mes" ? byMonth : byWeekday;

  if (!venueId) return <p className="text-sm text-slate-500">Selecciona un local.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["mes", "dia"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`min-h-[44px] flex-1 rounded-xl border px-3 py-2 text-sm font-semibold capitalize ${
              mode === m ? "border-pink-500 bg-pink-500/20 text-white" : "border-white/10 bg-zinc-800/50 text-slate-400"
            }`}
          >
            {m === "mes" ? "Mes" : "Día de la semana"}
          </button>
        ))}
      </div>

      <label className="block text-xs text-slate-400">
        Tipo / categoría (nota)
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Reservado para filtro por evento en backend"
          className="mt-2 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600"
        />
        <span className="mt-1 block text-[10px] text-slate-600">
          El gráfico usa ventas diarias agregadas del local; filtrar por género requiere datos por evento.
        </span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-slate-400">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-slate-400">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
          />
        </label>
      </div>

      <p className="rounded-lg bg-zinc-800/50 p-3 text-xs leading-relaxed text-slate-300">{insight}</p>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-slate-500">Sin datos de tendencia en el rango.</p>
      ) : (
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "mes" ? (
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 9 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Bar dataKey="total" fill="#EC4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Line type="monotone" dataKey="total" stroke="#EC4899" strokeWidth={2} dot />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
