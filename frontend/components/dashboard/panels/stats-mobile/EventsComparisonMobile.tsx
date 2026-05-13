"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStatsAnalytics30d } from "@/hooks/useStatsAnalytics";
import { formatMoney } from "@/lib/format";
import { StatsSubHeader } from "@/components/dashboard/panels/stats-mobile/StatsSubHeader";
import { StatsEmptyState } from "@/components/dashboard/panels/stats-mobile/StatsEmptyState";

type Row = {
  eventId: string;
  title: string;
  revenue: number;
  attendance: number;
  occupancyPct: number;
  avgTicket: number;
};

function buildRows(a: Record<string, unknown> | undefined): Row[] {
  if (!a) return [];
  const charts = a.charts as {
    revenueByEvent?: { eventId?: string; eventTitle?: string; total?: number }[];
    entriesVsTables?: { eventId?: string; eventTitle?: string; tickets?: number; tables?: number }[];
  };
  const occ = (a.tables as { occupancyByEvent?: { eventId?: string; eventTitle?: string; occupancyRate?: number }[] })
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
    if (cur) cur.attendance = att;
    else {
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
    if (cur) cur.occupancyPct = Number(o.occupancyRate ?? 0);
  }
  for (const r of Array.from(byId.values())) {
    r.avgTicket = r.attendance > 0 ? r.revenue / r.attendance : 0;
  }
  return Array.from(byId.values()).filter((x) => x.title);
}

export function EventsComparisonMobile({
  venueId,
  onBack,
}: {
  venueId: string;
  onBack: () => void;
}) {
  const { data, isLoading } = useStatsAnalytics30d(venueId);
  const rows = useMemo(() => buildRows(data as Record<string, unknown> | undefined), [data]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }, []);

  const compareList = useMemo(() => {
    const picked = rows.filter((r) => selected.has(r.eventId)).slice(0, 4);
    if (picked.length >= 2) return picked;
    return rows.slice(0, Math.min(4, rows.length));
  }, [rows, selected]);

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

  useEffect(() => {
    setSelected(new Set());
  }, [venueId]);

  return (
    <div className="space-y-4">
      <StatsSubHeader title="Comparativa entre eventos" onBack={onBack} />
      <p className="text-xs text-zinc-500">
        Elige 2–4 eventos. Si marcas menos de 2, se comparan los primeros con datos del período (30 días).
      </p>
      {isLoading && !data ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : rows.length === 0 ? (
        <StatsEmptyState
          title="No hay eventos para comparar en estos 30 días"
          reason="No encontramos ingresos ni movimiento (entradas/mesas) asociados a eventos en la ventana actual."
          action="Publica eventos y registra ventas; con dos o más eventos con datos podrás comparar barras e indicadores."
        />
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
                  className={`min-h-[44px] rounded-full border px-3 py-2 text-xs font-medium transition ${
                    on ? "border-pink-500 bg-pink-500/20 text-white" : "border-zinc-700 bg-zinc-900/50 text-zinc-300"
                  }`}
                >
                  {r.title.slice(0, 22)}
                  {r.title.length > 22 ? "…" : ""}
                </button>
              );
            })}
          </div>

          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Comparando: {compareList.map((r) => r.title.slice(0, 18)).join(" · ")}
          </p>

          <div className="space-y-3 text-sm text-zinc-200">
            <div>
              <p className="text-xs font-semibold text-pink-400">Ingresos</p>
              <ul className="mt-1 space-y-1">
                {compareList.map((r) => (
                  <li key={r.eventId} className="flex justify-between gap-2 tabular-nums">
                    <span className="min-w-0 truncate text-zinc-400">{r.title}:</span>
                    <span className="shrink-0 font-medium text-white tabular-nums">
                      {formatMoney(r.revenue)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-pink-400">Asistencia (entradas + mesas)</p>
              <ul className="mt-1 space-y-1">
                {compareList.map((r) => (
                  <li key={r.eventId} className="flex justify-between gap-2 tabular-nums">
                    <span className="min-w-0 truncate text-zinc-400">{r.title}:</span>
                    <span className="shrink-0 font-medium text-white tabular-nums">{r.attendance}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-pink-400">Ingreso prom. por asistencia</p>
              <ul className="mt-1 space-y-1">
                {compareList.map((r) => (
                  <li key={r.eventId} className="flex justify-between gap-2 tabular-nums">
                    <span className="min-w-0 truncate text-zinc-400">{r.title}:</span>
                    <span className="shrink-0 font-medium text-white tabular-nums">
                      {formatMoney(r.avgTicket)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-pink-400">Ocupación %</p>
              <ul className="mt-1 space-y-1">
                {compareList.map((r) => (
                  <li key={r.eventId} className="flex justify-between gap-2 tabular-nums">
                    <span className="min-w-0 truncate text-zinc-400">{r.title}:</span>
                    <span className="shrink-0 font-medium text-white tabular-nums">
                      {Math.round(r.occupancyPct)}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="h-48 w-full">
            {chartData.length < 2 ? (
              <StatsEmptyState
                className="h-full min-h-[192px] py-6"
                title="Se necesitan al menos 2 eventos en el gráfico"
                reason={
                  compareList.length < 2
                    ? "Solo hay un evento con datos en el período, o hace falta marcar otro evento en los chips de arriba."
                    : "No hay suficientes barras para comparar ingresos lado a lado."
                }
                action="Selecciona 2–4 eventos con ventas o espera a tener más eventos publicados con actividad."
              />
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
            className="flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-pink-500/40 bg-pink-600/90 px-4 py-3 text-sm font-semibold text-white"
          >
            📥 Exportar comparativa (JSON)
          </button>
        </>
      )}
    </div>
  );
}
