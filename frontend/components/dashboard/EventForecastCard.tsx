"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchEventForecast, type EventForecast } from "@/lib/forecastApi";
import { formatMoney } from "@/lib/format";

function factorIcon(impact: "positive" | "negative" | "warn") {
  if (impact === "positive") {
    return (
      <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M7 17L17 7M17 7H9M17 7V15" />
      </svg>
    );
  }
  if (impact === "negative") {
    return (
      <svg className="h-3.5 w-3.5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M17 7L7 17M7 17H15M7 17V9" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

export default function EventForecastCard({ eventId }: { eventId: string }) {
  const { venueId } = useDashboard();
  const [data, setData] = useState<EventForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchEventForecast(eventId, venueId)
      .then((res) => {
        if (alive) setData(res);
      })
      .catch((e) => {
        if (alive) setError(e?.message ?? "Error");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [eventId, venueId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0c0c12] p-5 text-sm text-slate-400">
        Calculando predicción de ingresos…
      </div>
    );
  }
  if (error || !data) return null;

  if (!data.hasEnoughData && !data.forecast) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0c0c12] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <svg className="h-4 w-4 text-[#C77DFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 3v18h18M7 14l4-4 4 4 5-5" />
          </svg>
          Predicción de ingresos
        </div>
        <p className="mt-2 text-sm text-slate-400">{data.message}</p>
      </div>
    );
  }

  const low = data.confidenceLow ?? 0;
  const high = data.confidenceHigh ?? 0;

  return (
    <section className="rounded-2xl border border-[#C77DFF]/30 bg-gradient-to-br from-[#1a1030] via-[#0c0c12] to-[#0c0c12] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <svg className="h-4 w-4 text-[#E0AAFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 3v18h18M7 14l4-4 4 4 5-5" />
            </svg>
            Predicción de ingresos · próximo evento
          </div>
          <div className="mt-1 text-xs text-slate-400">
            &quot;{data.eventTitle}&quot;
            {data.dayOfWeek && ` · ${data.dayOfWeek}`}
            {data.basedOn > 0 && ` · basado en ${data.basedOn} evento${data.basedOn === 1 ? "" : "s"} pasado${data.basedOn === 1 ? "" : "s"}`}
          </div>
        </div>
        {!data.hasEnoughData && (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
            Estimación preliminar
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Estimación</div>
          <div className="mt-1 text-3xl font-bold text-white">
            {formatMoney(data.forecast ?? 0)}
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-[11px] uppercase tracking-wide text-slate-500">Rango de confianza</div>
          <div className="mt-2 h-2 rounded-full bg-white/5 relative overflow-hidden">
            <div
              className="absolute inset-y-0 bg-gradient-to-r from-[#7B2CBF] to-[#C77DFF]"
              style={{ left: "10%", right: "10%" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-[0_0_10px_rgba(199,125,255,0.9)]"
              style={{ left: "50%", transform: "translate(-50%, -50%)" }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-slate-400">
            <span>Mín. {formatMoney(low)}</span>
            <span>Máx. {formatMoney(high)}</span>
          </div>
        </div>
        {data.expectedAttendance && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">Asistencia esperada</div>
            <div className="mt-1 text-xl font-semibold text-white">~{data.expectedAttendance}</div>
          </div>
        )}
      </div>

      {data.factors && data.factors.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
            Factores detectados
          </div>
          <div className="flex flex-wrap gap-2">
            {data.factors.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200"
                title={f.detail}
              >
                {factorIcon(f.impact)}
                <span className="font-medium">{f.label}</span>
                <span className="text-slate-500">· {f.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-500">
        Esta predicción usa el histórico del local: día de la semana, categoría, tendencia reciente y si el evento está destacado. No sustituye al olfato del equipo — sirve de guía.
      </p>
    </section>
  );
}
