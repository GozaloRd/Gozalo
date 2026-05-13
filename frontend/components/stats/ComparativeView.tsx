"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStatsAnalytics30d } from "@/hooks/useStatsAnalytics";
import { formatMoney } from "@/lib/format";
import type { ComparativeRow } from "./types";
import { StatsBarChart } from "./StatsBarChart";

const MAX_PICK = 4;

function buildRows(a: Record<string, unknown> | undefined): ComparativeRow[] {
  if (!a) return [];
  const charts = a.charts as {
    revenueByEvent?: { eventId?: string; eventTitle?: string; total?: number }[];
    entriesVsTables?: { eventId?: string; eventTitle?: string; tickets?: number; tables?: number }[];
  };
  const occ = (a.tables as { occupancyByEvent?: { eventId?: string; eventTitle?: string; occupancyRate?: number }[] })
    ?.occupancyByEvent;
  const rev = charts?.revenueByEvent ?? [];
  const ent = charts?.entriesVsTables ?? [];
  const byId = new Map<string, ComparativeRow>();
  for (const r of rev) {
    const id = String(r.eventId ?? r.eventTitle ?? "");
    if (!id) continue;
    byId.set(id, {
      eventId: id,
      name: String(r.eventTitle ?? "Evento"),
      revenue: Number(r.total ?? 0),
      attendance: 0,
      occupancyPct: 0,
      ticketAvg: 0,
    });
  }
  for (const e of ent) {
    const id = String(e.eventId ?? e.eventTitle ?? "");
    if (!id) continue;
    const attendance = Number(e.tickets ?? 0) + Number(e.tables ?? 0);
    const cur = byId.get(id);
    if (cur) {
      cur.attendance = attendance;
    } else {
      byId.set(id, {
        eventId: id,
        name: String(e.eventTitle ?? "Evento"),
        revenue: 0,
        attendance,
        occupancyPct: 0,
        ticketAvg: 0,
      });
    }
  }
  for (const o of occ ?? []) {
    const id = String(o.eventId ?? o.eventTitle ?? "");
    const cur = byId.get(id);
    if (cur) cur.occupancyPct = Number(o.occupancyRate ?? 0);
  }
  const rows = Array.from(byId.values()).map((r) => ({
    ...r,
    ticketAvg: r.attendance > 0 ? r.revenue / r.attendance : 0,
  }));
  return rows.sort((a, b) => b.revenue - a.revenue);
}

export function ComparativeView({ onBack, venueId }: { onBack: () => void; venueId: string }) {
  const { data, isLoading } = useStatsAnalytics30d(venueId);
  const all = useMemo(() => buildRows(data as Record<string, unknown> | undefined), [data]);
  const defaultIds = useMemo(() => all.slice(0, MAX_PICK).map((r) => r.eventId), [all]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(defaultIds));
  useEffect(() => {
    setPicked(new Set(defaultIds));
  }, [defaultIds]);

  const toggle = (id: string) => {
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) {
        n.delete(id);
        if (n.size < 2) {
          /* si marcas menos de 2, comparar primeros con datos */
          return new Set(all.slice(0, MAX_PICK).map((r) => r.eventId));
        }
        return n;
      }
      if (n.size >= MAX_PICK) {
        const arr = Array.from(n);
        arr.shift();
        n.clear();
        arr.forEach((x) => n.add(x));
      }
      n.add(id);
      return n;
    });
  };

  const selectedRows = all.filter((r) => picked.has(r.eventId));
  const effective =
    selectedRows.length >= 2 ? selectedRows : all.filter((r) => defaultIds.includes(r.eventId));

  const barData = effective.map((r) => ({ name: r.name.split(" ")[0] ?? r.name, value: r.revenue }));

  const exportJson = () => {
    const payload = { compared: effective, generatedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "comparativa-eventos.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const label = effective.map((r) => r.name.toUpperCase()).join(" · ");

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-col items-start gap-1 text-left text-sm text-white/70 transition-colors hover:text-white"
      >
        <span className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4 text-pink-500" aria-hidden />
          <span className="text-white/40">Estadísticas</span>
          <span className="text-white/25">/</span>
          <span className="font-medium text-white">Comparativa entre eventos</span>
        </span>
        <span className="pl-6 text-xs text-white/40">
          Elige 2-4 eventos. Si marcas menos de 2, se comparan los primeros con datos del periodo (30 días).
        </span>
      </button>

      {isLoading && all.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/45">
          Cargando comparativa...
        </div>
      ) : all.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/45">
          No hay suficiente actividad en 30 días para comparar eventos.
        </div>
      ) : (
        <>

          <div className="flex flex-wrap gap-2">
            {all.map((r) => {
              const active = picked.has(r.eventId);
              return (
                <motion.button
                  key={r.eventId}
                  type="button"
                  layout
                  onClick={() => toggle(r.eventId)}
                  whileTap={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 28 }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-white bg-white text-black"
                      : "border-white/20 bg-transparent text-white/60 hover:border-white/30"
                  }`}
                >
                  {r.name}
                  {active ? " ●" : ""}
                </motion.button>
              );
            })}
          </div>

          <p className="text-[10px] font-medium uppercase tracking-wide text-pink-500/80">Comparando: {label}</p>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MetricBlock title="Ingresos" rows={effective} format={(r) => formatMoney(r.revenue)} />
            <MetricBlock title="Asistencia (entradas + mesas)" rows={effective} format={(r) => String(r.attendance)} />
            <MetricBlock title="Ticket promedio" rows={effective} format={(r) => formatMoney(r.ticketAvg)} />
            <MetricBlock title="Ocupación %" rows={effective} format={(r) => `${Math.round(r.occupancyPct)}%`} />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <StatsBarChart data={barData} height={300} />
          </div>

          <motion.button
            type="button"
            onClick={exportJson}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-600"
          >
            <Download className="h-4 w-4" aria-hidden />
            Exportar comparativa (JSON)
          </motion.button>
        </>
      )}
    </div>
  );
}

function MetricBlock({
  title,
  rows,
  format,
}: {
  title: string;
  rows: ComparativeRow[];
  format: (r: ComparativeRow) => string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pink-500">{title}</h3>
      <ul className="space-y-2 border-t border-white/5 pt-3">
        {rows.map((r) => (
          <li key={r.eventId} className="flex items-center justify-between gap-2 text-sm border-b border-white/5 pb-2 last:border-0">
            <span className="text-white/70">{r.name}</span>
            <span className="tabular-nums text-white">{format(r)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
