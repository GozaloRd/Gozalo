"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  fetchDashboardAnalytics,
  fetchDashboardEvents,
  fetchDashboardReservations,
  fetchDashboardStats,
} from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";
import LiveOpsAlerts from "@/components/dashboard/LiveOpsAlerts";
import EventForecastCard from "@/components/dashboard/EventForecastCard";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { MobileDashboardHomeNav } from "@/components/dashboard/MobileDashboardHomeNav";
import {
  RevenueBreakdownChart,
  RevenueTrendChart,
} from "@/components/dashboard/home/DashboardCharts";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type PeriodKey = "today" | "week" | "month";

type PeriodStat = {
  today: number;
  week: number;
  month: number;
  changeVsPrevious: { todayPct: number; weekPct: number; monthPct: number };
};

type Stats = {
  reservations: PeriodStat;
  ticketsSold: PeriodStat;
  revenue: {
    totalRD: { today: number; week: number; month: number };
    changeVsPrevious: { todayPct: number; weekPct: number; monthPct: number };
  };
  activeEvents: number;
  occupancy: {
    activeEvent: { id: string; title: string } | null;
    currentAttendees: number;
    maxCapacity: number;
    ratio: number;
  };
};

type Analytics = {
  summary: {
    tickets: { today: number; total: number; deltaVsYesterday: number };
    reservations: { today: number; total: number; deltaVsYesterday: number };
    revenue: { today: number; total: number; deltaVsYesterday: number };
    occupancyCurrent: {
      currentAttendees: number;
      maxCapacity: number;
      ratio: number;
      percentage: number;
    };
  };
  charts: {
    salesByDay: { day: string; total: number }[];
    entriesVsTables: { eventId: string; eventTitle: string; tickets: number; tables: number }[];
    revenueByEvent: { eventId: string; eventTitle: string; total: number }[];
  };
  tables: {
    top5Events: { eventId: string; eventTitle: string; tickets: number; tables: number }[];
    occupancyByEvent: { eventId: string; eventTitle: string; capacity: number; attended: number; occupancyRate: number }[];
  };
};

type EventRow = {
  id: string;
  title: string;
  slug?: string;
  startAt: string;
  endAt: string;
  status?: string;
  city?: string;
  category?: string | null;
  coverImageUrl?: string | null;
  maxCapacity?: number | null;
  basePrice?: number | null;
  description?: string | null;
  images?: string[] | null;
  tableLayoutImageUrl?: string | null;
  requiresCoverForTable?: boolean;
  featured?: boolean;
  minimumAge?: number | null;
  refundPolicy?: string;
  ticketTypes?: { id: string; name: string; price: number; quantityTotal?: number; soldCount?: number }[];
  metricas?: {
    ticketsVendidos: number;
    reservasHechas: number;
    ingresosEstimadosRD: number;
  };
};

type ReservationsResp = { data?: unknown[]; items?: unknown[]; pagination?: { total?: number } };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
};

function pct(n: number) {
  if (!Number.isFinite(n)) return "0%";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function trendClass(v: number) {
  if (v > 0.5) return "text-emerald-400";
  if (v < -0.5) return "text-rose-400";
  return "text-slate-400";
}

function TrendChip({ value }: { value: number }) {
  const arrow = value > 0.5 ? "▲" : value < -0.5 ? "▼" : "•";
  return (
    <span className={`inline-flex items-center gap-1 rounded-md bg-white/5 px-1.5 py-0.5 text-xs font-medium ${trendClass(value)}`}>
      <span className="text-[10px]">{arrow}</span>
      {pct(value)}
    </span>
  );
}

function humanDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" });
}

function timeUntil(iso: string): { days: number; hours: number; minutes: number; live: boolean; ended: boolean; endIso?: string } {
  const now = Date.now();
  const target = new Date(iso).getTime();
  const diff = target - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, live: true, ended: false };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes, live: false, ended: false };
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function DashboardHomePage() {
  const { venue, venueId } = useDashboard();
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [upcoming, setUpcoming] = useState<EventRow[]>([]);
  const [pendingReservations, setPendingReservations] = useState(0);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const [s, a, evts, resvs] = await Promise.all([
        fetchDashboardStats(venueId).catch(() => null),
        fetchDashboardAnalytics({ range: "30d" }, venueId).catch(() => null),
        fetchDashboardEvents("upcoming", venueId).catch(() => ({ data: [] })),
        fetchDashboardReservations({ status: "pending" }, venueId).catch(() => ({ data: [] })),
      ]);
      if (s) setStats(s as Stats);
      if (a) setAnalytics(a as Analytics);
      const evRows = ((evts as { data?: EventRow[] })?.data ?? []) as EventRow[];
      setUpcoming(evRows);
      const rr = resvs as ReservationsResp;
      const pending = rr?.pagination?.total
        ?? (Array.isArray(rr?.data) ? rr.data.length : Array.isArray(rr?.items) ? rr.items.length : 0);
      setPendingReservations(pending);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
    const dataTick = window.setInterval(() => void load(), 30_000);
    const clockTick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearInterval(dataTick);
      window.clearInterval(clockTick);
    };
  }, [load]);

  // Próximo evento: primero el que esté en vivo, si no, el siguiente cronológico.
  const nextEvent = useMemo(() => {
    if (!upcoming.length) return null;
    const live = upcoming.find(
      (e) => new Date(e.startAt).getTime() <= now && new Date(e.endAt).getTime() >= now
    );
    if (live) return { event: live, live: true };
    const sorted = [...upcoming].sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
    );
    return { event: sorted[0], live: false };
  }, [upcoming, now]);

  // Las alertas ahora se calculan en el backend y se muestran en <LiveOpsAlerts />
  void pendingReservations;
  void upcoming;

  if (!venueId) {
    return <div className="py-16 text-center text-slate-500">Selecciona un local para ver el panel.</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <LiveOpsAlerts />

      <div className="md:hidden">
        <MobileDashboard
          upcomingEvents={upcoming}
          stats={stats}
          analytics={analytics}
          loading={loading}
          nowMs={now}
          onRefreshData={load}
        />
      </div>

      <Suspense fallback={<div className="hidden h-40 animate-pulse rounded-2xl bg-white/[0.04] md:block lg:hidden" aria-hidden />}>
        <div className="hidden md:block lg:hidden">
          <MobileDashboardHomeNav />
        </div>
      </Suspense>

      <div className="hidden lg:block">
        <GreetingBar venueName={venue?.name} capacity={venue?.capacity ?? 0} stats={stats} nextEvent={nextEvent?.event ?? null} />
      </div>

      <div className="hidden lg:block">
        <QuickActions />
      </div>

      <div className="hidden md:block space-y-6">
        <NextEventHero next={nextEvent} stats={stats} analytics={analytics} loading={loading && !nextEvent} />

        {nextEvent?.event && <EventForecastCard eventId={nextEvent.event.id} />}

        <PeriodToggle value={period} onChange={setPeriod} />

        <KpiGrid stats={stats} analytics={analytics} period={period} loading={loading && !stats} />

        <div className="grid gap-4 lg:grid-cols-3">
          <RevenueTrendChart data={analytics?.charts.salesByDay ?? []} loading={loading && !analytics} />
          <RevenueBreakdownChart data={analytics?.charts.entriesVsTables ?? []} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <TopEventsList data={analytics?.charts.revenueByEvent ?? []} />
          <OccupancyList data={analytics?.tables.occupancyByEvent ?? []} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Greeting
// ---------------------------------------------------------------------------

function GreetingBar({
  venueName,
  capacity,
  stats,
  nextEvent,
}: {
  venueName?: string;
  capacity: number;
  stats: Stats | null;
  nextEvent: EventRow | null;
}) {
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const active = stats?.occupancy.activeEvent != null;
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#15121F] via-[#111118] to-[#0D0D14] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#9B7FCA]/80">Panel del local</p>
          <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
            Hola{venueName ? `, ${venueName}` : ""}
          </h1>
          <p className="mt-1 text-sm capitalize text-slate-400">{today}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {active ? (
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              EN VIVO AHORA
            </span>
          ) : nextEvent ? (
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
              Próximo: {nextEvent.title}
            </span>
          ) : null}
          {capacity > 0 && (
            <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
              Aforo: {capacity.toLocaleString("es-ES")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

function QuickActions() {
  const actions: { href: string; label: string; icon: React.ReactNode; accent?: boolean }[] = [
    { href: "/dashboard/eventos", label: "Crear evento", icon: <IconPlus />, accent: true },
    { href: "/dashboard/reservas", label: "Reservas", icon: <IconCalendar /> },
    { href: "/dashboard/caja", label: "Reportar caja", icon: <IconCash /> },
    { href: "/dashboard/acceso", label: "Control de acceso", icon: <IconQr /> },
    { href: "/dashboard/estadisticas", label: "Estadísticas", icon: <IconChart /> },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className={`group flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
            a.accent
              ? "border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C]/40 to-[#9B7FCA]/15 text-white hover:border-[#E0AAFF]/70 hover:from-[#6A33A0]/50"
              : "border-white/[0.08] bg-[#111118] text-slate-200 hover:border-white/20 hover:bg-[#15151F]"
          }`}
        >
          <span className={a.accent ? "text-[#E0AAFF]" : "text-[#9B7FCA] group-hover:text-[#C77DFF]"}>
            {a.icon}
          </span>
          <span className="truncate">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Next event hero
// ---------------------------------------------------------------------------

function NextEventHero({
  next,
  stats,
  analytics,
  loading,
}: {
  next: { event: EventRow; live: boolean } | null;
  stats: Stats | null;
  analytics: Analytics | null;
  loading: boolean;
}) {
  if (loading) return <SkeletonBlock height={260} />;
  if (!next) {
    return (
      <div className="rounded-2xl border border-dashed border-white/[0.1] bg-[#111118] p-8 text-center">
        <p className="text-lg font-semibold text-white">No tienes eventos próximos</p>
        <p className="mt-1 text-sm text-slate-400">
          Publica un evento para empezar a recibir reservas y entradas.
        </p>
        <Link
          href="/dashboard/eventos"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C]/40 to-[#9B7FCA]/20 px-4 py-2 text-sm font-semibold text-white hover:border-[#E0AAFF]/70"
        >
          <IconPlus /> Crear evento
        </Link>
      </div>
    );
  }

  const { event, live } = next;
  const sold = event.metricas?.ticketsVendidos ?? 0;
  const reservations = event.metricas?.reservasHechas ?? 0;
  const revenue = event.metricas?.ingresosEstimadosRD ?? 0;
  const capacity = event.maxCapacity ?? 0;
  const fillRate = capacity > 0 ? Math.min(100, Math.round(((sold + reservations) / capacity) * 100)) : 0;
  const countdown = timeUntil(event.startAt);

  const liveOccupancy = live && stats?.occupancy.activeEvent?.id === event.id
    ? stats.occupancy
    : null;

  // readiness checklist
  const hasTickets = (event.ticketTypes?.length ?? 0) > 0;
  const hasCover = !!event.coverImageUrl;
  const hasCapacity = (capacity ?? 0) > 0;
  const hasDesc = !!event.description && event.description.length > 20;
  const readinessItems = [
    { ok: hasTickets, label: "Tipos de entrada", href: "/dashboard/tickets" },
    { ok: hasCapacity, label: "Aforo configurado", href: "/dashboard/eventos" },
    { ok: hasCover, label: "Portada del evento", href: "/dashboard/eventos" },
    { ok: hasDesc, label: "Descripción detallada", href: "/dashboard/eventos" },
  ];
  const score = readinessItems.filter((r) => r.ok).length;
  const readinessPct = Math.round((score / readinessItems.length) * 100);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111118]">
      {event.coverImageUrl && (
        <div
          aria-hidden
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage: `url(${event.coverImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(28px) saturate(1.4)",
            transform: "scale(1.15)",
          }}
        />
      )}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-[#111118]/80 via-[#111118]/90 to-[#111118]" />

      <div className="relative grid gap-6 p-6 md:grid-cols-[1fr,260px] md:p-8">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {live ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                EN VIVO
              </span>
            ) : (
              <span className="rounded-full border border-[#C77DFF]/30 bg-[#C77DFF]/10 px-3 py-1 text-xs font-semibold text-[#E0AAFF]">
                PRÓXIMO EVENTO
              </span>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {dayLabel(event.startAt)}
            </span>
            {event.city && (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {event.city}
              </span>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">{event.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{humanDateTime(event.startAt)}</p>
          </div>

          {!live && (
            <div className="grid grid-cols-3 gap-3">
              <CountBox value={countdown.days} label={countdown.days === 1 ? "día" : "días"} />
              <CountBox value={countdown.hours} label="horas" />
              <CountBox value={countdown.minutes} label="min" />
            </div>
          )}

          {live && liveOccupancy && (
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-emerald-200/80">Ocupación actual</span>
                <span className="text-2xl font-bold text-emerald-300">
                  {Math.round((liveOccupancy.ratio || 0) * 100)}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                  style={{ width: `${Math.min(100, Math.round((liveOccupancy.ratio || 0) * 100))}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-emerald-200/70">
                {liveOccupancy.currentAttendees} de {liveOccupancy.maxCapacity} asistentes
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <MetricMini label="Entradas" value={sold} sub={capacity ? `/ ${capacity} aforo` : undefined} />
            <MetricMini label="Reservas" value={reservations} />
            <MetricMini label="Ingresos est." value={formatMoney(revenue)} />
          </div>

          {capacity > 0 && !live && (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-slate-400">Ocupación proyectada</span>
                <span className="text-sm font-semibold text-white">{fillRate}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#9B7FCA] via-[#C77DFF] to-[#E0AAFF]"
                  style={{ width: `${fillRate}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/dashboard/eventos"
              className="rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C]/40 to-[#9B7FCA]/20 px-4 py-2 text-sm font-semibold text-white hover:border-[#E0AAFF]/70"
            >
              Gestionar evento
            </Link>
            <Link
              href="/dashboard/tickets"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/10"
            >
              Tickets
            </Link>
            <Link
              href="/dashboard/mesas"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/10"
            >
              Mesas
            </Link>
          </div>
        </div>

        {/* Preparación del evento (sólo escritorio; en móvil se evita el bloque tipo «setup») */}
        <aside className="hidden self-start rounded-xl border border-white/[0.08] bg-black/20 p-4 backdrop-blur lg:block">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400">Preparación</span>
            <span className={`text-lg font-bold ${readinessPct === 100 ? "text-emerald-300" : "text-[#E0AAFF]"}`}>
              {readinessPct}%
            </span>
          </div>
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all ${
                readinessPct === 100
                  ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                  : "bg-gradient-to-r from-[#9B7FCA] to-[#E0AAFF]"
              }`}
              style={{ width: `${readinessPct}%` }}
            />
          </div>
          <ul className="space-y-2.5">
            {readinessItems.map((r) => (
              <li key={r.label}>
                <Link
                  href={r.href}
                  className="flex items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white"
                >
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      r.ok
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/5 text-slate-400"
                    }`}
                  >
                    {r.ok ? "✓" : "·"}
                  </span>
                  <span className={r.ok ? "line-through opacity-70" : ""}>{r.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {analytics?.summary.revenue.total != null && (
            <div className="mt-4 border-t border-white/5 pt-3">
              <p className="text-[11px] uppercase tracking-wider text-slate-500">Ingresos totales</p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {formatMoney(analytics.summary.revenue.total)}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function CountBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3 text-center">
      <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
    </div>
  );
}

function MetricMini({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
      <p className="text-[11px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Period toggle
// ---------------------------------------------------------------------------

function PeriodToggle({ value, onChange }: { value: PeriodKey; onChange: (k: PeriodKey) => void }) {
  const options: PeriodKey[] = ["today", "week", "month"];
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Rendimiento</h3>
      <div className="inline-flex rounded-xl border border-white/[0.08] bg-[#111118] p-1">
        {options.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              value === k
                ? "bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] text-white shadow-[0_0_12px_rgba(199,125,255,0.35)]"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {PERIOD_LABEL[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI grid
// ---------------------------------------------------------------------------

function KpiGrid({
  stats,
  analytics,
  period,
  loading,
}: {
  stats: Stats | null;
  analytics: Analytics | null;
  period: PeriodKey;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} height={128} />
        ))}
      </div>
    );
  }

  const pctKey = period === "today" ? "todayPct" : period === "week" ? "weekPct" : "monthPct";
  const revenue = stats?.revenue.totalRD[period] ?? 0;
  const revenueDelta = stats?.revenue.changeVsPrevious[pctKey] ?? 0;
  const tickets = stats?.ticketsSold[period] ?? 0;
  const ticketsDelta = stats?.ticketsSold.changeVsPrevious[pctKey] ?? 0;
  const resvs = stats?.reservations[period] ?? 0;
  const resvsDelta = stats?.reservations.changeVsPrevious[pctKey] ?? 0;
  const occupancy =
    analytics?.summary.occupancyCurrent?.percentage ??
    Math.round((stats?.occupancy.ratio ?? 0) * 100);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Ingresos"
        value={formatMoney(revenue)}
        delta={revenueDelta}
        sublabel={PERIOD_LABEL[period]}
        icon={<IconCash />}
      />
      <KpiCard
        label="Entradas vendidas"
        value={tickets.toLocaleString("es-ES")}
        delta={ticketsDelta}
        sublabel={PERIOD_LABEL[period]}
        icon={<IconTicket />}
      />
      <KpiCard
        label="Reservas"
        value={resvs.toLocaleString("es-ES")}
        delta={resvsDelta}
        sublabel={PERIOD_LABEL[period]}
        icon={<IconCalendar />}
      />
      <KpiCard
        label="Ocupación en curso"
        value={`${occupancy}%`}
        sublabel={
          stats?.occupancy.activeEvent
            ? stats.occupancy.activeEvent.title
            : "Sin evento activo"
        }
        icon={<IconUsers />}
        accent
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  sublabel,
  icon,
  accent,
}: {
  label: string;
  value: string;
  delta?: number;
  sublabel?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition-all ${
        accent
          ? "border-[#C77DFF]/30 bg-gradient-to-br from-[#1a1326] via-[#111118] to-[#111118]"
          : "border-white/[0.08] bg-[#111118] hover:border-white/15"
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <span className={`text-lg ${accent ? "text-[#E0AAFF]" : "text-[#9B7FCA] opacity-70 group-hover:opacity-100"}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-white tabular-nums">{value}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="truncate text-xs text-slate-500">{sublabel}</p>
        {typeof delta === "number" && <TrendChip value={delta} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top events list
// ---------------------------------------------------------------------------

function TopEventsList({ data }: { data: { eventId: string; eventTitle: string; total: number }[] }) {
  const top = data.slice(0, 5);
  const max = Math.max(1, ...top.map((x) => x.total));
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-400">Top eventos por ingresos</p>
        <Link href="/dashboard/estadisticas" className="text-xs text-[#C77DFF] hover:text-[#E0AAFF]">
          Ver todas →
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Todavía no hay ingresos registrados.</p>
      ) : (
        <ol className="space-y-3">
          {top.map((e, idx) => {
            const w = Math.max(4, Math.round((e.total / max) * 100));
            return (
              <li key={e.eventId} className="group">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-slate-200">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/5 text-[11px] font-semibold text-slate-400">
                      {idx + 1}
                    </span>
                    <span className="truncate">{e.eventTitle}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-white tabular-nums">
                    {formatMoney(e.total)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#9B7FCA] via-[#C77DFF] to-[#E0AAFF] transition-all group-hover:shadow-[0_0_10px_rgba(199,125,255,0.5)]"
                    style={{ width: `${w}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Occupancy list
// ---------------------------------------------------------------------------

function OccupancyList({
  data,
}: {
  data: { eventId: string; eventTitle: string; capacity: number; attended: number; occupancyRate: number }[];
}) {
  const top = data.slice(0, 5);
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-400">Ocupación por evento</p>
        <Link href="/dashboard/estadisticas" className="text-xs text-[#C77DFF] hover:text-[#E0AAFF]">
          Ver estadísticas →
        </Link>
      </div>
      {top.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Sin datos de ocupación disponibles.</p>
      ) : (
        <ul className="space-y-3">
          {top.map((e) => {
            const rate = Math.min(100, Math.max(0, Math.round(e.occupancyRate)));
            const warn = rate >= 85;
            return (
              <li key={e.eventId}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="min-w-0 truncate text-slate-200">{e.eventTitle}</span>
                  <span className={`shrink-0 font-semibold tabular-nums ${warn ? "text-amber-300" : "text-white"}`}>
                    {rate}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${
                      warn
                        ? "bg-gradient-to-r from-amber-400 to-amber-500"
                        : "bg-gradient-to-r from-[#9B7FCA] to-[#C77DFF]"
                    }`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {e.attended} asistentes / {e.capacity || "—"} aforo
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonBlock({ height = 160 }: { height?: number }) {
  return (
    <div
      className="animate-pulse rounded-2xl border border-white/[0.06] bg-[#111118]"
      style={{ height }}
    />
  );
}

// ---------------------------------------------------------------------------
// Iconos inline (stroke 1.75)
// ---------------------------------------------------------------------------

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconCash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v.01M18 14v.01" />
    </svg>
  );
}
function IconQr() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v1" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 4 4 5-7" />
    </svg>
  );
}
function IconTicket() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 000 4v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 000-4V9z" />
      <path d="M13 5v14" strokeDasharray="2 2" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}
