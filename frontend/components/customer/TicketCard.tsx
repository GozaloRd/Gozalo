"use client";

import Link from "next/link";
import { QRCard } from "@/components/customer/QRCard";
import type { MyTicket } from "@/lib/customerApi";
import { formatMoney } from "@/lib/format";

const STATUS_TICKET: Record<string, string> = {
  paid: "Valida",
  valid: "Valida",
  used: "Usada",
  cancelled: "Cancelada",
};

function ticketStatusClass(st: string) {
  if (st === "used") return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  if (st === "cancelled") return "border-red-500/40 bg-red-500/10 text-red-300";
  return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
}

function qrUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&color=ffffff&bgcolor=0a0a12&data=${encodeURIComponent(payload)}`;
}

type Props = {
  ticket: MyTicket;
  history?: boolean;
};

export function TicketCard({ ticket, history = false }: Props) {
  const status = (ticket.status || "").toLowerCase();
  const qrImage = ticket.qrImage || (ticket.qrPayload ? qrUrl(ticket.qrPayload) : null);

  return (
    <article className={`rounded-2xl border border-white/[0.08] ${history ? "bg-[#111118]/80" : "bg-[#111118]"} p-4`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-[#F9FAFB]">{ticket.event?.title ?? "Evento"}</p>
          <p className="text-sm text-[#9CA3AF]">
            {ticket.event?.startAt ? new Date(ticket.event.startAt).toLocaleString("es-DO") : "Fecha por confirmar"}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${ticketStatusClass(status)}`}>
          {STATUS_TICKET[status] ?? ticket.status}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-1 text-sm text-slate-300">
          <p>Tipo: {ticket.ticketType}</p>
          <p>Precio: {ticket.unitPrice != null ? formatMoney(Number(ticket.unitPrice)) : "—"}</p>
          <div className="pt-2">
            <Link
              href={ticket.event?.slug ? `/eventos/${ticket.event.slug}` : "/eventos"}
              className="rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-white hover:bg-white/5"
            >
              Ver detalle del evento
            </Link>
          </div>
        </div>
        <QRCard imageUrl={qrImage} title={`Entrada ${ticket.ticketType}`} subtitle={history ? "Historial" : ticket.event?.title} />
      </div>
    </article>
  );
}
