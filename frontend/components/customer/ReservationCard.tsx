"use client";

import Link from "next/link";
import { QRCard } from "@/components/customer/QRCard";
import type { MyReservation } from "@/lib/customerApi";
import { formatMoney } from "@/lib/format";

const STATUS_RES: Record<string, string> = {
  pending: "Pendiente pago",
  confirmed: "Confirmada",
  checked_in: "Check-in",
  cancelled: "Cancelada",
  completed: "Completada",
};

function reservationStatusClass(st: string) {
  if (st === "cancelled") return "border-red-500/40 bg-red-500/10 text-red-300";
  if (st === "pending") return "border-[#9B7FCA]/40 bg-[#9B7FCA]/10 text-[#C6B3E4]";
  if (st === "completed" || st === "checked_in") return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
}

function qrUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&color=ffffff&bgcolor=0a0a12&data=${encodeURIComponent(payload)}`;
}

function parsePendingFromNotes(notes?: string): number {
  if (!notes) return 0;
  try {
    const parsed = JSON.parse(notes) as { payment?: { pendingAtVenue?: number } };
    return Number(parsed.payment?.pendingAtVenue || 0);
  } catch {
    return 0;
  }
}

type Props = {
  reservation: MyReservation;
  history?: boolean;
  onCancel?: (id: string) => void;
};

export function ReservationCard({ reservation, history = false, onCancel }: Props) {
  const qrImage = reservation.qrImage || (reservation.qrPayload ? qrUrl(reservation.qrPayload) : null);
  const pending = parsePendingFromNotes(reservation.notes);

  return (
    <article className={`rounded-2xl border border-white/[0.08] ${history ? "bg-[#111118]/80" : "bg-[#111118]"} p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-[#F9FAFB]">{reservation.event?.title ?? "Evento"}</p>
          <p className="text-sm text-[#9CA3AF]">
            {reservation.event?.startAt ? new Date(reservation.event.startAt).toLocaleString("es-DO") : "Fecha por confirmar"}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${reservationStatusClass(reservation.status)}`}>
          {STATUS_RES[reservation.status] ?? reservation.status}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-1 text-sm text-slate-300">
          <p>
            Mesa: {reservation.table?.zone ?? "—"} {reservation.table?.label ?? ""}
          </p>
          <p>Capacidad: {reservation.table?.capacity ?? reservation.partySize ?? "—"}</p>
          <p>Monto pagado: {formatMoney(Number(reservation.totalAmount || 0))}</p>
          <p>Monto pendiente: {formatMoney(pending)}</p>
          <div className="pt-2 flex flex-wrap gap-2">
            <Link
              href={reservation.event?.slug ? `/e/${reservation.event.slug}` : "/eventos"}
              className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/5"
            >
              Ver detalle del evento
            </Link>
            {onCancel && reservation.status === "pending" && !history && (
              <button
                type="button"
                onClick={() => onCancel(reservation.id)}
                className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
              >
                Cancelar reserva
              </button>
            )}
          </div>
        </div>
        <QRCard
          imageUrl={qrImage}
          title="QR de reserva"
          subtitle={history ? "Historial" : `${reservation.table?.zone ?? ""} ${reservation.table?.label ?? ""}`}
        />
      </div>
    </article>
  );
}
