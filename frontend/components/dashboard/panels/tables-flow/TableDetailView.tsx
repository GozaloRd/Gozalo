"use client";

import { formatMoney } from "@/lib/format";
import { customerNotesFromReservationNotesBlob } from "@/lib/reservationNotes";
import { paymentInfo } from "@/lib/reservationPayment";
import type { AugmentedTable } from "@/lib/tableFlowLogic";
import { MESA_ESTADO_META } from "@/lib/tableFlowLogic";

function digitsPhone(raw: string | undefined) {
  if (!raw) return "";
  return raw.replace(/\D/g, "");
}

type Props = {
  table: AugmentedTable;
  zoneName: string;
  eventTitle: string;
};

export function TableDetailView({ table, zoneName, eventTitle }: Props) {
  const meta = MESA_ESTADO_META[table.estadoUi];
  const res =
    [...table.matches].sort((a, b) =>
      String(a.creadoEn ?? a.createdAt ?? "").localeCompare(String(b.creadoEn ?? b.createdAt ?? ""))
    )[0] ?? null;
  const pi = res ? paymentInfo(res) : null;
  const customerNote = res ? customerNotesFromReservationNotesBlob(res.notes) : null;
  const tel = digitsPhone(res?.cliente?.telefono);
  const wa = tel ? `https://wa.me/${tel}` : null;

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <p className="font-display text-base font-semibold text-white">
          Mesa {table.label} · {zoneName}
        </p>
        <p className="font-display text-xs text-slate-500">{eventTitle}</p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 backdrop-blur-sm">
        <p className="text-xs text-slate-400">
          Estado: <span className="font-medium text-white">{meta.label}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Capacidad: <span className="text-white">{table.capacity ?? "—"}</span> personas
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Consumo mín.:{" "}
          <span className="text-white">
            {table.minPrice != null ? formatMoney(Number(table.minPrice)) : "—"}
          </span>
        </p>
      </div>

      {res ? (
        <>
          <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reserva</p>
            <p className="mt-2 font-display text-lg font-semibold text-white">{res.cliente?.nombre ?? "Cliente"}</p>
            {res.cliente?.telefono ? (
              <p className="mt-1 text-sm text-slate-300">📞 {res.cliente.telefono}</p>
            ) : null}
            {res.cliente?.email ? (
              <p className="mt-0.5 truncate text-sm text-slate-400">✉️ {res.cliente.email}</p>
            ) : null}
            <p className="mt-2 text-xs text-slate-400">
              👥 {res.partySize ?? "—"} personas
            </p>
            <p className="mt-1 text-xs text-slate-500">
              📅 Reservada:{" "}
              {res.creadoEn || res.createdAt
                ? new Date(String(res.creadoEn ?? res.createdAt)).toLocaleString("es-DO", {
                    dateStyle: "medium",
                  })
                : "—"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tel ? (
                <a
                  href={`tel:${tel}`}
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] px-3 text-sm font-medium text-white"
                >
                  📞 Llamar
                </a>
              ) : null}
              {wa ? (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-200"
                >
                  💬 WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          {pi ? (
            <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pagos</p>
              <p className="mt-2 text-sm text-slate-300">
                Anticipo:{" "}
                <span className="text-emerald-300">
                  {pi.settled ? "✅" : "⏳"} {formatMoney(pi.paidBeforeEvent)}{" "}
                  {pi.settled ? "(Pagado)" : "(Pendiente)"}
                </span>
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Saldo:{" "}
                <span className="text-amber-200">
                  {pi.pendingAtVenue <= 0 ? "✅" : "⏳"} {formatMoney(pi.pendingAtVenue)}{" "}
                  {pi.pendingAtVenue <= 0 ? "(Listo)" : "(Pendiente)"}
                </span>
              </p>
              <p className="mt-2 text-sm font-semibold text-white">Total: {formatMoney(pi.total)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled
                  className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs text-slate-500"
                >
                  Cobrar saldo
                </button>
                <button
                  type="button"
                  disabled
                  className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-xs text-slate-500"
                >
                  Marcar pagado
                </button>
              </div>
            </div>
          ) : null}

          {customerNote ? (
            <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notas</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{customerNote}</p>
            </div>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-500">Sin reserva enlazada a esta mesa.</p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" disabled className="min-h-[44px] rounded-xl border border-dashed border-white/15 py-3 text-xs text-slate-600">
          🔄 Cambiar a otra mesa
        </button>
      </div>
    </div>
  );
}
