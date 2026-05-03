"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchDashboardStats, fetchReports, fetchDashboardEvents } from "@/lib/dashboardApi";
import { fetchAdminRevenueByVenue } from "@/lib/adminApi";
import type { AdminRevenueByVenueRow } from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";

export default function AdminVenueDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [reports, setReports] = useState<Record<string, unknown> | null>(null);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [monthlyPlatformIncome, setMonthlyPlatformIncome] = useState<number | null>(null);
  const [monthlyCommissionBreakdown, setMonthlyCommissionBreakdown] = useState<{
    tickets: number;
    reservations: number;
    customerTotal: number;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    let c = false;
    (async () => {
      try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [s, r, ev, revenue] = await Promise.all([
          fetchDashboardStats(id),
          fetchReports(id).catch(() => null),
          fetchDashboardEvents("upcoming", id),
          fetchAdminRevenueByVenue({
            from: monthStart.toISOString(),
            to: now.toISOString(),
          }).catch(() => null),
        ]);
        if (c) return;
        setStats(s as Record<string, unknown>);
        setReports((r as Record<string, unknown>) ?? null);
        setEvents(((ev as { data?: { id: string; title: string }[] })?.data ?? []).slice(0, 10));
        const venueRow = (revenue?.rows as AdminRevenueByVenueRow[] | undefined)?.find(
          (row) => row.venueId === id
        );
        setMonthlyPlatformIncome(Number(venueRow?.totalControlledCommission ?? 0));
        setMonthlyCommissionBreakdown({
          tickets: Number(venueRow?.ticketsCommission ?? 0),
          reservations: Number(venueRow?.reservationsCommission ?? 0),
          customerTotal: Number(venueRow?.totalControlledCommission ?? 0),
        });
      } catch {
        if (!c) {
          setStats(null);
          setReports(null);
          setMonthlyPlatformIncome(null);
          setMonthlyCommissionBreakdown(null);
        }
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  const rev = stats?.revenue as { totalRD?: { month?: number } } | undefined;

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase text-[#6B7280]">Local</p>
          <h1 className="text-2xl font-semibold text-[#F9FAFB]">Estadísticas · ID {id.slice(0, 8)}…</h1>
        </div>
        <Link
          href="/dashboard/admin/locales"
          className="text-sm font-medium text-[#B39CD8] hover:underline"
        >
          ← Volver a locales
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5">
          <p className="text-[11px] uppercase text-[#6B7280]">Ingresos (mes)</p>
          <p className="mt-2 text-xl font-semibold text-[#F9FAFB]">
            {monthlyPlatformIncome != null
              ? formatMoney(Number(monthlyPlatformIncome))
              : rev?.totalRD?.month != null
                ? formatMoney(Number(rev.totalRD.month))
                : "—"}
          </p>
          <div className="mt-3 space-y-1 text-xs text-[#9CA3AF]">
            <p>Comisión entradas vendidas: {formatMoney(Number(monthlyCommissionBreakdown?.tickets ?? 0))}</p>
            <p>Comisión al cliente (total): {formatMoney(Number(monthlyCommissionBreakdown?.customerTotal ?? 0))}</p>
            <p>
              Comisión cliente por mesa reservada:{" "}
              {formatMoney(Number(monthlyCommissionBreakdown?.reservations ?? 0))}
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5">
          <p className="text-[11px] uppercase text-[#6B7280]">Próximos eventos</p>
          <p className="mt-2 text-xl font-semibold text-[#F9FAFB]">{events.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5">
          <p className="text-[11px] uppercase text-[#6B7280]">Reportes</p>
          <p className="mt-2 text-sm text-[#9CA3AF]">{reports ? "Datos cargados" : "Sin datos"}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-6">
        <p className="text-[11px] uppercase text-[#6B7280]">Eventos próximos</p>
        <ul className="mt-4 space-y-2 text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex justify-between text-[#F9FAFB]">
              <span>{e.title}</span>
            </li>
          ))}
          {events.length === 0 && <li className="text-[#6B7280]">Sin eventos próximos.</li>}
        </ul>
      </div>
    </div>
  );
}
