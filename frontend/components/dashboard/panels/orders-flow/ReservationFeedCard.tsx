"use client";

import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import type { DashboardReservationListRow } from "@/components/dashboard/panels/orders-flow/mergeVentasFeed";
import { formatMoney } from "@/lib/format";
import { customerNotesFromReservationNotesBlob } from "@/lib/reservationNotes";
import { formatReservationEstadoDb, formatReservationVentaMontoLine } from "@/lib/reservationVentaUi";

export function ReservationFeedCard({
  reservation,
  expanded,
  onToggle,
}: {
  reservation: DashboardReservationListRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const created = new Date(reservation.creadoEn);
  const customerNote = customerNotesFromReservationNotesBlob(reservation.notes);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/90 bg-zinc-800/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-h-[52px] items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
        aria-expanded={expanded}
        aria-label={`Reserva ${reservation.id.slice(0, 8)}, ${expanded ? "contraer" : "expandir"}`}
      >
        <span className="text-base text-emerald-400" aria-hidden>
          🪑
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              Reserva · #{reservation.id.slice(0, 8).toUpperCase()}
            </p>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold tabular-nums text-emerald-300">
                {formatReservationVentaMontoLine(reservation, formatMoney)}
              </p>
            </div>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {reservation.cliente?.nombre ?? "Cliente"} · {reservation.evento?.titulo ?? "Evento"} ·{" "}
            {formatDistanceToNow(created, { addSuffix: true, locale: es })}
          </p>
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-2 text-sm">
          <dl className="space-y-2 text-xs">
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Estado</dt>
              <dd className="text-slate-200">{formatReservationEstadoDb(reservation.estado)}</dd>
                  {reservation.pagadoEnLineaRD != null && reservation.saldoPendienteRD != null ? (
                <>
                  <dt className="mt-2 text-[10px] font-bold uppercase text-slate-500">Pagado online</dt>
                  <dd className="tabular-nums text-emerald-200">{formatMoney(reservation.pagadoEnLineaRD)}</dd>
                  <dt className="mt-1 text-[10px] font-bold uppercase text-slate-500">Saldo en local</dt>
                  <dd className="tabular-nums text-amber-200">{formatMoney(reservation.saldoPendienteRD)}</dd>
                </>
              ) : null}
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Cliente</dt>
              <dd className="text-white">{reservation.cliente?.nombre ?? "—"}</dd>
              <dd className="text-slate-400">{reservation.cliente?.telefono ?? "—"}</dd>
              <dd className="text-slate-400">{reservation.cliente?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Mesa</dt>
              <dd className="text-white">{reservation.mesa ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Personas</dt>
              <dd className="text-slate-200">{reservation.partySize ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Evento</dt>
              <dd className="text-white">{reservation.evento?.titulo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Creada</dt>
              <dd className="text-slate-300">{format(created, "d MMM yyyy, HH:mm", { locale: es })}</dd>
            </div>
            {customerNote ? (
              <div>
                <dt className="text-[10px] font-bold uppercase text-slate-500">Notas</dt>
                <dd className="whitespace-pre-wrap text-slate-400">{customerNote}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
