"use client";

import { useEffect, useState } from "react";
import {
  fetchAdminRevenueByVenue,
  type AdminRevenueByVenueResponse,
} from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";

export default function AdminIngresosPage() {
  const [data, setData] = useState<AdminRevenueByVenueResponse | null>(null);

  useEffect(() => {
    void fetchAdminRevenueByVenue()
      .then(setData)
      .catch(() => setData({ rows: [], totals: {
        reservationsGross: 0,
        reservationsCommission: 0,
        ticketsGross: 0,
        ticketsCommission: 0,
        totalControlledGross: 0,
        totalControlledCommission: 0,
      } }));
  }, []);

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
    a.download = "ingresos-gonzalo.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#F9FAFB]">Ingresos globales</h1>
          <p className="mt-1 text-sm text-[#6B7280]">Transacciones completadas</p>
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
      <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-4">
        <p className="text-[11px] uppercase text-[#6B7280]">Resumen controlado de plataforma</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Total Reservaciones</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatMoney(Number(data?.totals.reservationsGross ?? 0))}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-slate-400">Total Tickets</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {formatMoney(Number(data?.totals.ticketsGross ?? 0))}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3">
            <p className="text-xs text-emerald-300/80">Comisión plataforma</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">
              {formatMoney(Number(data?.totals.totalControlledCommission ?? 0))}
            </p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                <th className="py-2">Local</th>
                <th className="py-2">Reservaciones</th>
                <th className="py-2">Comisión Reservaciones</th>
                <th className="py-2">Tickets</th>
                <th className="py-2">Comisión Tickets</th>
                <th className="py-2">Total Controlado</th>
                <th className="py-2">Comisión Total</th>
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
  );
}
