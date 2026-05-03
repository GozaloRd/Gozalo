"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/api";
import {
  fetchMyReservations,
  cancelMyReservation,
  type MyReservation,
} from "@/lib/reservationsApi";
import { formatEventDateTime } from "@/lib/dateDisplay";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(v?: string | number | null) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-amber-500/20 text-amber-200 border-amber-400/30" },
  confirmed: { label: "Confirmada", color: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" },
  checked_in: { label: "Check-in ✓", color: "bg-blue-500/20 text-blue-200 border-blue-400/30" },
  completed: { label: "Completada", color: "bg-slate-500/20 text-slate-300 border-slate-400/30" },
  cancelled: { label: "Cancelada", color: "bg-rose-500/20 text-rose-200 border-rose-400/30" },
  no_show: { label: "No show", color: "bg-rose-500/20 text-rose-300 border-rose-400/30" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "bg-white/10 text-slate-300 border-white/10" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.color}`}>
      {s.label}
    </span>
  );
}

function QrBlock({ payload }: { payload: string }) {
  const url = `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=140&margin=1`;
  return (
    <div className="flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="QR reserva" width={70} height={70} className="rounded-lg border border-white/10 bg-white p-1" />
      <p className="max-w-[70px] truncate text-center text-[9px] text-slate-500">{payload.slice(0, 12)}…</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Reservation card
// ─────────────────────────────────────────────────────────────

function ReservationCard({
  reservation,
  onCancel,
  cancelling,
}: {
  reservation: MyReservation;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const canCancel = reservation.status === "pending";

  let notes: { payment?: { pendingAtVenue?: number; paymentOption?: string } } = {};
  try {
    notes = JSON.parse(reservation.notes ?? "{}");
  } catch {
    /* noop */
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#111118] p-5 transition-all hover:border-white/20">
      <div className="flex flex-wrap items-start gap-4">
        {reservation.event?.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reservation.event.coverImageUrl}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-xl object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-white">{reservation.event?.title ?? "Evento"}</p>
            <StatusBadge status={reservation.status} />
          </div>
          {reservation.table && (
            <p className="mt-0.5 text-xs text-slate-400">
              Zona {reservation.table.zone} · Mesa {reservation.table.label} · {reservation.table.capacity} personas
            </p>
          )}
          {reservation.event?.venue?.name && (
            <p className="mt-0.5 text-xs text-slate-400">{reservation.event.venue.name}</p>
          )}
          {reservation.event?.startAt && (
            <p className="mt-0.5 text-xs text-slate-500">{formatEventDateTime(reservation.event.startAt)}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-white">{fmt(reservation.totalAmount)} pagado</p>
            {notes.payment?.pendingAtVenue ? (
              <p className="text-xs text-amber-300">{fmt(notes.payment.pendingAtVenue)} pendiente en local</p>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{reservation.partySize} personas</p>
        </div>

        {reservation.qrPayload && (reservation.status === "confirmed" || reservation.status === "pending") && (
          <div className="flex-shrink-0">
            <QrBlock payload={reservation.qrPayload} />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        {reservation.status === "checked_in" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-300">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Check-in realizado
          </span>
        )}
        {canCancel && (
          <button
            onClick={() => onCancel(reservation.id)}
            disabled={cancelling}
            className="flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
          >
            Cancelar reserva
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────

export default function MisMesasPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [reservations, setReservations] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    setAuthed(!!t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) return;
      const resData = await fetchMyReservations();
      setReservations(resData);
    } catch {
      setError("Error cargando tus reservas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void load();
    else if (authed === false) setLoading(false);
  }, [authed, load]);

  async function handleCancel(id: string) {
    if (!confirm("¿Cancelar esta reserva?")) return;
    setCancelling(id);
    try {
      await cancelMyReservation(id);
      await load();
    } catch {
      setError("No se pudo cancelar la reserva");
    } finally {
      setCancelling(null);
    }
  }

  if (authed === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-4xl">🪑</div>
        <p className="text-slate-300">Inicia sesión para ver tus reservas de mesas.</p>
        <Link
          href="/login?next=/mis-mesas"
          className="rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] px-5 py-2.5 text-sm font-black text-white"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const activeMesas = reservations.filter((r) => r.status !== "cancelled");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Mis mesas</h1>
        <p className="mt-1 text-sm text-slate-400">Gestiona tus reservas de mesa y consulta tu QR de acceso.</p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-14 text-center text-slate-400">Cargando tus reservas…</div>
      ) : (
        <div className="mt-5 space-y-4">
          {activeMesas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
              <p className="text-3xl">🪑</p>
              <p className="mt-3 font-semibold text-white">Sin reservas todavía</p>
              <p className="mt-1 text-sm text-slate-400">Encuentra un evento y reserva tu mesa VIP.</p>
              <Link
                href="/eventos"
                className="mt-4 inline-block rounded-xl border border-[#C77DFF]/40 bg-[#C77DFF]/10 px-4 py-2 text-sm font-bold text-[#E0AAFF]"
              >
                Ver eventos
              </Link>
            </div>
          ) : (
            activeMesas.map((r) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                onCancel={handleCancel}
                cancelling={cancelling === r.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
