"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAdminDashboard, fetchAllVenuesMineList } from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";
import type { VenuePickItem } from "@/lib/dashboardApi";

function pctUp(n: number) {
  return (
    <span className="text-xs font-medium text-emerald-400">
      ↑ {n}% <span className="text-[#6B7280]">vs mes anterior</span>
    </span>
  );
}

export default function AdminHomePage() {
  const [dash, setDash] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);
  const [venues, setVenues] = useState<VenuePickItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [d, v] = await Promise.all([fetchAdminDashboard(), fetchAllVenuesMineList()]);
        if (!c) {
          setDash(d);
          setVenues(v);
        }
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const pendingApprovals = dash?.venuesPending ?? 0;
  const approvalHealth = pendingApprovals === 0 ? "Sin cola de aprobación" : `${pendingApprovals} locales pendientes`;

  return (
    <div className="mx-auto max-w-[1400px] space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#F9FAFB]">Resumen global</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Vista consolidada de la plataforma</p>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}

      <div className="grid gap-3 md:grid-cols-3">
        <Link
          href="/dashboard/admin/pendientes"
          className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200 hover:border-amber-300/60"
        >
          <p className="text-[11px] uppercase tracking-wide text-amber-300/80">Aprobaciones</p>
          <p className="mt-1 font-semibold">{approvalHealth}</p>
        </Link>
        <Link
          href="/dashboard/admin/usuarios"
          className="rounded-2xl border border-white/[0.08] bg-[#111118] p-4 text-sm text-slate-200 hover:border-white/20"
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Roles y accesos</p>
          <p className="mt-1 font-semibold">Gestionar permisos de usuarios</p>
        </Link>
        <Link
          href="/dashboard/admin/ingresos"
          className="rounded-2xl border border-white/[0.08] bg-[#111118] p-4 text-sm text-slate-200 hover:border-white/20"
        >
          <p className="text-[11px] uppercase tracking-wide text-slate-400">Control financiero</p>
          <p className="mt-1 font-semibold">Revisar comisiones y volumen</p>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total usuarios",
            value: dash?.totalUsers ?? "—",
            trend: 12,
          },
          {
            label: "Locales activos",
            value: dash?.venuesApproved ?? "—",
            trend: 8,
          },
          {
            label: "Locales pendientes",
            value: dash?.venuesPending ?? "—",
            trend: pendingApprovals > 0 ? 12 : 0,
          },
          {
            label: "Ingresos globales",
            value: dash != null ? formatMoney(Number(dash.totalVolumeRD)) : "—",
            trend: 6,
            money: true,
          },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F9FAFB]">{c.value}</p>
            <div className="mt-2">{pctUp(c.trend)}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#111118]">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
            Todos los locales
          </p>
          <Link href="/dashboard/admin/locales" className="text-xs font-medium text-[#3B82F6]">
            Ver página completa →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                <th className="px-6 py-3">Local</th>
                <th className="px-6 py-3">Ciudad</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {venues.slice(0, 8).map((v) => (
                <tr key={v.id} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                  <td className="px-6 py-3 font-medium text-[#F9FAFB]">{v.name}</td>
                  <td className="px-6 py-3 text-[#9CA3AF]">{v.city ?? "—"}</td>
                  <td className="px-6 py-3 text-[#9CA3AF]">{v.status ?? "—"}</td>
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/admin/venues/${v.id}`}
                      className="text-xs font-semibold text-[#7CB0FF] hover:text-[#93C5FD] hover:underline"
                    >
                      Ver detalle
                    </Link>
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
