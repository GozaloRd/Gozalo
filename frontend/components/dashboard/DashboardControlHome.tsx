"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  CircleDollarSign,
  QrCode,
  ShoppingBag,
  Target,
  Ticket,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";
import { formatMoney } from "@/lib/format";
import { buildStatsKpis } from "@/lib/statsMobileDerive";
import { useCountUp } from "@/hooks/useCountUp";
import { useCountdown } from "@/hooks/useCountdown";
import { useSalesPanelMetrics } from "@/hooks/useSalesMetrics";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import type { QuickAreaId } from "@/components/dashboard/quickActions.config";
import { QUICK_AREAS } from "@/components/dashboard/quickActions.config";

const MIN_PCT = 0.05;

function trendFromMonthPct(pct: number | null | undefined): { text: string; className: string } {
  if (pct == null || !Number.isFinite(pct)) return { text: "—", className: "text-zinc-500" };
  if (Math.abs(pct) < MIN_PCT) return { text: "→ 0%", className: "text-zinc-500" };
  if (pct > 0) return { text: `↗ +${Math.round(pct)}%`, className: "text-emerald-500" };
  return { text: `↘ ${Math.round(pct)}%`, className: "text-red-400" };
}

function CountMoney({ value }: { value: number }) {
  const v = useCountUp(Math.max(0, Math.round(value)), 1000);
  return <span className="tabular-nums">{formatMoney(v)}</span>;
}

function CountInt({ value }: { value: number }) {
  const v = useCountUp(Math.max(0, Math.round(value)), 1000);
  return <span className="tabular-nums">{Math.round(v)}</span>;
}

function isLiveEvent(event: UpcomingEventModel, nowMs: number) {
  const s = new Date(event.startAt).getTime();
  const e = new Date(event.endAt).getTime();
  return s <= nowMs && e >= nowMs;
}

function countdownAccent(diffMs: number): string {
  if (diffMs <= 0) return "text-zinc-500";
  if (diffMs < 86_400_000) return "text-red-400 animate-pulse";
  const days = diffMs / 86_400_000;
  if (days < 7) return "text-orange-400";
  if (days <= 30) return "text-amber-400";
  return "text-white";
}

const QUICK_HOME = QUICK_AREAS.filter((a) => a.id !== "config");

const QUICK_HINT: Record<string, string> = {
  eventos: "Activos, pasados y plantillas",
  ventas: "Tickets, mesas y órdenes",
  acceso: "QR y mesas en vivo",
  caja: "Reportes y arqueos",
  estadisticas: "KPIs y comparativas",
};

/** Hover accesos rápidos (200ms): bg /8, borde /30, translateY. */
const QUICK_HOVER_STYLES: Record<string, { hover: string }> = {
  eventos: {
    hover: "hover:bg-orange-500/[0.08] hover:border-orange-500/30 hover:-translate-y-0.5",
  },
  ventas: {
    hover: "hover:bg-emerald-500/[0.08] hover:border-emerald-500/30 hover:-translate-y-0.5",
  },
  acceso: {
    hover: "hover:bg-blue-500/[0.08] hover:border-blue-500/30 hover:-translate-y-0.5",
  },
  caja: {
    hover: "hover:bg-purple-500/[0.08] hover:border-purple-500/30 hover:-translate-y-0.5",
  },
  estadisticas: {
    hover: "hover:bg-pink-500/[0.08] hover:border-pink-500/30 hover:-translate-y-0.5",
  },
};

const QUICK_ICON: Record<string, typeof Calendar> = {
  eventos: Calendar,
  ventas: ShoppingBag,
  acceso: QrCode,
  caja: Wallet,
  estadisticas: BarChart3,
};

const QUICK_ACCENT: Record<string, string> = {
  eventos: "text-orange-500",
  ventas: "text-emerald-500",
  acceso: "text-blue-500",
  caja: "text-purple-500",
  estadisticas: "text-pink-500",
};

type Props = {
  nowMs: number;
  venueId?: string;
  venueName?: string;
  upcomingEvents: UpcomingEventModel[];
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
  loading: boolean;
  onOpenArea: (id: QuickAreaId) => void;
};

export function DashboardControlHome({
  nowMs,
  venueId,
  venueName,
  upcomingEvents,
  stats,
  analytics,
  loading,
  onOpenArea,
}: Props) {
  const reduceMotion = useReducedMotion();
  const { data: salesMetrics } = useSalesPanelMetrics(venueId ?? null);
  const next = upcomingEvents[0];
  const derived = useMemo(
    () => buildStatsKpis(stats, analytics, salesMetrics ?? null),
    [stats, analytics, salesMetrics]
  );

  const byKey = useMemo(() => Object.fromEntries(derived.map((d) => [d.key, d])), [derived]);

  const revMonthNum = useMemo(() => {
    const smMonth = salesMetrics?.month?.total != null ? Number(salesMetrics.month.total) : null;
    if (smMonth != null && smMonth > 0.005) return smMonth;
    return Number(stats?.revenue?.totalRD?.month ?? analytics?.summary?.revenue?.total ?? 0);
  }, [salesMetrics, stats, analytics]);

  const occPct =
    analytics?.summary?.occupancyCurrent?.percentage ?? Math.round((stats?.occupancy?.ratio ?? 0) * 100);
  const activeEv = stats?.occupancy?.activeEvent;
  const activeEventsCount = stats?.activeEvents ?? upcomingEvents.length;
  const entradasMonth = stats?.ticketsSold?.month ?? 0;
  const entradasTrend = trendFromMonthPct(stats?.ticketsSold?.changeVsPrevious?.monthPct);

  const ing = byKey.ingresos;
  const tProm = byKey.ticketProm;
  const nuevos = byKey.nuevos;
  const nuevosNum = Number(stats?.reservations?.month ?? 0);

  const live = next ? isLiveEvent(next, nowMs) : false;
  const showCd = next && !live;
  const cd = useCountdown(
    next?.startAt ?? "1970-01-01T00:00:00.000Z",
    Boolean(showCd && next)
  );
  const diffMs = next ? new Date(next.startAt).getTime() - nowMs : 0;
  const cdAccent = countdownAccent(diffMs);

  const sold = next?.metricas?.ticketsVendidos ?? 0;
  const capacity = next?.maxCapacity ?? 0;
  const fillRate =
    capacity > 0 ? Math.min(100, Math.round(((sold + (next?.metricas?.reservasHechas ?? 0)) / capacity) * 100)) : 0;

  const [occBarW, setOccBarW] = useState(0);
  useEffect(() => {
    setOccBarW(0);
    const id = window.setTimeout(() => setOccBarW(fillRate), 300);
    return () => window.clearTimeout(id);
  }, [fillRate, next?.id]);

  const cal = useMemo(() => {
    if (!next) return null;
    const d = new Date(next.startAt);
    return {
      day: d.getDate(),
      monthShort: d.toLocaleString("es-DO", { month: "short" }).replace(".", ""),
      weekday: d.toLocaleString("es-DO", { weekday: "short" }).replace(".", ""),
      time: d.toLocaleString("es-DO", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };
  }, [next]);

  const d120 = reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0 };
  const dHero = reduceMotion ? { duration: 0 } : { duration: 0.4, delay: 0.1 };
  const dSep = reduceMotion ? { duration: 0 } : { duration: 0.35, delay: 0.5 };

  return (
    <div className="dashboard-home-desktop mx-auto w-full max-w-[1600px] pb-4 font-sans text-sm text-zinc-300 md:pb-2">
      <motion.div
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={d120}
        className="mb-5"
      >
        <h1 className="text-xl font-semibold text-white">Panel de control</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Resumen inteligente de todas las áreas{venueName ? ` · ${venueName}` : ""}.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_320px] md:items-stretch md:gap-4 lg:grid-cols-[1fr_380px] lg:gap-5 xl:grid-cols-[minmax(0,680px)_1fr] xl:gap-6 2xl:grid-cols-[minmax(0,720px)_1fr] 2xl:gap-6">
        <motion.div
          initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={dHero}
          className="flex min-h-[320px] min-w-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/50 bg-zinc-900/50 md:min-h-[380px] md:flex-row md:items-stretch"
        >
          {loading && !next ? (
            <div className="min-h-[320px] w-full animate-pulse bg-zinc-800/40 md:min-h-[380px]" aria-busy />
          ) : next ? (
            <>
              <div className="flex w-full shrink-0 flex-col items-start justify-center bg-zinc-950/30 p-4 md:h-full md:min-h-0 md:w-[272px] md:min-w-[272px] md:items-center md:justify-center md:p-5">
                {next.coverImageUrl ? (
                  <img
                    src={next.coverImageUrl}
                    alt=""
                    className="h-[240px] w-full max-w-[240px] rounded-xl object-cover object-top shadow-[0_8px_32px_rgba(0,0,0,0.6)] md:h-[272px] md:w-[272px] md:max-w-none md:object-contain md:object-center"
                  />
                ) : (
                  <div className="flex h-[240px] w-full max-w-[240px] items-center justify-center rounded-xl bg-zinc-800 md:h-[272px] md:w-[272px] md:max-w-none">
                    <Calendar className="h-12 w-12 text-zinc-600" aria-hidden />
                  </div>
                )}
              </div>

              <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-5 p-6 md:max-w-[480px] md:gap-6 md:p-7 md:pl-8 md:pr-8">
                <div className="flex flex-col gap-3 md:gap-4">
                  <span className="inline-flex w-fit rounded-full border border-[rgba(168,85,247,0.4)] bg-[linear-gradient(135deg,rgba(168,85,247,0.2),rgba(236,72,153,0.2))] px-3 py-1 text-xs font-medium text-purple-300">
                    {live ? "EN VIVO" : "PRÓXIMO"}
                  </span>
                  <h2 className="text-2xl font-semibold leading-tight text-white">{next.title}</h2>
                  {cal ? (
                    <div className="flex flex-wrap items-center gap-3 md:gap-4">
                      <div className="flex h-[52px] min-w-[52px] shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-800 px-3 py-2 text-center md:h-[56px] md:min-w-[56px]">
                        <div className="text-lg font-bold leading-none tabular-nums text-white">{cal.day}</div>
                        <div className="mt-0.5 text-xs uppercase tracking-wide text-orange-400">{cal.monthShort}</div>
                      </div>
                      <p className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-400 md:text-[15px]">
                        {cal.weekday} · {cal.day} · {cal.monthShort} · {cal.time}
                      </p>
                    </div>
                  ) : null}
                </div>

                {showCd ? (
                  <div className="flex w-fit max-w-full shrink-0 flex-wrap gap-3 md:gap-4">
                    {(
                      [
                        ["DÍAS", cd.days],
                        ["HRS", cd.hours],
                        ["MIN", cd.minutes],
                      ] as const
                    ).map(([label, val]) => (
                      <div
                        key={label}
                        className="flex min-h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-xl bg-zinc-800/60 px-2 py-3 text-center md:min-h-[76px] md:w-[76px]"
                      >
                        <div className={`text-2xl font-semibold tabular-nums leading-none ${cdAccent}`}>{val}</div>
                        <div className="mt-2 text-[10px] uppercase tracking-widest text-zinc-500 md:text-xs">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="min-h-0 shrink-0" aria-hidden />
                )}

                <div className="flex shrink-0 flex-col gap-3 md:gap-3.5">
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <Ticket className="h-[14px] w-[14px] shrink-0 text-zinc-500" aria-hidden />
                    <span>
                      {sold}
                      {capacity ? ` / ${capacity}` : ""} entradas
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <CircleDollarSign className="h-[14px] w-[14px] shrink-0 text-zinc-500" aria-hidden />
                    <span>{formatMoney(next.metricas?.ingresosEstimadosRD ?? 0)} recaudado</span>
                  </div>
                </div>

                <div className="shrink-0 space-y-2">
                  <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-wider text-zinc-500">
                    <span>Ocupación proyectada</span>
                    <span className="tabular-nums text-zinc-400">{fillRate}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 ease-out"
                      style={{
                        width: `${occBarW}%`,
                        transition: "width 800ms cubic-bezier(0.33, 1, 0.68, 1)",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-auto flex shrink-0 flex-wrap gap-3 pt-1 md:pt-2">
                  <motion.button
                    type="button"
                    onClick={() => onOpenArea("eventos")}
                    className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:brightness-110 active:scale-95"
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  >
                    Gestionar evento →
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => onOpenArea("ventas")}
                    className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 px-4 py-2.5 text-sm text-zinc-300 transition-all duration-150 hover:bg-zinc-700/50 active:scale-95"
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                  >
                    Ver tickets →
                  </motion.button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-10 text-center md:flex-row md:items-start md:justify-center md:py-6">
              <div className="flex h-[240px] w-full max-w-[240px] shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                <Calendar className="h-12 w-12 text-zinc-600" aria-hidden />
              </div>
              <div className="max-w-sm space-y-3">
                <p className="text-sm text-zinc-500">No hay eventos próximos. Crea uno desde Eventos.</p>
                <button
                  type="button"
                  onClick={() => onOpenArea("eventos")}
                  className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:brightness-110"
                >
                  Ir a Eventos
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <div className="flex h-full min-h-[320px] w-full min-w-0 flex-col self-stretch md:min-h-0">
          <div className="grid h-full min-h-0 flex-1 grid-cols-2 grid-rows-[repeat(3,minmax(0,1fr))] gap-[10px]">
          <KpiTile
            Icon={TrendingUp}
            iconClass="text-emerald-500"
            label="Ventas mes"
            value={<CountMoney value={revMonthNum} />}
            trend={ing?.trendText ?? "—"}
            trendClass={
              ing?.trendKind === "up"
                ? "text-emerald-500"
                : ing?.trendKind === "down"
                  ? "text-red-400"
                  : "text-zinc-500"
            }
            cta="Ver Ventas →"
            ctaClass="text-emerald-500 hover:text-emerald-400"
            onCta={() => onOpenArea("ventas")}
            delay={reduceMotion ? 0 : 0.2}
            index={0}
            reduceMotion={Boolean(reduceMotion)}
          />
          <KpiTile
            Icon={Ticket}
            iconClass="text-orange-400"
            label="Entradas"
            value={<CountInt value={entradasMonth} />}
            trend={entradasTrend.text}
            trendClass={entradasTrend.className}
            cta=""
            onCta={() => {}}
            delay={reduceMotion ? 0 : 0.2}
            index={1}
            reduceMotion={Boolean(reduceMotion)}
            hideCta
          />
          <KpiTile
            Icon={Target}
            iconClass="text-zinc-400"
            label="Ticket prom."
            value={<span className="tabular-nums">{tProm?.value ?? "—"}</span>}
            trend={tProm?.trendText ?? "—"}
            trendClass={
              tProm?.trendKind === "up"
                ? "text-emerald-500"
                : tProm?.trendKind === "down"
                  ? "text-red-400"
                  : "text-zinc-500"
            }
            cta=""
            onCta={() => {}}
            delay={reduceMotion ? 0 : 0.2}
            index={2}
            reduceMotion={Boolean(reduceMotion)}
            hideCta
          />
          <KpiTile
            Icon={BarChart3}
            iconClass="text-zinc-400"
            label="Ocupación"
            value={<CountInt value={occPct} />}
            trend={activeEv ? activeEv.title : "Sin en vivo"}
            trendClass="text-zinc-500"
            cta=""
            onCta={() => {}}
            delay={reduceMotion ? 0 : 0.2}
            index={3}
            reduceMotion={Boolean(reduceMotion)}
            suffix="%"
            hideCta
          />
          <KpiTile
            Icon={Calendar}
            iconClass="text-orange-400"
            label="Eventos publicados"
            value={<CountInt value={activeEventsCount} />}
            trend="—"
            trendClass="text-zinc-500"
            cta="Abrir →"
            ctaClass="text-orange-400 hover:text-orange-300"
            onCta={() => onOpenArea("eventos")}
            delay={reduceMotion ? 0 : 0.2}
            index={4}
            reduceMotion={Boolean(reduceMotion)}
          />
          <KpiTile
            Icon={UserPlus}
            iconClass="text-zinc-400"
            label="Nuevos clientes"
            value={<CountInt value={nuevosNum} />}
            trend={nuevos?.trendText ?? "—"}
            trendClass={
              nuevos?.trendKind === "up"
                ? "text-emerald-500"
                : nuevos?.trendKind === "down"
                  ? "text-red-400"
                  : "text-zinc-500"
            }
            cta=""
            onCta={() => {}}
            delay={reduceMotion ? 0 : 0.2}
            index={5}
            reduceMotion={Boolean(reduceMotion)}
            hideCta
          />
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: reduceMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={dSep}
        className="my-4 border-t border-zinc-800/80 lg:my-5 xl:my-6 2xl:my-7"
        aria-hidden
      />

      <div className="mb-8 md:mb-6 xl:mb-8 2xl:mb-10">
        <p className="text-xs uppercase tracking-wider text-zinc-500">Accesos rápidos</p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:mt-4 md:grid-cols-5 md:gap-4 lg:gap-5">
          {QUICK_HOME.map((a, i) => {
            const Icon = QUICK_ICON[a.id] ?? Calendar;
            const accent = QUICK_ACCENT[a.id] ?? "text-zinc-400";
            const hoverSx = QUICK_HOVER_STYLES[a.id]?.hover ?? "";
            return (
              <motion.button
                key={a.id}
                type="button"
                initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.35, delay: 0.6 + i * 0.06 }
                }
                onClick={() => onOpenArea(a.id)}
                className={`group flex min-h-[130px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-zinc-800/50 bg-zinc-900/50 px-6 py-8 text-center transition-all duration-200 ${hoverSx}`}
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              >
                <span className={`inline-flex transition-transform duration-200 group-hover:scale-110 ${accent}`}>
                  <Icon className="h-7 w-7" aria-hidden />
                </span>
                <span className="mt-4 text-sm font-medium text-white">{a.label}</span>
                <span className="mt-1 text-xs text-zinc-500">{QUICK_HINT[a.id] ?? ""}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-600 md:mt-4 md:pb-0">
        El logo <strong className="text-zinc-500">Gozalo</strong> en la barra te lleva al{" "}
        <Link href="/" className="text-zinc-400 underline hover:text-white">
          inicio público
        </Link>
        .
      </p>
    </div>
  );
}

function KpiTile({
  Icon,
  iconClass,
  label,
  value,
  trend,
  trendClass,
  cta,
  ctaClass = "text-zinc-400",
  onCta,
  delay,
  index,
  reduceMotion,
  hideCta,
  suffix,
}: {
  Icon: LucideIcon;
  iconClass: string;
  label: string;
  value: ReactNode;
  trend: string;
  trendClass: string;
  cta: string;
  ctaClass?: string;
  onCta: () => void;
  delay: number;
  index: number;
  reduceMotion: boolean;
  hideCta?: boolean;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.35, delay: delay + index * 0.08 }
      }
      className="flex h-full min-h-0 flex-col justify-between rounded-2xl border border-zinc-800/50 bg-zinc-900/50 p-4 transition-colors duration-200 hover:bg-zinc-800/50 md:p-3 lg:p-4 xl:p-5 2xl:p-6"
    >
      <div className="flex items-center gap-1.5">
        <Icon className={`h-[14px] w-[14px] shrink-0 ${iconClass}`} aria-hidden />
        <p className="text-xs uppercase tracking-wider text-zinc-400">{label}</p>
      </div>
      <div className="text-xl font-semibold tabular-nums text-white md:text-lg lg:text-xl xl:text-2xl 2xl:text-2xl">
        <span className="inline-flex items-baseline gap-0.5">
          {value}
          {suffix ? <span>{suffix}</span> : null}
        </span>
      </div>
      <div className="space-y-1">
        {trend && trendClass !== "hidden" ? (
          <p className={`text-xs ${trendClass}`}>{trend}</p>
        ) : null}
        {!hideCta && cta ? (
          <button type="button" onClick={onCta} className={`text-xs font-medium ${ctaClass}`}>
            {cta}
          </button>
        ) : null}
      </div>
    </motion.div>
  );
}
