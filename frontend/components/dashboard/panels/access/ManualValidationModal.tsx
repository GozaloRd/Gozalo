"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { patchReservationStatus } from "@/lib/dashboardApi";
import { loadAllEventReservations } from "@/lib/dashboardEventReservations";
import type { DashboardReservationRow } from "@/lib/dashboardEventReservations";

type Props = {
  open: boolean;
  onClose: () => void;
  venueId: string;
  eventId: string;
  onDidCheckIn?: () => void;
};

function matchesSearch(r: DashboardReservationRow, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const name = String(r.cliente?.nombre ?? "").toLowerCase();
  const email = String(r.cliente?.email ?? "").toLowerCase();
  const phone = String(r.cliente?.telefono ?? "").replace(/\s/g, "");
  return name.includes(t) || email.includes(t) || phone.includes(t);
}

export function ManualValidationModal({ open, onClose, venueId, eventId, onDidCheckIn }: Props) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<DashboardReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueId || !eventId) return;
    setLoading(true);
    setErr(null);
    try {
      const all = await loadAllEventReservations(eventId, venueId);
      setRows(all);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al cargar reservas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [venueId, eventId]);

  useEffect(() => {
    if (open) {
      setQ("");
      void load();
    }
  }, [open, load]);

  const filtered = useMemo(
    () => rows.filter((r) => r.evento?.id === eventId).filter((r) => matchesSearch(r, q)),
    [rows, eventId, q]
  );

  async function doCheckIn(id: string) {
    setBusy(id);
    setErr(null);
    try {
      await patchReservationStatus(id, "checked_in");
      onDidCheckIn?.();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo hacer check-in");
    } finally {
      setBusy(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Validación manual"
    >
      <div className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#121218] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="text-sm font-semibold text-white">Validación manual</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3 p-4">
          <input
            type="search"
            placeholder="Nombre, email o teléfono…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
            autoComplete="off"
          />
          {err ? <p className="text-xs text-rose-400">{err}</p> : null}
          <p className="text-[11px] text-slate-500">
            Check-in de reservas del evento seleccionado. Para entradas por ticket, usa el escáner QR.
          </p>
          <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
            {loading ? (
              <li className="text-sm text-slate-500">Cargando…</li>
            ) : filtered.length === 0 ? (
              <li className="text-sm text-slate-500">Sin coincidencias.</li>
            ) : (
              filtered.map((r) => {
                const st = r.estado ?? "";
                const canCheck =
                  st === "confirmed" || st === "pending";
                return (
                  <li
                    key={r.id}
                    className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 text-sm"
                  >
                    <p className="font-medium text-white">{r.cliente?.nombre ?? "Sin nombre"}</p>
                    <p className="text-xs text-slate-400">
                      {r.mesa ? `${r.mesa} · ` : ""}
                      {r.partySize ? `${r.partySize} pers. · ` : ""}
                      {st}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!canCheck || busy === r.id}
                        onClick={() => void doCheckIn(r.id)}
                        className="min-h-[44px] rounded-lg bg-[#2979FF] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        {busy === r.id ? "…" : "Check-in"}
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
