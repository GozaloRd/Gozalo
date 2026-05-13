"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import {
  fetchAdminGlobalEvents,
  type AdminGlobalEventRow,
  type AdminGlobalEventsResponse,
} from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";

type PeriodFilter = "all" | "upcoming30" | "past30" | "range";

function rangeForPeriod(period: PeriodFilter, customFrom: string, customTo: string) {
  const now = new Date();
  if (period === "all") return { from: undefined as string | undefined, to: undefined as string | undefined };
  if (period === "upcoming30") {
    const to = new Date(now);
    to.setDate(to.getDate() + 30);
    to.setHours(23, 59, 59, 999);
    return { from: now.toISOString(), to: to.toISOString() };
  }
  if (period === "past30") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
    return { from: from.toISOString(), to: now.toISOString() };
  }
  return {
    from: customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : undefined,
    to: customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined,
  };
}

function statusLabel(s: string) {
  const m: Record<string, string> = {
    draft: "Borrador",
    published: "Publicado",
    paused: "Pausado",
    cancelled: "Cancelado",
  };
  return m[s] ?? s;
}

function statusPillClass(s: string) {
  if (s === "published") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
  if (s === "draft") return "bg-zinc-500/20 text-zinc-300 ring-white/10";
  if (s === "paused") return "bg-amber-500/15 text-amber-200 ring-amber-500/25";
  if (s === "cancelled") return "bg-red-500/15 text-red-300 ring-red-500/25";
  return "bg-white/10 text-white/70 ring-white/10";
}

const fmt = new Intl.DateTimeFormat("es-DO", {
  dateStyle: "short",
  timeStyle: "short",
});

export default function AdminEventosPage() {
  const [data, setData] = useState<AdminGlobalEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [openSalesId, setOpenSalesId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  const range = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAdminGlobalEvents({
      ...range,
      status: status === "all" ? undefined : status,
      q: qDebounced || undefined,
      limit: 150,
    })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ events: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range.from, range.to, status, qDebounced]);

  useEffect(() => {
    setOpenSalesId(null);
  }, [range.from, range.to, status, qDebounced]);

  const rows = data?.events ?? [];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div className="rounded-xl bg-[#0d0d0d] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#F9FAFB]">Eventos (global)</h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Listado por fecha de inicio del evento. Enlaza al local o a la ficha pública.
            </p>
          </div>
          <p className="text-xs text-[#6B7280]">
            {loading ? "Cargando…" : `${rows.length} resultado${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-3">
          {(
            [
              ["all", "Todos"],
              ["upcoming30", "Próx. 30 días"],
              ["past30", "Últimos 30 días"],
              ["range", "Rango"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                period === id
                  ? "bg-violet-500 text-white"
                  : "bg-white/10 text-white/50 hover:bg-white/15 hover:text-white/70"
              }`}
            >
              {label}
            </button>
          ))}
          {period === "range" ? (
            <div className="flex flex-wrap gap-2 pl-0 sm:pl-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            Estado
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-white/[0.08] bg-black/40 px-3 py-1.5 text-xs text-white outline-none"
            >
              <option value="all">Todos</option>
              <option value="published">Publicado</option>
              <option value="draft">Borrador</option>
              <option value="paused">Pausado</option>
            </select>
          </label>
          <input
            type="search"
            placeholder="Buscar por título, slug o nombre del local…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="min-w-[220px] flex-1 rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-sm text-white placeholder:text-[#6B7280] outline-none focus:ring-1 focus:ring-violet-500/40"
          />
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-2">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                <th className="w-10 px-1 py-2" aria-label="Ventas" />
                <th className="px-2 py-2">Evento</th>
                <th className="px-2 py-2">Local</th>
                <th className="px-2 py-2">Inicio</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2">Vista pública</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center text-[#6B7280]">
                    No hay eventos con estos filtros.
                  </td>
                </tr>
              ) : null}
              {rows.map((ev: AdminGlobalEventRow) => {
                const s = ev.sales;
                const expanded = openSalesId === ev.id;
                return (
                  <Fragment key={ev.id}>
                    <tr className="border-b border-white/[0.06]">
                  <td className="px-1 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => setOpenSalesId(expanded ? null : ev.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] hover:bg-white/[0.06] hover:text-white"
                      title={expanded ? "Ocultar ventas" : "Ver vendido"}
                      aria-expanded={expanded}
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-2 align-top text-[#F9FAFB]">
                    <p className="font-medium">{ev.title}</p>
                    <p className="text-xs text-[#6B7280]">
                      {ev.category ?? "—"} · {ev.city ?? "—"}
                    </p>
                    {s ? (
                      <div className="mt-1 space-y-1">
                        <p className="text-xs tabular-nums text-emerald-400/90">
                          Vendido: {formatMoney(s.totalGross)}
                          <span className="text-[#6B7280]">
                            {" "}
                            ({s.ticketsCount} ticket{s.ticketsCount === 1 ? "" : "s"},{" "}
                            {s.reservationsCount} reserva{s.reservationsCount === 1 ? "" : "s"})
                          </span>
                        </p>
                        <Link
                          href={`/dashboard/admin/eventos/${ev.id}/ventas`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200 hover:underline"
                        >
                          Quién compró y a qué hora
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top">
                    {ev.venue ? (
                      <Link
                        href={`/dashboard/admin/venues/${ev.venue.id}`}
                        className="font-medium text-violet-300 hover:text-violet-200 hover:underline"
                      >
                        {ev.venue.name}
                      </Link>
                    ) : (
                      <span className="text-[#6B7280]">—</span>
                    )}
                    {ev.venue?.city ? (
                      <p className="text-xs text-[#6B7280]">{ev.venue.city}</p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top tabular-nums text-[#E5E7EB]">
                    {fmt.format(new Date(ev.startAt))}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${statusPillClass(ev.status)}`}
                    >
                      {statusLabel(ev.status)}
                    </span>
                    {ev.publicado ? (
                      <span className="ml-1 text-[10px] uppercase text-emerald-500/80">visible</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Link
                      href={`/e/${ev.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                      title={`Slug: ${ev.slug}`}
                    >
                      Abrir /e/…
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </Link>
                  </td>
                </tr>
                    {expanded && s ? (
                      <tr className="border-b border-white/[0.06] bg-black/25">
                        <td colSpan={6} className="px-4 py-3">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
                            Detalle vendido
                          </p>
                          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-xl border border-white/[0.08] bg-zinc-950/80 p-3">
                              <p className="text-xs text-[#9CA3AF]">Tickets (no cancelados)</p>
                              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                                {formatMoney(s.ticketsGross)}
                              </p>
                              <p className="text-xs text-[#6B7280]">{s.ticketsCount} unidades</p>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-zinc-950/80 p-3">
                              <p className="text-xs text-[#9CA3AF]">Reservas de mesa</p>
                              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                                {formatMoney(s.reservationsGross)}
                              </p>
                              <p className="text-xs text-[#6B7280]">{s.reservationsCount} reservas activas</p>
                            </div>
                            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 sm:col-span-2 lg:col-span-1">
                              <p className="text-xs text-violet-200/80">Total evento</p>
                              <p className="mt-1 text-lg font-semibold tabular-nums text-violet-100">
                                {formatMoney(s.totalGross)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Link
                              href={`/dashboard/admin/eventos/${ev.id}/ventas`}
                              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-500"
                            >
                              Abrir desglose completo
                              <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                            <p className="mt-2 text-[11px] text-[#6B7280]">
                              Listado por línea: comprador, hora, tipo, canal (web/POS) y reservas de mesa.
                            </p>
                          </div>
                          {s.ticketsByType.length > 0 ? (
                            <div className="mt-4">
                              <p className="text-xs font-medium text-[#9CA3AF]">Por tipo de ticket</p>
                              <ul className="mt-2 divide-y divide-white/[0.06] rounded-xl border border-white/[0.08] bg-zinc-950/60">
                                {s.ticketsByType.map((row, idx) => (
                                  <li
                                    key={`${ev.id}-${row.ticketType}-${idx}`}
                                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                                  >
                                    <span className="text-[#E5E7EB]">{row.ticketType}</span>
                                    <span className="tabular-nums text-[#9CA3AF]">
                                      {row.count} uds. · {formatMoney(Number(row.gross))}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="mt-3 text-xs text-[#6B7280]">Sin ventas de tickets registradas.</p>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
