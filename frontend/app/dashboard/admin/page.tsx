"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Receipt,
  ShieldAlert,
  Ticket,
  Users,
} from "lucide-react";
import { fetchAdminDashboard, fetchAllVenuesMineList } from "@/lib/adminApi";
import { formatMoney } from "@/lib/format";
import type { VenuePickItem } from "@/lib/dashboardApi";

function numberLabel(n: number | undefined | null) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return new Intl.NumberFormat("es-DO").format(Number(n));
}

export default function AdminHomePage() {
  const [dash, setDash] = useState<Awaited<ReturnType<typeof fetchAdminDashboard>> | null>(null);
  const [venues, setVenues] = useState<VenuePickItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [d, v] = await Promise.all([fetchAdminDashboard(), fetchAllVenuesMineList()]);
        if (!c) {
          setDash(d);
          setVenues(v);
        }
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const pendingApprovals = dash?.venuesPending ?? 0;
  const issueTotal = dash?.issues?.total ?? pendingApprovals;
  const localRevenue = dash?.localRevenueRD ?? dash?.totalVolumeRD ?? 0;
  const appRevenue = dash?.estimatedAppCommissionsRD ?? dash?.platformCommissionsRD ?? 0;
  const ticketsCommission = dash?.estimatedTicketsCommissionRD ?? 0;
  const reservationsCommission = dash?.estimatedReservationsCommissionRD ?? 0;
  const customerCount = dash?.usersByRole?.customer ?? 0;
  const ownerCount = dash?.usersByRole?.venue_owner ?? 0;

  const kpis = [
    {
      label: "Ingresos locales",
      value: dash ? formatMoney(localRevenue) : "—",
      hint: "Ventas controladas por tickets y reservas",
      Icon: CircleDollarSign,
      accent: "text-emerald-400",
      border: "border-l-[#10b981]",
      glow: "bg-emerald-500/10",
    },
    {
      label: "Comisiones Gozalo",
      value: dash ? formatMoney(appRevenue) : "—",
      hint: "10% tickets · 5% reservas",
      Icon: BadgeDollarSign,
      accent: "text-[#9B7FCA]",
      border: "border-l-[#a855f7]",
      glow: "bg-purple-500/10",
    },
    {
      label: "Usuarios",
      value: dash ? numberLabel(dash.totalUsers) : "—",
      hint: `${numberLabel(customerCount)} clientes · ${numberLabel(ownerCount)} locales`,
      Icon: Users,
      accent: "text-blue-400",
      border: "border-l-[#3b82f6]",
      glow: "bg-blue-500/10",
    },
    {
      label: "Problemas",
      value: dash ? numberLabel(issueTotal) : "—",
      hint: issueTotal > 0 ? "Requieren revisión" : "Todo estable",
      Icon: issueTotal > 0 ? ShieldAlert : CheckCircle2,
      accent: issueTotal > 0 ? "text-amber-300" : "text-emerald-400",
      border: issueTotal > 0 ? "border-l-[#f59e0b]" : "border-l-[#10b981]",
      glow: issueTotal > 0 ? "bg-amber-500/10" : "bg-emerald-500/10",
    },
  ];

  const issueCards = [
    {
      label: "Locales pendientes",
      value: dash?.issues?.pendingVenues ?? pendingApprovals,
      href: "/dashboard/admin/pendientes",
      tone: "amber",
    },
    {
      label: "Pagos pendientes",
      value: dash?.issues?.pendingPayments ?? 0,
      href: "/dashboard/admin/ingresos",
      tone: "zinc",
    },
    {
      label: "Pagos fallidos",
      value: dash?.issues?.failedPayments ?? 0,
      href: "/dashboard/admin/ingresos",
      tone: "red",
    },
    {
      label: "Reservas pagadas en pending",
      value: dash?.issues?.paidReservationsStillPending ?? 0,
      href: "/dashboard/admin/ingresos",
      tone: "amber",
    },
    {
      label: "Emails de tickets con error",
      value: dash?.issues?.ticketEmailErrors ?? 0,
      href: "/dashboard/admin/ingresos",
      tone: "red",
    },
    {
      label: "Eventos publicados sin venta",
      value: dash?.issues?.publishedEventsWithoutSalesConfig ?? 0,
      href: "/dashboard/admin/eventos",
      tone: "zinc",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-4">
      <div className="overflow-hidden rounded-xl bg-[#0d0d0d] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.42)] md:p-6">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0D0D14]/90 px-5 py-5 backdrop-blur-xl md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
                Admin Gozalo
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-normal text-white md:text-3xl">
                Panel de control global
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-white/35">
                Vista simple para vigilar ingresos, comisiones, usuarios, locales y problemas operativos.
              </p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                issueTotal > 0
                  ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                  : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {issueTotal > 0 ? (
                <AlertTriangle className="h-4 w-4" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              )}
              {issueTotal > 0 ? `${issueTotal} alertas` : "Sin alertas críticas"}
            </div>
          </div>
        </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm text-red-200">
              {err}
            </div>
          ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map(({ label, value, hint, Icon, accent, border, glow }) => (
            <div
              key={label}
              className={`min-h-[138px] rounded-2xl border border-l-[3px] border-white/[0.08] bg-zinc-950/60 p-4 ${border}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/25">
                    {label}
                  </p>
                  <p className="mt-2 truncate text-xl font-bold tabular-nums tracking-normal text-white [font-variant-numeric:tabular-nums]">
                    {value}
                  </p>
                </div>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] ${glow}`}>
                  <Icon className={`h-5 w-5 ${accent}`} aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-xs text-white/30">{hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold tracking-normal text-white/75">Ingresos y comisiones</p>
              <p className="mt-0.5 text-[11px] text-white/25">
                Separado entre lo que generan los locales y lo que ingresa Gozalo.
              </p>
            </div>
            <Link
              href="/dashboard/admin/ingresos"
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/65 transition hover:bg-white/[0.08] hover:text-white"
            >
              Detalle <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="min-h-[150px] rounded-2xl border border-l-[3px] border-white/[0.08] border-l-[#10b981] bg-zinc-950/60 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <CreditCard className="h-5 w-5 text-emerald-400" aria-hidden />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-white/25">Locales</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-white [font-variant-numeric:tabular-nums]">
                {dash ? formatMoney(localRevenue) : "—"}
              </p>
              <p className="mt-1 text-xs text-white/30">Ingresos brutos controlados</p>
            </div>
            <div className="min-h-[150px] rounded-2xl border border-l-[3px] border-white/[0.08] border-l-[#22c55e] bg-zinc-950/60 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
                <Ticket className="h-5 w-5 text-[#22c55e]" aria-hidden />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-white/25">Tickets 10%</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#22c55e] [font-variant-numeric:tabular-nums]">
                {dash ? formatMoney(ticketsCommission) : "—"}
              </p>
              <p className="mt-1 text-xs text-white/30">
                Sobre {dash ? formatMoney(dash.ticketsGrossRD ?? 0) : "—"}
              </p>
            </div>
            <div className="min-h-[150px] rounded-2xl border border-l-[3px] border-white/[0.08] border-l-[#a855f7] bg-zinc-950/60 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10">
                <Receipt className="h-5 w-5 text-[#9B7FCA]" aria-hidden />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-white/25">Mesas 5%</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[#B39CD8] [font-variant-numeric:tabular-nums]">
                {dash ? formatMoney(reservationsCommission) : "—"}
              </p>
              <p className="mt-1 text-xs text-white/30">
                Sobre {dash ? formatMoney(dash.reservationsGrossRD ?? 0) : "—"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold tracking-normal text-white/75">Estado operativo</p>
              <p className="mt-0.5 text-[11px] text-white/25">Lo que debe revisar el admin.</p>
            </div>
            <ShieldAlert className={issueTotal > 0 ? "h-5 w-5 text-amber-300" : "h-5 w-5 text-emerald-400"} />
          </div>
          <div className="mt-4 grid gap-2">
            {issueCards.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/60 px-3 py-2.5 transition hover:bg-white/[0.04]"
              >
                <span className="min-w-0 truncate text-sm font-medium text-white/70">{item.label}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                    item.value > 0
                      ? item.tone === "red"
                        ? "bg-red-500/15 text-red-200"
                        : "bg-amber-500/15 text-amber-200"
                      : "bg-white/[0.06] text-white/35"
                  }`}
                >
                  {numberLabel(item.value)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold tracking-normal text-white/75">Plataforma</p>
              <p className="mt-0.5 text-[11px] text-white/25">Usuarios, locales y eventos.</p>
            </div>
            <CalendarDays className="h-5 w-5 text-white/30" aria-hidden />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["Locales activos", dash?.venuesApproved],
              ["Locales pendientes", dash?.venuesPending],
              ["Eventos publicados", dash?.eventsPublished],
              ["Eventos borrador", dash?.eventsDraft],
            ].map(([label, value]) => (
              <div key={label} className="min-h-[82px] rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/25">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-white [font-variant-numeric:tabular-nums]">
                  {dash ? numberLabel(Number(value ?? 0)) : "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d] p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold tracking-normal text-white/75">Locales principales</p>
              <p className="mt-0.5 text-[11px] text-white/25">
                Ranking simple por ingresos controlados.
              </p>
            </div>
            <Link
              href="/dashboard/admin/locales"
              className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/65 transition hover:bg-white/[0.08] hover:text-white"
            >
              Ver locales <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {(dash?.topVenues ?? []).length === 0 ? (
              <p className="rounded-xl border border-white/[0.06] bg-zinc-950/60 px-3 py-4 text-sm text-white/35">
                Aún no hay ingresos controlados por local.
              </p>
            ) : (
              (dash?.topVenues ?? []).map((venue) => (
                <Link
                  key={venue.venueId ?? venue.venueName}
                  href={venue.venueId ? `/dashboard/admin/venues/${venue.venueId}` : "/dashboard/admin/locales"}
                  className="flex min-h-[58px] items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-zinc-950/60 px-3 py-3 transition hover:bg-white/[0.04]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white/75">{venue.venueName}</span>
                    <span className="block truncate text-xs text-white/30">{venue.venueCity ?? "Sin ciudad"}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-emerald-300 [font-variant-numeric:tabular-nums]">
                      {formatMoney(venue.localRevenueRD)}
                    </span>
                    <span className="block text-[11px] tabular-nums text-[#B39CD8] [font-variant-numeric:tabular-nums]">
                      {formatMoney(venue.appCommissionRD)} app
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-white/[0.08] bg-[#0d0d0d]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 md:px-5">
          <div>
            <p className="text-[13px] font-semibold tracking-normal text-white/75">Accesos rápidos</p>
            <p className="mt-0.5 text-[11px] text-white/25">Lo justo para operar sin perderse.</p>
          </div>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { href: "/dashboard/admin/locales", label: "Locales", hint: `${venues.length} registrados`, Icon: Building2 },
            { href: "/dashboard/admin/usuarios", label: "Usuarios", hint: "Roles y permisos", Icon: Users },
            { href: "/dashboard/admin/ingresos", label: "Ingresos", hint: "Comisiones y ventas", Icon: BadgeDollarSign },
            { href: "/dashboard/admin/eventos", label: "Eventos", hint: `${numberLabel(dash?.eventsTotal ?? 0)} totales`, Icon: CalendarDays },
          ].map(({ href, label, hint, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[76px] items-center gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/60 p-4 transition hover:bg-white/[0.04]"
            >
              <Icon className="h-6 w-6 shrink-0 text-[#9B7FCA]" aria-hidden />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white/85">{label}</span>
                <span className="block truncate text-xs text-white/30">{hint}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
