"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { useStatsAnalyticsAll } from "@/hooks/useStatsAnalytics";
import type { TrendsGranularity } from "./types";
import { StatsLineChart } from "./StatsLineChart";

const DOW = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export function TrendsView({ onBack, venueId }: { onBack: () => void; venueId: string }) {
  const { data, isLoading } = useStatsAnalyticsAll(venueId);
  const [granularity, setGranularity] = useState<TrendsGranularity>("weekday");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const salesByDay = useMemo(() => {
    const charts = (data as Record<string, unknown> | undefined)?.charts as
      | { salesByDay?: { day: string; total: number }[]; salesByHour?: { hour: string; total: number }[] }
      | undefined;
    return {
      byDay: charts?.salesByDay ?? [],
      byHour: charts?.salesByHour ?? [],
    };
  }, [data]);
  const filteredDays = useMemo(() => {
    let rows = salesByDay.byDay;
    if (from) rows = rows.filter((d) => d.day >= from);
    if (to) rows = rows.filter((d) => d.day <= to);
    return rows;
  }, [salesByDay.byDay, from, to]);
  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of filteredDays) {
      const key = String(d.day).slice(0, 7);
      m.set(key, (m.get(key) ?? 0) + Number(d.total ?? 0));
    }
    return Array.from(m.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, total]) => ({ label: ym, value: total }));
  }, [filteredDays]);
  const byWeekday = useMemo(() => {
    const total = [0, 0, 0, 0, 0, 0, 0];
    const count = [0, 0, 0, 0, 0, 0, 0];
    for (const d of filteredDays) {
      const wd = new Date(`${d.day}T12:00:00`).getDay();
      total[wd] += Number(d.total ?? 0);
      count[wd] += 1;
    }
    return DOW.map((label, i) => ({ label, value: count[i] > 0 ? total[i] / count[i] : 0 }));
  }, [filteredDays]);
  const byHour = useMemo(() => {
    const rows = salesByDay.byHour;
    if (!rows.length) return [];
    return rows.map((r) => ({ label: String(r.hour), value: Number(r.total ?? 0) }));
  }, [salesByDay.byHour]);
  const chartData = granularity === "month" ? byMonth : granularity === "hour" ? byHour : byWeekday;
  const totalInRange = filteredDays.reduce((s, d) => s + Number(d.total ?? 0), 0);
  const noTrendData = !isLoading && Boolean(data) && totalInRange <= 0;
  const hourUnavailable = granularity === "hour" && byHour.length === 0;
  const insight = useMemo(() => {
    if (noTrendData) return "Aun no hay ventas registradas en el rango seleccionado.";
    if (granularity === "weekday") {
      const best = byWeekday.reduce((a, b) => (a.value >= b.value ? a : b), byWeekday[0]);
      return `Mejor dia promedio: ${best.label} (${Math.round(best.value).toLocaleString("es-DO")} RD$).`;
    }
    if (granularity === "month") {
      const last = byMonth.slice(-2);
      if (last.length === 2 && last[0].value > 0) {
        const pct = Math.round(((last[1].value - last[0].value) / last[0].value) * 100);
        return `Ultimo mes vs anterior: ${pct >= 0 ? "+" : ""}${pct}% en ingresos.`;
      }
      return "Falta al menos otro mes con ventas para comparar tendencia mensual.";
    }
    return "La API no expone ventas por hora para este local; no mostramos estimaciones artificiales.";
  }, [byMonth, byWeekday, granularity, noTrendData]);

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4 text-pink-500" aria-hidden />
        <span className="text-white/40">Estadísticas</span>
        <span className="text-white/25">/</span>
        <span className="font-medium text-white">Tendencias por mes / día</span>
      </button>

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { id: "month" as const, label: "Mes" },
            { id: "weekday" as const, label: "Día sem." },
            { id: "hour" as const, label: "Hora" },
          ] as const
        ).map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGranularity(g.id)}
            className={`rounded-full border py-2.5 text-center text-xs font-medium transition-colors ${
              granularity === g.id
                ? "border-pink-500/50 bg-pink-950/60 text-pink-300"
                : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
            }`}
          >
            {g.label}
            {granularity === g.id ? " ●" : ""}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-pink-500/50"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest text-white/40">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-pink-500/50"
          />
        </div>
      </div>

      <motion.div
        layout
        className="rounded-xl border border-pink-500/20 bg-pink-950/30 p-3"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-pink-400">Insight</p>
        <p className="mt-2 text-sm text-white/90">{insight}</p>
      </motion.div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        {isLoading && !data ? (
          <p className="py-10 text-center text-sm text-white/40">Cargando tendencias...</p>
        ) : noTrendData ? (
          <p className="py-10 text-center text-sm text-white/40">No hay ingresos en el rango seleccionado.</p>
        ) : hourUnavailable ? (
          <p className="py-10 text-center text-sm text-white/40">
            El backend aun no devuelve serie horaria real para este local.
          </p>
        ) : chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">No hay puntos para este modo.</p>
        ) : (
          <StatsLineChart
            key={granularity}
            data={chartData}
            showSecondLine={false}
            showArea={granularity === "weekday"}
            height={320}
          />
        )}
      </div>
    </div>
  );
}
