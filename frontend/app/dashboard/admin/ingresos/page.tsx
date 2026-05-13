"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminRevenueByVenue,
  type AdminRevenueByVenueResponse,
} from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";

type PeriodFilter = "today" | "week" | "month" | "range";

function rangeForPeriod(period: PeriodFilter, customFrom: string, customTo: string) {
  const now = new Date();
  const from = new Date(now);
  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    from.setDate(from.getDate() - 7);
    from.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  } else {
    return {
      from: customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : undefined,
      to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined,
    };
  }
  return { from: from.toISOString(), to: now.toISOString() };
}

export default function AdminIngresosPage() {
  const [data, setData] = useState<AdminRevenueByVenueResponse | null>(null);
  const [period, setPeriod] = useState<PeriodFilter>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  useEffect(() => {
    const range = rangeForPeriod(period, customFrom, customTo);
    void fetchAdminRevenueByVenue(range)
      .then(setData)
      .catch(() => setData({ rows: [], totals: {
        reservationsGross: 0,
        reservationsCommission: 0,
        ticketsGross: 0,
        ticketsCommission: 0,
        totalControlledGross: 0,
        totalControlledCommission: 0,
      } }));
  }, [period, customFrom, customTo]);

  function exportCsv() {
    const rows = data?.rows ?? [];
    const header = [
      "local_id",
      "local",
      "ciudad",
      "reservaciones_bruto",
      "reservaciones_comision",
      "tickets_bruto",
      "tickets_comision",
      "total_controlado",
      "comision_total",
    ].join(",") + "\n";
    const body = rows.map((r) => [
      r.venueId ?? "",
      `"${r.venueName.replace(/"/g, '""')}"`,
      `"${(r.venueCity ?? "").replace(/"/g, '""')}"`,
      r.reservationsGross,
      r.reservationsCommission,
      r.ticketsGross,
      r.ticketsCommission,
      r.totalControlledGross,
      r.totalControlledCommission,
    ].join(",")).join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ingresos-gozalo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div className="rounded-xl bg-[#0d0d0d] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F9FAFB]">Ingresos y comisiones</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Locales vs ingresos Gozalo: 10% en tickets y 5% en reservas de mesa.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => exportCsv()}
            className="rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-2 text-sm font-medium text-[#F9FAFB] hover:bg-white/[0.05]"
          >
            Exportar CSV
          </button>
          <button
            type="button"
            className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-[#6B7280]"
            disabled
          >
            PDF (próx.)
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-3">
        {[
          ["today", "Día"],
          ["week", "Semana"],
          ["month", "Mes"],
          ["range", "Rango"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPeriod(id as PeriodFilter)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              period === id
                ? "bg-emerald-500 text-black"
                : "bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/70"
            }`}
          >
            {label}
          </button>
        ))}
        {period === "range" ? (
          <div className="flex flex-wrap gap-2 pl-0 sm:pl-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
        ) : null}
      </div>
      <div className="mt-4 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4">
        <p className="text-[11px] uppercase text-[#6B7280]">Resumen controlado de plataforma</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-h-[96px] rounded-xl border border-l-[3px] border-white/10 border-l-[#a855f7] bg-black/20 p-3">
            <p className="text-xs text-slate-400">Reservas de mesa</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatMoney(Number(data?.totals.reservationsGross ?? 0))}
            </p>
          </div>
          <div className="min-h-[96px] rounded-xl border border-l-[3px] border-white/10 border-l-[#22c55e] bg-black/20 p-3">
            <p className="text-xs text-slate-400">Tickets</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatMoney(Number(data?.totals.ticketsGross ?? 0))}
            </p>
          </div>
          <div className="min-h-[96px] rounded-xl border border-l-[3px] border-emerald-400/30 border-l-[#10b981] bg-emerald-500/10 p-3">
            <p className="text-xs text-emerald-300/80">Comisiones Gozalo (total)</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">
              {formatMoney(Number(data?.totals.totalControlledCommission ?? 0))}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-emerald-200/70">
              Mesas 5%: {formatMoney(Number(data?.totals.reservationsCommission ?? 0))} · Tickets 10%:{" "}
              {formatMoney(Number(data?.totals.ticketsCommission ?? 0))}
            </p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Cobrado al cliente</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              {formatMoney(Number(data?.totals.totalControlledGross ?? 0) + Number(data?.totals.totalControlledCommission ?? 0))}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Ingreso local</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-200">
              {formatMoney(Number(data?.totals.totalControlledGross ?? 0))}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Comisión Gozalo</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-[#B39CD8]">
              {formatMoney(Number(data?.totals.totalControlledCommission ?? 0))}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              Mesas 5%: {formatMoney(Number(data?.totals.reservationsCommission ?? 0))} · Tickets 10%:{" "}
              {formatMoney(Number(data?.totals.ticketsCommission ?? 0))}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Conciliación</p>
            <p className="mt-1 text-sm font-medium text-white/70">Por local en detalle</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                <th className="py-2">Local</th>
                <th className="py-2">Reservas</th>
                <th className="py-2">Comisión 5%</th>
                <th className="py-2">Tickets</th>
                <th className="py-2">Comisión 10%</th>
                <th className="py-2">Total Controlado</th>
                <th className="py-2">Comisión total</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).map((r) => (
                <tr key={`${r.venueId ?? "none"}-${r.venueName}`} className="border-b border-white/[0.06]">
                  <td className="py-2 text-[#F9FAFB]">
                    <p className="font-medium">{r.venueName}</p>
                    <p className="text-xs text-[#6B7280]">{r.venueCity ?? "Sin ciudad"}</p>
                  </td>
                  <td className="py-2 tabular-nums text-[#F9FAFB]">{formatMoney(Number(r.reservationsGross ?? 0))}</td>
                  <td className="py-2 tabular-nums text-[#9CA3AF]">{formatMoney(Number(r.reservationsCommission ?? 0))}</td>
                  <td className="py-2 tabular-nums text-[#F9FAFB]">{formatMoney(Number(r.ticketsGross ?? 0))}</td>
                  <td className="py-2 tabular-nums text-[#9CA3AF]">{formatMoney(Number(r.ticketsCommission ?? 0))}</td>
                  <td className="py-2 tabular-nums font-semibold text-white">
                    {formatMoney(Number(r.totalControlledGross ?? 0))}
                  </td>
                  <td className="py-2 tabular-nums font-semibold text-emerald-300">
                    {formatMoney(Number(r.totalControlledCommission ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
