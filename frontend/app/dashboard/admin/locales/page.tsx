"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAllVenuesMineList, patchVenueStatus } from "@/lib/adminApi";
import type { VenuePickItem } from "@/lib/dashboardApi";

export default function AdminLocalesPage() {
  const [venues, setVenues] = useState<VenuePickItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingVenueId, setUpdatingVenueId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const v = await fetchAllVenuesMineList();
      setVenues(v);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: string, status: "approved" | "pending" | "rejected" | "suspended") {
    setUpdatingVenueId(id);
    try {
      await patchVenueStatus(id, status);
      await load();
    } finally {
      setUpdatingVenueId(null);
    }
  }

  function statusLabel(status?: string) {
    if (status === "approved") return "Aprobado";
    if (status === "pending") return "Pendiente";
    if (status === "rejected") return "Desaprobado";
    if (status === "suspended") return "Suspendido";
    return status ?? "—";
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F9FAFB]">Todos los locales</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Gestión y moderación</p>
      </div>
      {loading ? (
        <p className="text-[#6B7280]">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#111118]">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                <th className="px-6 py-3">Local</th>
                <th className="px-6 py-3">Ciudad</th>
                <th className="px-6 py-3">Eventos</th>
                <th className="px-6 py-3">Reservas</th>
                <th className="px-6 py-3">Ingresos</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.id} className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                  <td className="px-6 py-3 font-medium text-[#F9FAFB]">{v.name}</td>
                  <td className="px-6 py-3 text-[#9CA3AF]">{v.city ?? "—"}</td>
                  <td className="px-6 py-3 text-[#6B7280]">—</td>
                  <td className="px-6 py-3 text-[#6B7280]">—</td>
                  <td className="px-6 py-3 text-[#6B7280]">—</td>
                  <td className="px-6 py-3 text-[#9CA3AF]">{statusLabel(v.status)}</td>
                  <td className="px-6 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/admin/venues/${v.id}`}
                        className="text-xs font-semibold text-[#7CB0FF] hover:text-[#93C5FD] hover:underline"
                      >
                        Ver detalle
                      </Link>
                      <button
                        type="button"
                        disabled={updatingVenueId === v.id}
                        className="text-xs text-[#B39CD8] hover:underline disabled:opacity-50"
                        onClick={() => void setStatus(v.id, "suspended")}
                      >
                        Suspender
                      </button>
                      <button
                        type="button"
                        disabled={updatingVenueId === v.id}
                        className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline disabled:opacity-50"
                        onClick={() => void setStatus(v.id, "rejected")}
                      >
                        Desaprobar
                      </button>
                      <button
                        type="button"
                        disabled={updatingVenueId === v.id}
                        className="text-xs text-amber-300 hover:text-amber-200 hover:underline disabled:opacity-50"
                        onClick={() => void setStatus(v.id, "pending")}
                      >
                        Pendiente
                      </button>
                      <button
                        type="button"
                        disabled={updatingVenueId === v.id}
                        className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline disabled:opacity-50"
                        onClick={() => void setStatus(v.id, "approved")}
                      >
                        Aprobar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
