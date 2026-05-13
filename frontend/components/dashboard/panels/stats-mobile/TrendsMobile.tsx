"use client";

import { useMemo, useState } from "react";
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
import { useStatsAnalyticsAll } from "@/hooks/useStatsAnalytics";
import { formatMoney } from "@/lib/format";
import { StatsSubHeader } from "@/components/dashboard/panels/stats-mobile/StatsSubHeader";
import { StatsEmptyState } from "@/components/dashboard/panels/stats-mobile/StatsEmptyState";

const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Mode = "mes" | "dia" | "hora";

export function TrendsMobile({ venueId, onBack }: { venueId: string; onBack: () => void }) {
  const { data, isLoading } = useStatsAnalyticsAll(venueId);
  const [mode, setMode] = useState<Mode>("dia");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const salesByDay = useMemo(() => {
    const charts = (data as Record<string, unknown> | undefined)?.charts as
      | { salesByDay?: { day: string; total: number }[] }
      | undefined;
    return charts?.salesByDay ?? [];
  }, [data]);
  const salesByHour = useMemo(() => {
    const charts = (data as Record<string, unknown> | undefined)?.charts as
      | { salesByHour?: { hour: string; total: number }[] }
      | undefined;
    return charts?.salesByHour ?? [];
  }, [data]);

  const filteredDays = useMemo(() => {
    let list = salesByDay;
    if (from) list = list.filter((d) => d.day >= from);
    if (to) list = list.filter((d) => d.day <= to);
    return list;
  }, [salesByDay, from, to]);

  const volumeInRange = useMemo(
    () => filteredDays.reduce((s, d) => s + Number(d.total ?? 0), 0),
    [filteredDays]
  );

  const noTrendData = !isLoading && Boolean(data) && volumeInRange < 0.005;
  const emptyBecauseFilterOnly =
    noTrendData && salesByDay.length > 0 && filteredDays.length === 0;

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

  const byHour = useMemo(() => {
    return salesByHour.map((x) => ({
      label: String(x.hour),
      total: Number(x.total ?? 0),
    }));
  }, [salesByHour]);

  const chartData = mode === "mes" ? byMonth : mode === "dia" ? byWeekday : byHour;

  const insight = useMemo(() => {
    if (volumeInRange < 0.005) {
      return emptyBecauseFilterOnly
        ? "Las fechas «Desde / Hasta» dejaron la lista de días vacía. Borra las fechas o elige un rango que incluya días con ventas."
        : "Aún no hay ingresos diarios en el historial analizado. Registra ventas en Ventas y vuelve en unos días para ver tendencias reales.";
    }
    if (mode === "dia") {
      let best = 0;
      let bestI = 0;
      byWeekday.forEach((x, i) => {
        if (x.total > best) {
          best = x.total;
          bestI = i;
        }
      });
      const nz = byWeekday.filter((x) => x.total > 0);
      const avg = nz.reduce((s, x) => s + x.total, 0) / Math.max(1, nz.length);
      const pct = avg > 0 ? Math.round(((best - avg) / avg) * 100) : 0;
      return `Tu mejor día es el ${DOW[bestI]} con un ${Math.max(0, pct)}% más de ingresos que el promedio diario (aprox.).`;
    }
    if (mode === "hora") {
      if (!byHour.length) {
        return "La API no devuelve serie horaria real para este local, por eso ocultamos ese modo en vez de estimarlo.";
      }
      let best = 0;
      let bestH = 0;
      byHour.forEach((x, i) => {
        if (x.total > best) {
          best = x.total;
          bestH = i;
        }
      });
      return `Pico real hacia las ${String(bestH).padStart(2, "0")}:00 en el historial disponible.`;
    }
    const last = byMonth.slice(-2);
    if (last.length === 2 && last[0].total > 0) {
      const pct = Math.round(((last[1].total - last[0].total) / last[0].total) * 100);
      return `Último mes vs anterior: ${pct >= 0 ? "+" : ""}${pct}% en ingresos registrados.`;
    }
    return "Añade más histórico para ver insights comparativos.";
  }, [mode, byWeekday, byMonth, byHour, volumeInRange, emptyBecauseFilterOnly]);

  const noHourData = mode === "hora" && byHour.length === 0;

  return (
    <div className="space-y-4">
      <StatsSubHeader title="Tendencias por mes / día" onBack={onBack} />

      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["mes", "Mes"],
            ["dia", "Día sem."],
            ["hora", "Hora"],
          ] as const
        ).map(([k, lab]) => (
          <button
            key={k}
            type="button"
            onClick={() => setMode(k)}
            className={`min-h-[44px] rounded-2xl border px-2 py-2 text-xs font-semibold ${
              mode === k ? "border-pink-500 bg-pink-500/20 text-white" : "border-zinc-700 bg-zinc-900/50 text-zinc-400"
            }`}
          >
            {lab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-zinc-400">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
          />
        </label>
        <label className="block text-xs text-zinc-400">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-2 min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm text-white"
          />
        </label>
      </div>

      {!noTrendData ? (
        <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-300">💡 Insight</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-200">{insight}</p>
        </div>
      ) : null}

      {isLoading && !data ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : noTrendData ? (
        <StatsEmptyState
          title={emptyBecauseFilterOnly ? "El filtro de fechas no incluye ventas" : "Aún no hay tendencias que graficar"}
          reason={
            emptyBecauseFilterOnly
              ? "Las fechas «Desde» / «Hasta» excluyen todos los días que tienen ingresos en el historial."
              : "No hay ingresos diarios en el rango que usa este informe; sin esos puntos no hay barras ni líneas que mostrar."
          }
          action={
            emptyBecauseFilterOnly
              ? "Borra ambas fechas o amplía el intervalo hasta incluir días donde ya hubo ventas."
              : "Registra ventas y cobros reales; cuando exista historia por día, elige Mes, día de la semana o Hora estimada."
          }
        />
      ) : noHourData ? (
        <StatsEmptyState
          title="Sin serie horaria real"
          reason="Tu backend no está enviando `salesByHour` para este local en este momento."
          action="Mantén Mes o Día sem. para ver solo métricas con datos reales."
        />
      ) : chartData.length === 0 ? (
        <StatsEmptyState
          title="No hay datos para este modo"
          reason="El modo actual (mes, día u hora) no devolvió puntos; suele ser un caso puntual de datos incompletos."
          action="Prueba otro modo o revisa el filtro de fechas arriba."
        />
      ) : (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "mes" || mode === "hora" ? (
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: mode === "hora" ? 8 : 9 }} interval={mode === "hora" ? 3 : 0} />
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

      <p className="text-[10px] text-zinc-600">
        Filtro por tipo de evento: pendiente de soporte en API.
      </p>
    </div>
  );
}
