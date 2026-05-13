"use client";

import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import type { DashboardTicketListRow } from "@/components/dashboard/panels/orders-flow/mergeVentasFeed";
import { formatMoney } from "@/lib/format";

const TICKET_ESTADO_ES: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  valid: "Válido",
  used: "Usado",
  cancelled: "Cancelado",
};

function formatTicketEstadoDb(raw: string | undefined | null): string {
  const k = String(raw || "").toLowerCase();
  return TICKET_ESTADO_ES[k] ?? (raw ? String(raw) : "—");
}

export function TicketFeedCard({
  ticket,
  expanded,
  onToggle,
}: {
  ticket: DashboardTicketListRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const created = new Date(ticket.creadoEn);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/90 bg-zinc-800/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-h-[52px] items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
        aria-expanded={expanded}
        aria-label={`Ticket ${ticket.id.slice(0, 8)}, ${expanded ? "contraer" : "expandir"}`}
      >
        <span className="text-base text-emerald-400" aria-hidden>
          🎟️
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-white">Ticket · #{ticket.id.slice(0, 8).toUpperCase()}</p>
            <p className="shrink-0 text-sm font-bold tabular-nums text-emerald-300">
              {formatMoney(ticket.montoRD)}
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {ticket.comprador?.nombre ?? "Cliente"} · {ticket.evento?.titulo ?? "Evento"} ·{" "}
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
              <dt className="text-[10px] font-bold uppercase text-slate-500">Tipo</dt>
              <dd className="text-white">{ticket.tipoEntrada}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Estado</dt>
              <dd className="text-slate-200">{formatTicketEstadoDb(ticket.estado)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Comprador</dt>
              <dd className="text-white">{ticket.comprador?.nombre ?? "—"}</dd>
              <dd className="text-slate-400">{ticket.comprador?.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Evento</dt>
              <dd className="text-white">{ticket.evento?.titulo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase text-slate-500">Fecha</dt>
              <dd className="text-slate-300">{format(created, "d MMM yyyy, HH:mm", { locale: es })}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] text-slate-600">
            Venta de entrada (detalle en órdenes si está vinculada a una orden).
          </p>
        </div>
      ) : null}
    </div>
  );
}
