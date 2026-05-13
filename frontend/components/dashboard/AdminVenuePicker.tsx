"use client";

import { useMemo, useState } from "react";
import LogoG from "@/components/LogoG";
import { useDashboard } from "@/contexts/DashboardContext";

export function AdminVenuePicker() {
  const { venuesForPick, refresh } = useDashboard();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return venuesForPick;
    return venuesForPick.filter((v) => {
      const name = (v.name || "").toLowerCase();
      const city = (v.city || "").toLowerCase();
      const owner = (v.owner?.fullName || v.owner?.email || "").toLowerCase();
      return name.includes(s) || city.includes(s) || owner.includes(s);
    });
  }, [venuesForPick, q]);

  return (
    <div className="flex min-h-screen flex-col bg-[#0A0A1A] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <LogoG href="/dashboard" />
        <h1 className="mt-6 font-display text-2xl font-bold text-white">Panel de locales</h1>
        <p className="mt-2 text-sm text-slate-400">
          Como administrador de la plataforma, elige un local para abrir el mismo panel que ven los dueños
          (eventos, reservas, caja, estadísticas) y revisar mejoras.
        </p>

        <div className="mt-8">
          <label className="text-xs uppercase text-slate-500">Buscar</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, ciudad o dueño…"
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#12121c] px-4 py-3 text-white placeholder:text-slate-600 focus:border-[#2979FF] focus:outline-none"
          />
        </div>

        <ul className="mt-6 space-y-2">
          {filtered.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-[#12121c]/60 px-4 py-8 text-center text-slate-500">
              {venuesForPick.length === 0 ? "No hay locales registrados aún." : "Ningún resultado."}
            </li>
          ) : (
            filtered.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => void refresh({ venueId: v.id })}
                  className="flex w-full flex-col rounded-xl border border-white/10 bg-[#12121c]/80 px-4 py-4 text-left transition hover:border-[#2979FF]/40 hover:bg-[#12121c]"
                >
                  <span className="font-medium text-white">{v.name}</span>
                  <span className="text-sm text-slate-400">
                    {v.city || "—"} ·{" "}
                    <span
                      className={
                        v.status === "approved"
                          ? "text-emerald-400/90"
                          : v.status === "pending"
                            ? "text-[#C6B3E4]/90"
                            : "text-slate-500"
                      }
                    >
                      {v.status || "—"}
                    </span>
                  </span>
                  {v.owner?.fullName && (
                    <span className="mt-1 text-xs text-slate-500">Dueño: {v.owner.fullName}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>

        <p className="mt-8 text-center text-xs text-slate-600">
          <a href="/admin" className="text-[#2979FF] underline">
            Volver al admin de plataforma
          </a>
        </p>
      </div>
    </div>
  );
}
