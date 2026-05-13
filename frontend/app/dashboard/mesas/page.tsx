"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashCard } from "@/components/dashboard/pro/DashCard";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  fetchDashboardEvents,
  fetchDashboardTables,
  type VenueTableRow,
} from "@/lib/dashboardApi";
import {
  loadAllEventReservations,
  reservationMatchesTable,
  type DashboardReservationRow,
} from "@/lib/dashboardEventReservations";
import { formatMoney } from "@/lib/format";
import { paymentInfo } from "@/lib/reservationPayment";

type EventOpt = {
  id: string;
  title: string;
  startAt?: string;
  status?: string;
  publicado?: boolean;
};

type ResRow = DashboardReservationRow;

type TableAugmented = VenueTableRow & {
  estadoEnEvento?: string | null;
  pendingTotal: number;
  debtorReservations: ResRow[];
  displayName: string;
};

const COLOR: Record<string, string> = {
  libre: "border-[#10B981]/60 bg-[#0A0A0F] text-[#10B981]",
  reservada: "border-[#9B7FCA]/60 bg-[#0A0A0F] text-[#9B7FCA]",
  ocupada: "border-[#EF4444]/60 bg-[#0A0A0F] text-[#EF4444]",
};

export default function DashboardMesasPage() {
  const { venueId } = useDashboard();
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [eventId, setEventId] = useState("");
  const [tables, setTables] = useState<VenueTableRow[]>([]);
  const [reservations, setReservations] = useState<ResRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<TableAugmented | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    setError(null);
    try {
      const ev = await fetchDashboardEvents("all", venueId);
      const evRaw = (ev as { data?: EventOpt[] })?.data ?? [];
      const evList = evRaw.filter((e) => e.publicado ?? e.status === "published");
      setEvents(evList);
      const eid = eventId || evList[0]?.id || "";
      if (!eid) {
        setTables([]);
        setReservations([]);
        return;
      }
      const t = await fetchDashboardTables(eid, venueId, { tableScope: "event" });
      const mesas = ((t as { mesas?: VenueTableRow[] })?.mesas ?? []).filter((m) => m.active !== false);
      setTables(mesas);
      const resRows = await loadAllEventReservations(eid, venueId);
      setReservations(resRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar mesas");
      setTables([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [venueId, eventId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      void load();
    }, 20_000);
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  const resolvedEventId = eventId || events[0]?.id || "";

  const augmentedByZone = useMemo(() => {
    const forEvent = reservations.filter((r) => r.evento?.id === resolvedEventId);
    const augmented: TableAugmented[] = tables.map((t) => {
      const matches = forEvent.filter((r) => reservationMatchesTable(r, t));
      const pendingTotal = matches.reduce((acc, r) => acc + paymentInfo(r).pendingAtVenue, 0);
      const debtorReservations = matches.filter((r) => paymentInfo(r).pendingAtVenue > 0);
      const st = (t as VenueTableRow & { estadoEnEvento?: string }).estadoEnEvento || "libre";
      return {
        ...t,
        estadoEnEvento: st,
        pendingTotal,
        debtorReservations,
        displayName: `${t.zone} · ${t.label}`,
      };
    });

    const byZone: Record<string, TableAugmented[]> = {};
    for (const row of augmented) {
      const z = row.zone || "General";
      if (!byZone[z]) byZone[z] = [];
      byZone[z].push(row);
    }
    for (const z of Object.keys(byZone)) {
      byZone[z].sort((a, b) => {
        const pa = a.pendingTotal;
        const pb = b.pendingTotal;
        if (pa > 0 && pb === 0) return -1;
        if (pb > 0 && pa === 0) return 1;
        if (pa !== pb) return pb - pa;
        return String(a.label).localeCompare(String(b.label), undefined, { numeric: true });
      });
    }
    return { byZone, flat: augmented };
  }, [tables, reservations, resolvedEventId]);

  const summary = useMemo(() => {
    const flat = augmentedByZone.flat;
    const withDebt = flat.filter((t) => t.pendingTotal > 0);
    const debtSum = withDebt.reduce((acc, t) => acc + t.pendingTotal, 0);
    return {
      total: flat.length,
      withDebt: withDebt.length,
      debtSum,
      libres: flat.filter((t) => (t.estadoEnEvento || "") === "libre").length,
      reservadas: flat.filter((t) => (t.estadoEnEvento || "") === "reservada").length,
      ocupadas: flat.filter((t) => (t.estadoEnEvento || "") === "ocupada").length,
    };
  }, [augmentedByZone]);

  const debtorTables = useMemo(
    () => augmentedByZone.flat.filter((t) => t.pendingTotal > 0),
    [augmentedByZone]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="rounded-xl border border-white/10 bg-[#12121c] px-3 py-2 text-sm text-white"
          >
            <option value="">Evento (el más reciente)</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <Link
            href="/dashboard/eventos"
            className="rounded-xl border border-[#2979FF]/40 px-4 py-2 text-sm text-[#7CB0FF] hover:bg-[#2979FF]/10"
          >
            Editar mesas en el evento
          </Link>
          <button
            type="button"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5"
            onClick={() => void load()}
          >
            Actualizar
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Se listan todas las mesas configuradas para el evento seleccionado (como las publicó el local). Las que
        tienen saldo pendiente para el día del evento aparecen primero y resaltadas.
      </p>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {resolvedEventId && !loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DashCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Mesas en el evento</p>
            <p className="mt-2 text-2xl font-bold text-white">{summary.total}</p>
          </DashCard>
          <DashCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Con saldo pendiente</p>
            <p className="mt-2 text-2xl font-bold text-amber-300">{summary.withDebt}</p>
            <p className="mt-1 text-xs text-slate-400">{formatMoney(summary.debtSum)} por cobrar</p>
          </DashCard>
          <DashCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Libres / reservadas / ocupadas</p>
            <p className="mt-2 text-sm text-slate-300">
              <span className="text-emerald-300">{summary.libres}</span> ·{" "}
              <span className="text-[#C6B3E4]">{summary.reservadas}</span> ·{" "}
              <span className="text-red-300">{summary.ocupadas}</span>
            </p>
          </DashCard>
          <DashCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Reservas enlazadas</p>
            <p className="mt-2 text-2xl font-bold text-[#7CB0FF]">{reservations.length}</p>
          </DashCard>
        </div>
      ) : null}

      {loading ? (
        <p className="text-slate-500">Cargando mesas…</p>
      ) : !resolvedEventId ? (
        <p className="text-sm text-slate-500">No hay eventos publicados con mesas.</p>
      ) : tables.length === 0 ? (
        <DashCard className="p-4 text-sm text-slate-400">
          No hay mesas registradas para este evento. Créalas o edítalas al publicar el evento en{" "}
          <Link href="/dashboard/eventos" className="text-[#7CB0FF] underline">
            Eventos
          </Link>
          .
        </DashCard>
      ) : (
        <>
          {debtorTables.length > 0 ? (
            <DashCard className="border-amber-500/25 bg-amber-500/[0.06] p-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
                    Prioridad: mesas con pago pendiente
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {debtorTables.length} mesa{debtorTables.length === 1 ? "" : "s"} · {formatMoney(summary.debtSum)}{" "}
                    total pendiente
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {debtorTables.map((t) => (
                  <button
                    key={`debt-${t.id}`}
                    type="button"
                    onClick={() => setDetail(t)}
                    className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-left text-xs text-amber-100 transition hover:bg-amber-500/25"
                  >
                    <span className="font-semibold text-white">{t.displayName}</span>
                    <span className="mt-1 block text-amber-200">Falta {formatMoney(t.pendingTotal)}</span>
                  </button>
                ))}
              </div>
            </DashCard>
          ) : null}

          <div className="space-y-8">
            {Object.entries(augmentedByZone.byZone)
              .sort(([a], [b]) => a.localeCompare(b, "es"))
              .map(([zone, zoneTables]) => (
              <div key={zone}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#FF6B81]">{zone}</h2>
                <div className="flex min-h-[120px] flex-wrap gap-3 rounded-2xl border border-white/[0.06] bg-[#12121c]/50 p-4">
                  {zoneTables.map((t) => {
                    const st = t.estadoEnEvento || "libre";
                    const debtor = t.pendingTotal > 0;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setDetail(t)}
                        className={`flex min-h-[4.5rem] min-w-[4.5rem] flex-col items-center justify-center rounded-xl border px-2 py-2 text-center text-xs font-semibold transition hover:scale-105 ${
                          debtor
                            ? "border-amber-400/50 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30"
                            : COLOR[st] || COLOR.libre
                        }`}
                      >
                        <span className="text-[13px] leading-tight text-white">{t.label}</span>
                        <span className="mt-0.5 text-[10px] opacity-90">{st}</span>
                        {debtor ? (
                          <span className="mt-1 max-w-[5.5rem] truncate text-[10px] font-medium text-amber-200">
                            {formatMoney(t.pendingTotal)}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <DashCard className="p-4 text-sm text-[#6B7280]">
        Leyenda:{" "}
        <span className="text-emerald-300">verde = libre</span> ·{" "}
        <span className="text-[#C6B3E4]">violeta = reservada</span> ·{" "}
        <span className="text-red-300">rojo = ocupada</span> ·{" "}
        <span className="text-amber-200">ámbar = saldo pendiente en caja</span>
      </DashCard>

      {detail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <DashCard className="w-full max-w-md">
            <h3 className="text-lg font-bold text-white">{detail.displayName}</h3>
            <p className="mt-2 text-sm text-slate-400">
              Capacidad: {detail.capacity ?? "—"} · Mínimo:{" "}
              {detail.minPrice != null ? formatMoney(Number(detail.minPrice)) : "—"}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Estado en evento: <strong className="text-white">{detail.estadoEnEvento}</strong>
            </p>
            {detail.pendingTotal > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="text-xs uppercase tracking-wider text-amber-200/90">Saldo pendiente (día del evento)</p>
                <p className="mt-1 text-lg font-semibold text-amber-200">{formatMoney(detail.pendingTotal)}</p>
                {detail.debtorReservations.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {detail.debtorReservations.map((r) => (
                      <li key={r.id}>
                        {r.cliente?.nombre ?? "Cliente"} · {formatMoney(paymentInfo(r).pendingAtVenue)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-emerald-300/90">Sin saldo pendiente para cobrar en puerta.</p>
            )}
            <Link
              href="/dashboard/reservas"
              className="mt-4 inline-block text-xs text-[#7CB0FF] underline"
              onClick={() => setDetail(null)}
            >
              Ver en Reservas
            </Link>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-white/5 py-2 text-sm text-white hover:bg-white/10"
              onClick={() => setDetail(null)}
            >
              Cerrar
            </button>
          </DashCard>
        </div>
      )}
    </div>
  );
}
