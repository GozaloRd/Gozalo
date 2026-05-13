"use client";

import { ChevronLeft, MoreHorizontal } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { TicketTypeRow } from "@/components/dashboard/panels/tickets-flow/TicketTypeRow";
import { orderedTypes, type TicketTypeInput } from "@/lib/ticketQueueLogic";

function shortWhen(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(iso: string, now: number) {
  const t = new Date(iso).getTime();
  return Math.ceil((t - now) / (24 * 60 * 60 * 1000));
}

type Props = {
  event: UpcomingEventModel;
  nowMs: number;
  onBack: () => void;
};

export function EventTicketsDetail({ event, nowMs, onBack }: Props) {
  const typesRaw = event.ticketTypes ?? [];
  const types: TicketTypeInput[] = orderedTypes(
    typesRaw.map((t, idx) => ({
      id: String(t.id ?? t.name),
      name: t.name,
      price: t.price,
      quantityTotal: t.quantityTotal ?? null,
      soldCount: t.soldCount ?? 0,
      active: t.active,
      sortOrder: t.sortOrder ?? idx,
    }))
  );
  const mode = (event as UpcomingEventModel & { ticketSaleMode?: string }).ticketSaleMode;
  const sold = types.reduce((a, t) => a + (t.soldCount ?? 0), 0);
  const cap = types.reduce((a, t) => a + (t.quantityTotal ?? 0), 0);
  const rev = types.reduce((a, t) => a + Number(t.price || 0) * (t.soldCount ?? 0), 0);
  const occPct = cap > 0 ? Math.round((sold / cap) * 100) : 0;
  const d = daysUntil(event.startAt, nowMs);
  const live = event.status === "published";
  const statusDot = live ? "bg-emerald-500" : event.status === "paused" ? "bg-zinc-400" : "bg-amber-500";

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Volver al selector de eventos"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} aria-hidden />
            <h3 className="truncate text-base font-semibold text-white">{event.title}</h3>
            <button
              type="button"
              className="ml-auto shrink-0 rounded-lg p-1.5 text-zinc-500 opacity-60"
              aria-label="Más opciones"
              disabled
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {shortWhen(event.startAt)}
            {d >= 0 ? ` · en ${d} día${d === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-zinc-950/50 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
          <span className="text-white/90">
            {sold} / {cap || "—"} vendidos
          </span>
          <span className="font-semibold text-emerald-300">{formatMoney(rev)}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${occPct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-slate-500">{occPct}% ocupación</p>
      </div>

      <ul className="space-y-2">
        {types.map((tt, idx) => (
          <TicketTypeRow key={tt.id} index={idx} mode={mode} tt={tt} allTypes={types} />
        ))}
      </ul>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          disabled
          className="rounded-xl border border-dashed border-white/15 py-2.5 text-center text-sm text-slate-500"
        >
          ➕ Añadir tipo de ticket
        </button>
      </div>
    </div>
  );
}
