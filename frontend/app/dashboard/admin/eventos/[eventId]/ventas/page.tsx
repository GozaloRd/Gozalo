"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Building2, CalendarClock, Receipt, Ticket } from "lucide-react";
import {
  fetchAdminEventSalesDetail,
  type AdminEventSalesDetailResponse,
  type AdminEventSalesSums,
} from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";

const dt = new Intl.DateTimeFormat("es-DO", {
  dateStyle: "short",
  timeStyle: "short",
});

function ticketStatusEs(s: string) {
  const m: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    valid: "Válido",
    used: "Usado",
    cancelled: "Cancelado",
  };
  return m[s] ?? s;
}

function reservationStatusEs(s: string) {
  const m: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    checked_in: "Check-in",
    cancelled: "Cancelada",
    completed: "Completada",
    no_show: "No asistió",
  };
  return m[s] ?? s;
}

function canalVenta(orderType: string | null, orderId: string | null) {
  if (!orderId) return "Sin orden vinculada";
  if (orderType === "pos") return "Caja / POS";
  if (orderType === "tickets") return "Web / checkout";
  if (orderType === "mixed") return "Mixto";
  return orderType ?? "—";
}

function emptySums(): AdminEventSalesSums {
  return {
    ticketsCatalogTotalRD: 0,
    ticketsCustomerPaidTotalRD: 0,
    reservationsCustomerPaidTotalRD: 0,
    reservationsContractTotalRD: 0,
    reservationsPendingVenueTotalRD: 0,
    customerPaidGrandTotalRD: 0,
  };
}

export default function AdminEventVentasPage() {
  const params = useParams();
  const eventId = String(params.eventId ?? "");
  const [data, setData] = useState<AdminEventSalesDetailResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    let c = false;
    setLoading(true);
    setErr(null);
    void fetchAdminEventSalesDetail(eventId)
      .then((d) => {
        if (!c) setData(d);
      })
      .catch((e: unknown) => {
        if (!c) {
          setData(null);
          setErr(e instanceof Error ? e.message : "Error al cargar");
        }
      })
      .finally(() => {
        if (!c) setLoading(false);
      });
    return () => {
      c = true;
    };
  }, [eventId]);

  const sums = useMemo(() => {
    if (!data) return emptySums();
    if (data.sums) return data.sums;
    const tickets = data.tickets ?? [];
    const res = data.reservations ?? [];
    const cat = tickets.reduce((a, t) => a + Number(t.catalogLineRD ?? t.unitPrice ?? 0), 0);
    const paidT = tickets.reduce((a, t) => a + Number(t.customerPaidRD ?? t.unitPrice ?? 0), 0);
    const paidR = res.reduce((a, r) => a + Number(r.customerPaidOnlineRD ?? r.totalAmount ?? 0), 0);
    return {
      ticketsCatalogTotalRD: Number(cat.toFixed(2)),
      ticketsCustomerPaidTotalRD: Number(paidT.toFixed(2)),
      reservationsCustomerPaidTotalRD: Number(paidR.toFixed(2)),
      reservationsContractTotalRD: res.reduce((a, r) => a + Number(r.contractLocalTotalRD ?? 0), 0),
      reservationsPendingVenueTotalRD: res.reduce((a, r) => a + Number(r.pendingAtVenueRD ?? 0), 0),
      customerPaidGrandTotalRD: Number((paidT + paidR).toFixed(2)),
    };
  }, [data]);

  const resumenTipo = useMemo(() => {
    const m = new Map<string, { count: number; paid: number }>();
    for (const t of data?.tickets ?? []) {
      const paid = Number(t.customerPaidRD ?? t.unitPrice ?? 0);
      const prev = m.get(t.ticketType) ?? { count: 0, paid: 0 };
      m.set(t.ticketType, {
        count: prev.count + 1,
        paid: prev.paid + paid,
      });
    }
    return Array.from(m.entries()).sort((a, b) => b[1].paid - a[1].paid);
  }, [data?.tickets]);

  const ev = data?.event;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <div className="rounded-xl bg-[#0d0d0d] p-5 md:p-6">
        <Link
          href="/dashboard/admin/eventos"
          className="inline-flex items-center gap-2 text-sm font-medium text-violet-300 hover:text-violet-200 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a eventos
        </Link>

        {loading ? (
          <p className="mt-6 text-sm text-[#6B7280]">Cargando desglose…</p>
        ) : err ? (
          <p className="mt-6 text-sm text-red-300">{err}</p>
        ) : ev ? (
          <>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                  Desglose operativo (admin)
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-[#F9FAFB] md:text-3xl">{ev.title}</h1>
                <p className="mt-2 max-w-[720px] text-xs leading-relaxed text-[#6B7280]">
                  Importes <strong className="text-white/80">cobrado al cliente final</strong>: en tickets se prorratea el
                  total de la orden (pagos completados o total de orden pagada), incluyendo cargos/recargos de la orden;
                  en reservas se usan pagos completados o el tramo cobrado online según el contrato guardado.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#6B7280]">
                  {ev.venue ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-violet-400/80" aria-hidden />
                      <Link
                        href={`/dashboard/admin/venues/${ev.venue.id}`}
                        className="text-violet-300 hover:text-violet-200 hover:underline"
                      >
                        {ev.venue.name}
                      </Link>
                      {ev.venue.city ? ` · ${ev.venue.city}` : null}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-white/25" aria-hidden />
                    Inicio evento: {dt.format(new Date(ev.startAt))}
                  </span>
                </div>
              </div>
              <Link
                href={`/e/${ev.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.08]"
              >
                Ficha pública
              </Link>
            </div>

            {!loading && data ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-200/80">
                    Total cobrado clientes
                  </p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-emerald-100">
                    {formatMoney(sums.customerPaidGrandTotalRD)}
                  </p>
                  <p className="mt-1 text-[11px] text-emerald-200/60">Tickets + reservas (líneas)</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-zinc-950/70 p-4">
                  <p className="text-[10px] uppercase text-[#6B7280]">Tickets cobrado</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                    {formatMoney(sums.ticketsCustomerPaidTotalRD)}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Catálogo: {formatMoney(sums.ticketsCatalogTotalRD)}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-zinc-950/70 p-4">
                  <p className="text-[10px] uppercase text-[#6B7280]">Reservas cobrado online</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                    {formatMoney(sums.reservationsCustomerPaidTotalRD)}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Contrato local: {formatMoney(sums.reservationsContractTotalRD)}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-[10px] uppercase text-amber-200/70">Pendiente en local (mesas)</p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-amber-100">
                    {formatMoney(sums.reservationsPendingVenueTotalRD)}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-200/50">Según notas de reserva</p>
                </div>
              </div>
            ) : null}

            {resumenTipo.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {resumenTipo.map(([name, agg]) => (
                  <div
                    key={name}
                    className="rounded-full border border-white/[0.08] bg-zinc-950/70 px-3 py-1.5 text-xs text-[#E5E7EB]"
                  >
                    <span className="font-medium text-white">{name}</span>
                    <span className="ml-2 text-[#6B7280]">
                      {agg.count} uds. · cobrado {formatMoney(agg.paid)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {!loading && data ? (
        <>
          <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
            <div className="flex items-center gap-2 text-white/80">
              <Ticket className="h-5 w-5 text-emerald-400" aria-hidden />
              <h2 className="text-lg font-semibold">Tickets vendidos</h2>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-[#9CA3AF]">
                {data.tickets.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              «Precio entrada» = tarifa de línea. «Cobrado al cliente» incluye la parte proporcional del total de la
              orden (subtotal + cargos de servicio si existen).
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[1020px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                    <th className="px-3 py-2">Fecha y hora</th>
                    <th className="px-3 py-2">Comprador</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Precio entrada</th>
                    <th className="px-3 py-2">Cobrado al cliente</th>
                    <th className="px-3 py-2">Cargo orden</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Canal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-8 text-center text-[#6B7280]">
                        No hay tickets activos para este evento.
                      </td>
                    </tr>
                  ) : (
                    data.tickets.map((t) => {
                      const catalog = Number(t.catalogLineRD ?? t.unitPrice ?? 0);
                      const paid = Number(t.customerPaidRD ?? t.unitPrice ?? 0);
                      const fee = Number(t.orderFeeAllocatedRD ?? 0);
                      return (
                        <tr key={t.id} className="border-b border-white/[0.05]">
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#E5E7EB]">
                            {dt.format(new Date(t.createdAt))}
                          </td>
                          <td className="max-w-[260px] px-3 py-2.5">
                            <p className="truncate font-medium text-white">{t.buyer?.fullName ?? "—"}</p>
                            <p className="truncate text-xs text-[#6B7280]">{t.buyer?.email ?? "—"}</p>
                            {t.buyer?.phone ? (
                              <p className="truncate text-xs text-white/35">{t.buyer.phone}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-[#E5E7EB]">{t.ticketType}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#9CA3AF]">
                            {formatMoney(catalog)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium text-emerald-200">
                            {formatMoney(paid)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#9CA3AF]">
                            {fee > 0 ? formatMoney(fee) : "—"}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-[#9CA3AF]">
                              {ticketStatusEs(t.status)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-[#9CA3AF]">{canalVenta(t.orderType, t.orderId)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
            <div className="flex items-center gap-2 text-white/80">
              <Receipt className="h-5 w-5 text-amber-400" aria-hidden />
              <h2 className="text-lg font-semibold">Reservas de mesa</h2>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-[#9CA3AF]">
                {data.reservations.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#6B7280]">
              «Cobrado» = pagos completados vinculados o tramo online del contrato. Contrato / pendiente salen de las
              notas de la reserva cuando existen.
            </p>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                    <th className="px-3 py-2">Fecha y hora</th>
                    <th className="px-3 py-2">Comprador</th>
                    <th className="px-3 py-2">Mesa</th>
                    <th className="px-3 py-2">Personas</th>
                    <th className="px-3 py-2">Cobrado al cliente</th>
                    <th className="px-3 py-2">Contrato (local)</th>
                    <th className="px-3 py-2">Pendiente local</th>
                    <th className="px-3 py-2">Importe BD</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reservations.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-[#6B7280]">
                        No hay reservas activas para este evento.
                      </td>
                    </tr>
                  ) : (
                    data.reservations.map((r) => {
                      const paid = Number(r.customerPaidOnlineRD ?? r.totalAmount ?? 0);
                      const contract = r.contractLocalTotalRD;
                      const pending = r.pendingAtVenueRD;
                      return (
                        <tr key={r.id} className="border-b border-white/[0.05]">
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#E5E7EB]">
                            {dt.format(new Date(r.createdAt))}
                          </td>
                          <td className="max-w-[240px] px-3 py-2.5">
                            <p className="truncate font-medium text-white">{r.buyer?.fullName ?? "—"}</p>
                            <p className="truncate text-xs text-[#6B7280]">{r.buyer?.email ?? "—"}</p>
                          </td>
                          <td className="px-3 py-2.5 text-[#E5E7EB]">{r.tableLabel ?? "—"}</td>
                          <td className="px-3 py-2.5 tabular-nums text-[#9CA3AF]">{r.partySize}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums font-medium text-emerald-200">
                            {formatMoney(paid)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-[#9CA3AF]">
                            {contract != null ? formatMoney(contract) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-amber-200/90">
                            {pending != null ? formatMoney(pending) : "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-white/50">
                            {formatMoney(Number(r.totalAmount))}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-[#9CA3AF]">
                              {reservationStatusEs(r.status)}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
