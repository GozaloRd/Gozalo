"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DashCard } from "@/components/dashboard/pro/DashCard";
import { SidePanel } from "@/components/dashboard/pro/SidePanel";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  fetchDashboardEvents,
  fetchDashboardReservations,
  fetchDashboardTables,
  patchReservationStatus,
} from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";
import { paymentInfo } from "@/lib/reservationPayment";

type Row = {
  id: string;
  cliente?: { nombre?: string; email?: string; telefono?: string };
  evento?: { titulo?: string; id?: string };
  mesa?: string;
  tableId?: string | null;
  partySize?: number;
  montoRD?: number;
  estado?: string;
  horaCheckIn?: string | null;
  creadoEn?: string;
  notes?: string;
};

type EventOpt = { id: string; title: string; startAt?: string; endAt?: string; status?: string; publicado?: boolean };
type TableRow = { id: string; zone: string; label: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  checked_in: "Check-in",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No Show",
};

function badgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-[#9B7FCA]/20 text-[#C6B3E4] border-[#9B7FCA]/30";
    case "confirmed":
      return "bg-[#2979FF]/20 text-[#7CB0FF] border-[#2979FF]/35";
    case "checked_in":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "completed":
      return "bg-slate-500/20 text-slate-300 border-slate-500/30";
    case "cancelled":
      return "bg-red-500/20 text-red-300 border-red-500/35";
    case "no_show":
      return "bg-[#9B7FCA]/20 text-[#C6B3E4] border-[#9B7FCA]/35";
    default:
      return "bg-white/10 text-slate-300 border-white/10";
  }
}

export default function DashboardReservasPage() {
  const { venueId } = useDashboard();
  const [rows, setRows] = useState<Row[]>([]);
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const [evRes, resRes] = await Promise.all([
        fetchDashboardEvents("all", venueId),
        fetchDashboardReservations(
          {
            pageSize: "25",
            ...(eventId ? { eventId } : {}),
            ...(status ? { status } : {}),
            ...(from ? { from: new Date(from).toISOString() } : {}),
            ...(to ? { to: new Date(to).toISOString() } : {}),
          },
          venueId
        ),
      ]);
      const evData = (evRes as { data?: EventOpt[] })?.data ?? [];
      setEvents(evData.map((e) => ({ id: e.id, title: e.title, startAt: e.startAt, endAt: e.endAt, status: e.status, publicado: e.publicado })));
      setRows(((resRes as { data?: Row[] })?.data ?? []) as Row[]);
      if (eventId) {
        const tbRes = await fetchDashboardTables(eventId, venueId, { tableScope: "event" });
        const tb = (tbRes as { mesas?: TableRow[] })?.mesas ?? [];
        setTables(tb);
      } else {
        setTables([]);
      }
    } catch {
      setRows([]);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [venueId, eventId, status, from, to]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (r.cliente?.nombre || "").toLowerCase().includes(q));
  }, [rows, search]);

  const selectedEvent = useMemo(() => events.find((e) => e.id === eventId) ?? null, [events, eventId]);
  const isEventDay = useMemo(() => {
    if (!selectedEvent?.startAt) return false;
    const d = new Date(selectedEvent.startAt);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }, [selectedEvent]);

  const mesaBoard = useMemo(() => {
    const forEvent = eventId
      ? filtered.filter((r) => r.evento?.id === eventId && r.estado !== "cancelled")
      : [];
    const tableRows = tables.map((t) => {
      const match = forEvent.filter((r) => {
        const mesaText = String(r.mesa ?? "").toLowerCase();
        const byId = mesaText.includes(String(t.id).toLowerCase());
        const byLabel = mesaText.includes(String(t.label).toLowerCase());
        const byZoneLabel = mesaText.includes(`${t.zone} ${t.label}`.toLowerCase());
        return byId || byLabel || byZoneLabel;
      });
      const occupied = match.filter((r) => r.estado === "checked_in" || r.estado === "completed");
      const reserved = match.filter((r) => r.estado === "pending" || r.estado === "confirmed");
      const occupiedPeople = occupied.reduce((acc, r) => acc + Number(r.partySize ?? 0), 0);
      const reservedPeople = reserved.reduce((acc, r) => acc + Number(r.partySize ?? 0), 0);
      let state: "libre" | "reservada" | "ocupada" = "libre";
      if (isEventDay) {
        state = occupied.length > 0 ? "ocupada" : reserved.length > 0 ? "reservada" : "libre";
      } else {
        state = reserved.length > 0 || occupied.length > 0 ? "reservada" : "libre";
      }
      return { ...t, state, occupiedPeople, reservedPeople };
    });
    const stats = {
      total: tableRows.length,
      libres: tableRows.filter((t) => t.state === "libre").length,
      reservadas: tableRows.filter((t) => t.state === "reservada").length,
      ocupadas: tableRows.filter((t) => t.state === "ocupada").length,
    };
    return { rows: tableRows, stats };
  }, [filtered, tables, eventId, isEventDay]);

  type MesaBoardRow = (typeof mesaBoard)["rows"][number];
  const mesaBoardByZone = useMemo(() => {
    const tableRows = mesaBoard.rows;
    const m = new Map<string, MesaBoardRow[]>();
    for (const t of tableRows) {
      const z = (t.zone ?? "").trim() || "General";
      if (!m.has(z)) m.set(z, []);
      m.get(z)!.push(t);
    }
    m.forEach((arr) => {
      arr.sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }));
    });
    const zoneOrder = Array.from(m.keys()).sort((a, b) => a.localeCompare(b, "es"));
    return zoneOrder.map((zone) => {
      const rows = m.get(zone)!;
      return {
        zone,
        rows,
        stats: {
          total: rows.length,
          libres: rows.filter((t) => t.state === "libre").length,
          reservadas: rows.filter((t) => t.state === "reservada").length,
          ocupadas: rows.filter((t) => t.state === "ocupada").length,
        },
      };
    });
  }, [mesaBoard]);

  useEffect(() => {
    load();
  }, [load]);

  const paymentStats = useMemo(() => {
    const valid = filtered.filter((r) => r.estado !== "cancelled");
    const withPending = valid.filter((r) => paymentInfo(r).pendingAtVenue > 0);
    const settled = valid.filter((r) => paymentInfo(r).pendingAtVenue <= 0);
    const pendingAmount = withPending.reduce((acc, r) => acc + paymentInfo(r).pendingAtVenue, 0);
    const paidBefore = valid.reduce((acc, r) => acc + paymentInfo(r).paidBeforeEvent, 0);
    return {
      total: valid.length,
      withPending: withPending.length,
      settled: settled.length,
      pendingAmount,
      paidBefore,
    };
  }, [filtered]);
  const detailPayment = detail ? paymentInfo(detail) : null;

  async function setReservationStatus(id: string, next: string) {
    try {
      await patchReservationStatus(id, next);
      await load();
      setDetail((d) => (d && d.id === id ? { ...d, estado: next } : d));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <DashCard className="p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            placeholder="Buscar por cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#12121c] px-3 py-2 text-sm text-white lg:col-span-2"
          />
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#12121c] px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los eventos</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#12121c] px-3 py-2 text-sm text-white"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#12121c] px-2 py-2 text-sm text-white"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#12121c] px-2 py-2 text-sm text-white"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="mt-3 rounded-lg bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Aplicar filtros
        </button>
      </DashCard>
      {eventId && (
        <DashCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Estado de mesas</p>
              <p className="text-sm text-slate-300">
                {isEventDay
                  ? "Día del evento: ocupadas / reservadas / libres"
                  : "Antes del evento: reservadas / libres"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/10 px-2 py-1 text-slate-300">
                Total: {mesaBoard.stats.total}
              </span>
              <span className="rounded-full border border-emerald-500/30 px-2 py-1 text-emerald-300">
                Libres: {mesaBoard.stats.libres}
              </span>
              <span className="rounded-full border border-[#9B7FCA]/40 px-2 py-1 text-[#D4C2EE]">
                Reservadas: {mesaBoard.stats.reservadas}
              </span>
              {isEventDay && (
                <span className="rounded-full border border-amber-500/30 px-2 py-1 text-amber-300">
                  Ocupadas: {mesaBoard.stats.ocupadas}
                </span>
              )}
            </div>
          </div>
          {mesaBoard.rows.length > 0 ? (
            <div className="mt-4 space-y-2">
              {mesaBoardByZone.map(({ zone, rows, stats: zs }) => (
                <details
                  key={zone}
                  className="group rounded-xl border border-white/10 bg-white/[0.02] open:border-white/15"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm marker:content-none [&::-webkit-details-marker]:hidden">
                    <span className="font-semibold text-white">{zone}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span>
                        {zs.total} mesa{zs.total !== 1 ? "s" : ""}
                      </span>
                      <span className="rounded-full border border-emerald-500/25 px-1.5 py-0.5 text-emerald-300/90">
                        Libres {zs.libres}
                      </span>
                      <span className="rounded-full border border-[#9B7FCA]/35 px-1.5 py-0.5 text-[#D4C2EE]">
                        Reserv. {zs.reservadas}
                      </span>
                      {isEventDay && (
                        <span className="rounded-full border border-amber-500/25 px-1.5 py-0.5 text-amber-300/90">
                          Ocup. {zs.ocupadas}
                        </span>
                      )}
                      <span
                        className="ml-1 text-slate-500 transition group-open:rotate-90"
                        aria-hidden
                      >
                        ›
                      </span>
                    </span>
                  </summary>
                  <div className="border-t border-white/[0.06] px-2 pb-3 pt-2">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {rows.map((t) => (
                        <div
                          key={t.id}
                          className={`rounded-xl border px-3 py-2 text-sm ${
                            t.state === "ocupada"
                              ? "border-amber-500/35 bg-amber-500/10"
                              : t.state === "reservada"
                                ? "border-[#9B7FCA]/35 bg-[#9B7FCA]/10"
                                : "border-emerald-500/30 bg-emerald-500/10"
                          }`}
                        >
                          <p className="font-semibold text-white">{t.label}</p>
                          <p className="text-xs text-slate-300">
                            Estado: {t.state}
                            {isEventDay && t.state === "ocupada"
                              ? ` · ${t.occupiedPeople} pers. dentro`
                              : ""}
                            {!isEventDay && t.state === "reservada"
                              ? ` · ${t.reservedPeople} pers. reservadas`
                              : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              No hay mesas configuradas para este evento.
            </p>
          )}
        </DashCard>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Mesas reservadas</p>
          <p className="mt-2 text-2xl font-bold text-white">{paymentStats.total}</p>
        </DashCard>
        <DashCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Faltan por pagar</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{paymentStats.withPending}</p>
          <p className="mt-1 text-xs text-slate-400">{formatMoney(paymentStats.pendingAmount)} pendiente</p>
        </DashCard>
        <DashCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Pagadas completas</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{paymentStats.settled}</p>
        </DashCard>
        <DashCard className="p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Pagado antes del evento</p>
          <p className="mt-2 text-lg font-bold text-[#7CB0FF]">{formatMoney(paymentStats.paidBefore)}</p>
        </DashCard>
      </div>

      <DashCard className="overflow-x-auto p-0" padding={false}>
        {loading ? (
          <p className="p-6 text-slate-500">Cargando…</p>
        ) : (
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Mesa</th>
                <th className="px-4 py-3">Pers.</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Pagado</th>
                <th className="px-4 py-3">Faltante</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pay = paymentInfo(r);
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer border-b border-white/[0.06] hover:bg-white/[0.03]"
                    onClick={() => setDetail(r)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{r.id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-white">{r.cliente?.nombre ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{r.evento?.titulo ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-400">{r.mesa ?? "—"}</td>
                    <td className="px-4 py-3">{r.partySize ?? "—"}</td>
                    <td className="px-4 py-3 text-[#5B9DFF]">{formatMoney(Number(r.montoRD ?? 0))}</td>
                    <td className="px-4 py-3 text-emerald-300">{formatMoney(pay.paidBeforeEvent)}</td>
                    <td className="px-4 py-3">
                      <span className={pay.pendingAtVenue > 0 ? "text-amber-300" : "text-emerald-300"}>
                        {pay.pendingAtVenue > 0 ? formatMoney(pay.pendingAtVenue) : "RD$ 0"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-xs ${badgeClass(r.estado || "")}`}
                      >
                        {STATUS_LABEL[r.estado || ""] || r.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.creadoEn ? new Date(r.creadoEn).toLocaleString("es-DO") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DashCard>

      <SidePanel open={!!detail} onClose={() => setDetail(null)} title="Detalle reserva">
        {detail ? (
          <>
            <DashCard className="mt-4 space-y-2 border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Pago de la mesa</p>
              <p className="text-sm text-slate-300">
                Pagado antes del evento:{" "}
                <strong className="text-emerald-300">
                  {formatMoney(Number(detailPayment?.paidBeforeEvent ?? 0))}
                </strong>
              </p>
              <p className="text-sm text-slate-300">
                Faltante para el día del evento:{" "}
                <strong
                  className={
                    Number(detailPayment?.pendingAtVenue ?? 0) > 0 ? "text-amber-300" : "text-emerald-300"
                  }
                >
                  {Number(detailPayment?.pendingAtVenue ?? 0) > 0
                    ? formatMoney(Number(detailPayment?.pendingAtVenue ?? 0))
                    : "RD$ 0"}
                </strong>
              </p>
            </DashCard>
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Cliente</dt>
                <dd className="text-white">{detail.cliente?.nombre}</dd>
                <dd className="text-slate-400">{detail.cliente?.email}</dd>
                <dd className="text-slate-400">{detail.cliente?.telefono}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Evento</dt>
                <dd className="text-white">{detail.evento?.titulo}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Mesa / personas / monto</dt>
                <dd className="text-white">
                  {detail.mesa} · {detail.partySize} pers. · {formatMoney(Number(detail.montoRD ?? 0))}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Check-in</dt>
                <dd className="text-slate-300">
                  {detail.horaCheckIn ? new Date(detail.horaCheckIn).toLocaleString("es-DO") : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-2">
              <ActionBtn
                onClick={() => setReservationStatus(detail.id, "confirmed")}
                disabled={Number(detailPayment?.pendingAtVenue ?? 0) <= 0}
              >
                Confirmar pago completo
              </ActionBtn>
              <ActionBtn onClick={() => setReservationStatus(detail.id, "checked_in")}>Check-in</ActionBtn>
              <ActionBtn onClick={() => setReservationStatus(detail.id, "cancelled")} danger>
                Cancelar
              </ActionBtn>
              <ActionBtn onClick={() => setReservationStatus(detail.id, "no_show")} warn>
                No show
              </ActionBtn>
              <ActionBtn onClick={() => setReservationStatus(detail.id, "completed")}>
                Completada
              </ActionBtn>
            </div>
          </>
        ) : null}
      </SidePanel>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  danger,
  warn,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  warn?: boolean;
  disabled?: boolean;
}) {
  const cls = danger
    ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
    : warn
      ? "border-[#9B7FCA]/40 text-[#C6B3E4] hover:bg-[#9B7FCA]/10"
      : "border-[#2979FF]/40 text-[#7CB0FF] hover:bg-[#2979FF]/10";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  );
}
