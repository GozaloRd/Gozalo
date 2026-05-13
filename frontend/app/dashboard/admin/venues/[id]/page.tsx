"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ElementType } from "react";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Receipt,
  Ticket,
  UserRound,
} from "lucide-react";
import { fetchAdminVenueDetail, type AdminVenueDetail } from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";

export default function AdminVenueDetailPage() {
  const params = useParams();
  const id = String(params.id ?? "");
  const [detail, setDetail] = useState<AdminVenueDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const from = new Date(now);
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        const data = await fetchAdminVenueDetail(id, { from: from.toISOString(), to: now.toISOString() });
        if (c) return;
        setDetail(data);
      } catch {
        if (!c) setDetail(null);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [id]);

  const issues = detail?.issues;
  const issueTotal = issues?.total ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div className="rounded-xl bg-[#0d0d0d] p-5 md:p-6">
        <Link
          href="/dashboard/admin/locales"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#B39CD8] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Volver a locales
        </Link>

        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
              Detalle por local
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
              {detail?.venue.name ?? (loading ? "Cargando local…" : `ID ${id.slice(0, 8)}…`)}
            </h1>
            <p className="mt-1 text-sm text-white/35">
              {detail?.venue.city ?? "Sin ciudad"} · Estado: {detail?.venue.status ?? "—"} · Últimos 30 días
            </p>
          </div>
          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              issueTotal > 0
                ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {issueTotal > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {issueTotal > 0 ? `${issueTotal} incidencias` : "Sin incidencias críticas"}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-white/75">Conciliación de dinero</p>
              <p className="mt-0.5 text-[11px] text-white/25">Cliente, local, Gozalo y pagos problemáticos.</p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Cobrado al cliente", detail?.reconciliation.customerCollected, CreditCard, "text-white", "border-l-[#22c55e]"],
              ["Ingreso del local", detail?.reconciliation.localRevenue, Building2, "text-emerald-200", "border-l-[#10b981]"],
              ["Comisión Gozalo", detail?.reconciliation.appCommission, BadgeDollarSign, "text-[#B39CD8]", "border-l-[#a855f7]"],
              ["Pendiente por cobrar", detail?.reconciliation.pendingToCollect, Receipt, "text-amber-200", "border-l-[#f59e0b]"],
              ["Pagos fallidos", detail?.reconciliation.failedAmount, AlertTriangle, "text-red-200", "border-l-[#ef4444]"],
              ["Pagos completados", detail?.reconciliation.completedPayments, CheckCircle2, "text-blue-200", "border-l-[#3b82f6]"],
            ].map((row) => {
              const label = row[0] as string;
              const value = row[1];
              const IconEl = row[2] as ElementType<{ className?: string }>;
              const color = row[3] as string;
              const border = row[4] as string;
              return (
              <div key={label} className={`min-h-[112px] rounded-2xl border border-l-[3px] border-white/[0.08] bg-zinc-950/60 p-4 ${border}`}>
                <IconEl className={`h-5 w-5 ${color}`} aria-hidden />
                <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-white/25">{label}</p>
                <p className={`mt-1 text-lg font-bold tabular-nums ${color}`}>{formatMoney(Number(value ?? 0))}</p>
              </div>
            );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <p className="text-[13px] font-semibold text-white/75">Dueño y estado</p>
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4">
            <UserRound className="h-5 w-5 text-blue-400" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-white">{detail?.venue.owner?.fullName ?? "Sin dueño"}</p>
            <p className="mt-1 text-sm text-white/45">{detail?.venue.owner?.email ?? "—"}</p>
            <p className="mt-1 text-sm text-white/35">{detail?.venue.owner?.phone ?? "Sin teléfono"}</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">Eventos activos</p>
              <p className="mt-1 text-lg font-semibold text-white">{detail?.counts.eventsTotal ?? 0}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">Última actividad</p>
              <p className="mt-1 text-xs font-medium text-white/70">
                {detail?.lastActivityAt ? new Date(detail.lastActivityAt).toLocaleString("es-DO") : "—"}
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <p className="text-[13px] font-semibold text-white/75">Incidencias del local</p>
          <div className="mt-4 grid gap-2">
            {[
              ["Pagos pendientes", issues?.pendingPayments ?? 0],
              ["Pagos fallidos", issues?.failedPayments ?? 0],
              ["Emails de tickets con error", issues?.ticketEmailErrors ?? 0],
              ["Reservas pagadas en pending", issues?.paidReservationsStillPending ?? 0],
              ["Eventos publicados sin venta", issues?.publishedEventsWithoutSalesConfig ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex min-h-[44px] items-center justify-between rounded-xl border border-white/[0.06] bg-zinc-950/60 px-3 py-2.5">
                <span className="text-sm text-white/70">{label}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${Number(value) > 0 ? "bg-amber-500/15 text-amber-200" : "bg-white/[0.06] text-white/35"}`}>
                  {Number(value)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-white/75">Eventos recientes / activos</p>
              <p className="mt-0.5 text-[11px] text-white/25">Vista rápida para detectar actividad.</p>
            </div>
            <CalendarDays className="h-5 w-5 text-pink-400" />
          </div>
          <ul className="mt-4 space-y-2">
            {(detail?.events ?? []).map((event) => (
              <li key={event.id} className="flex min-h-[48px] items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/60 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white/75">{event.title}</span>
                  <span className="block text-xs text-white/30">{new Date(event.startAt).toLocaleString("es-DO")}</span>
                </span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/45">{event.status}</span>
              </li>
            ))}
            {!loading && (detail?.events ?? []).length === 0 ? (
              <li className="rounded-xl border border-white/[0.06] bg-zinc-950/60 px-3 py-4 text-sm text-white/35">
                Sin eventos registrados.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
