"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { useEventStatsDetailBundle } from "@/hooks/useStatsAnalytics";
import { formatMoney } from "@/lib/format";
import type { EventSelectorItem } from "./types";
import { buildStatsEventSelectorRows } from "./buildStatsEventSelectorRows";
import { StatsLineChart } from "./StatsLineChart";
import { StatsPieChart } from "./StatsPieChart";

type SlideDir = "forward" | "back";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const slideTransition = { duration: 0.45, ease };

const slideVariants = {
  initial: (dir: SlideDir) => ({ x: dir === "forward" ? "100%" : "-100%", opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir: SlideDir) => ({ x: dir === "forward" ? "-100%" : "100%", opacity: 0 }),
};

function ticketLine(ev: EventSelectorItem): string {
  if (ev.total > 0) return `${ev.sold}/${ev.total} tickets`;
  if (ev.sold > 0) return `${ev.sold} tickets`;
  return "Sin ventas aún";
}

function EventAvatarSmall({ url, name }: { url?: string; name: string }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(url?.trim()) && !broken;

  return (
    <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-pink-500/30 to-purple-600/20">
      {showImg ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-lg font-bold text-white/90">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function EventStatsView({
  onBack,
  allVenueEvents,
  eventsLoading,
  venueId,
}: {
  onBack: () => void;
  allVenueEvents: UpcomingEventModel[];
  eventsLoading: boolean;
  venueId: string;
}) {
  const [step, setStep] = useState<"selector" | "detail">("selector");
  const [selected, setSelected] = useState<EventSelectorItem | null>(null);
  const [dir, setDir] = useState<SlideDir>("forward");
  const [slideOn, setSlideOn] = useState(false);

  const selectorRows = useMemo(() => buildStatsEventSelectorRows(allVenueEvents), [allVenueEvents]);
  const selectedEvent = useMemo(
    () => allVenueEvents.find((ev) => ev.id === selected?.id) ?? null,
    [allVenueEvents, selected?.id]
  );
  const { data: detailBundle, isLoading: detailLoading } = useEventStatsDetailBundle(
    venueId || null,
    selectedEvent?.id ?? null
  );

  const detail = useMemo(() => {
    if (!selectedEvent) return null;
    const ana = detailBundle?.analytics as
      | {
          summary?: {
            tickets?: { total?: number; orders?: number };
            reservations?: { total?: number };
            revenue?: { total?: number };
            occupancyCurrent?: { percentage?: number };
          };
          charts?: { salesByDay?: { day: string; total: number }[] };
          revenueChannels?: { combined?: { entradas?: { total?: number }; mesas?: { total?: number } } };
          eventInsights?: {
            peakHourLabel?: string | null;
            topTicketType?: string | null;
            noShowPct?: number | null;
            validatedCount?: number;
          } | null;
          tables?: {
            occupancyByEvent?: { eventId: string; attended: number; capacity: number; occupancyRate: number }[];
          };
        }
      | undefined;
    const ticketsApi = detailBundle?.tickets as
      | { data?: { name?: string; soldCount?: number }[]; items?: { name?: string; soldCount?: number }[] }
      | undefined;
    const salesByDay = ana?.charts?.salesByDay ?? [];
    const occRow = ana?.tables?.occupancyByEvent?.find((x) => String(x.eventId) === String(selectedEvent.id));
    const sold = Number(ana?.summary?.tickets?.total ?? selectedEvent.metricas?.ticketsVendidos ?? 0);
    const ticketOrders = Number(ana?.summary?.tickets?.orders ?? sold);
    const tablesReserved = Number(ana?.summary?.reservations?.total ?? 0);
    const revenue = Number(ana?.summary?.revenue?.total ?? selectedEvent.metricas?.ingresosEstimadosRD ?? 0);
    const capacity = Number(occRow?.capacity ?? selectedEvent.maxCapacity ?? 0);
    const attended = Number(occRow?.attended ?? sold);
    const occupancyPct = Number(occRow?.occupancyRate ?? ana?.summary?.occupancyCurrent?.percentage ?? 0);
    const ratioSold = capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;
    const bestDay =
      salesByDay.length > 0 ? salesByDay.reduce((a, b) => (Number(a.total) >= Number(b.total) ? a : b)) : null;
    const lineData = salesByDay.map((d) => ({ label: String(d.day).slice(5), value: Number(d.total ?? 0) }));
    const te = Number(ana?.revenueChannels?.combined?.entradas?.total ?? 0);
    const tm = Number(ana?.revenueChannels?.combined?.mesas?.total ?? 0);
    const avgTicket = sold > 0 && te > 0 ? te / sold : 0;
    const mixData = [
      { name: "Tickets", value: te, color: "#ec4899" },
      { name: "Mesas", value: tm, color: "#a855f7" },
    ].filter((x) => x.value > 0);
    const ticketRows = ticketsApi?.data ?? ticketsApi?.items ?? [];
    let topName = "";
    let topCount = 0;
    for (const row of ticketRows) {
      const count = Number(row.soldCount ?? 0);
      if (count > topCount) {
        topCount = count;
        topName = String(row.name ?? "");
      }
    }
    const topTicket = ana?.eventInsights?.topTicketType || topName;
    return {
      sold,
      ticketOrders,
      tablesReserved,
      revenue,
      capacity,
      attended,
      occupancyPct,
      avgTicket,
      ratioSold,
      peakLabel: ana?.eventInsights?.peakHourLabel ?? null,
      bestDay,
      topTicket,
      topCount,
      noShowPct: ana?.eventInsights?.noShowPct ?? null,
      validatedCount: ana?.eventInsights?.validatedCount ?? null,
      lineData,
      mixData,
    };
  }, [detailBundle, selectedEvent]);

  const openDetail = (ev: EventSelectorItem) => {
    setSlideOn(true);
    setDir("forward");
    setSelected(ev);
    setStep("detail");
  };

  const closeDetail = () => {
    setSlideOn(true);
    setDir("back");
    setStep("selector");
    setSelected(null);
  };

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-4">
      <AnimatePresence mode="wait" custom={dir}>
        {step === "selector" ? (
          <motion.div
            key="selector"
            custom={dir}
            variants={slideVariants}
            initial={slideOn ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="space-y-4"
          >
            <button
              type="button"
              onClick={onBack}
              className="flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 text-pink-500" aria-hidden />
              <span className="text-white/40">Estadísticas</span>
              <span className="text-white/25">/</span>
              <span className="font-medium text-white">Estadísticas por evento</span>
            </button>

            {eventsLoading && selectorRows.length === 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="h-20 w-20 shrink-0 rounded-full bg-white/10" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-40 rounded bg-white/10" />
                      <div className="h-3 w-24 rounded bg-white/10" />
                      <div className="h-3 w-32 rounded bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : selectorRows.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-white/45">
                No hay eventos en este local (o aún no se han cargado). Publica un evento o revisa tu conexión.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {selectorRows.map((ev) => (
                  <motion.button
                    key={ev.id}
                    type="button"
                    layout
                    onClick={() => openDetail(ev)}
                    whileHover={{ scale: 1.03, borderColor: "rgba(236,72,153,0.4)" }}
                    whileTap={{ scale: 0.97, opacity: 0.9 }}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors"
                  >
                    <EventAvatarSmall url={ev.imageUrl} name={ev.name} />
                    <div className="min-w-0">
                      <p className="font-bold text-white">{ev.name}</p>
                      <p className="mt-1 text-sm text-white/40">{ev.dateLabel}</p>
                      <p className="mt-1 text-xs text-white/30">{ticketLine(ev)}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        ) : selected ? (
          <motion.div
            key="detail"
            custom={dir}
            variants={slideVariants}
            initial={slideOn ? "initial" : false}
            animate="animate"
            exit="exit"
            transition={slideTransition}
            className="space-y-6"
          >
            <button
              type="button"
              onClick={closeDetail}
              className="flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 text-pink-500" aria-hidden />
              <span className="font-medium text-white">{selected.name}</span>
              <span className="text-white/25">·</span>
              <span className="text-white/50">{selected.dateLabel}</span>
            </button>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {detailLoading && !detail ? (
                <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/50">
                  Cargando métricas del evento...
                </div>
              ) : detail ? (
                <>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Ingresos</p>
                    <p className="mt-3 text-xl font-bold text-white">{formatMoney(detail.revenue)}</p>
                    <p className="mt-2 text-xs text-white/40">
                      {detail.ratioSold > 0 ? `${detail.ratioSold}% vs aforo (vend.)` : "Sin referencia de aforo"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Tickets / mesas</p>
                    <p className="mt-3 text-xl font-bold text-white">{detail.sold} tickets · {detail.tablesReserved} mesas</p>
                    <p className="mt-2 text-xs text-white/40">
                      {detail.capacity > 0
                        ? `${detail.ticketOrders} compra${detail.ticketOrders === 1 ? "" : "s"} de tickets · ${detail.attended}/${detail.capacity} asignación total${
                            detail.occupancyPct > 0 ? ` · ${Math.round(detail.occupancyPct)}%` : ""
                          }`
                        : `${detail.ticketOrders} compra${detail.ticketOrders === 1 ? "" : "s"} de tickets · ${detail.tablesReserved} mesas`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Ticket prom.</p>
                    <p className="mt-3 text-xl font-bold text-white">
                      {detail.avgTicket > 0 ? formatMoney(detail.avgTicket) : "Sin ventas"}
                    </p>
                    {detail.avgTicket > 0 ? (
                      <p className="mt-2 text-xs text-white/40">Solo tickets, no incluye mesas</p>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Pico de ventas</p>
                    <p className="mt-3 text-xl font-bold text-white">
                      {detail.peakLabel ?? (detail.bestDay ? `Día ${detail.bestDay.day.slice(5)}` : "Sin datos")}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      {detail.peakLabel
                        ? "Según pagos vinculados a órdenes del evento"
                        : detail.bestDay
                          ? `Máx. ${formatMoney(detail.bestDay.total)}`
                          : "Sin ventas en el período"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Tipo de entrada top</p>
                    <p className="mt-3 text-xl font-bold text-white">{detail.topTicket || "Ninguna aún"}</p>
                    {detail.topCount > 0 ? <p className="mt-2 text-xs text-white/40">{detail.topCount} vendidas</p> : null}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">No-show (estim.)</p>
                    <p className="mt-3 text-xl font-bold text-white">
                      {detail.noShowPct != null ? `${detail.noShowPct}%` : "Sin datos"}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      {detail.validatedCount != null
                        ? `${detail.validatedCount} validaciones · entradas pagadas vs accesos`
                        : "Aún no hay validaciones suficientes para estimarlo"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-full rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/50">
                  No se pudo cargar el detalle del evento.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-pink-500">
                Velocidad de ventas (día a día)
              </h3>
              <p className="mt-1 text-xs text-white/40">Ingresos diarios atribuidos a este evento</p>
              <div className="mt-4">
                {detail && detail.lineData.length > 0 ? (
                  <StatsLineChart data={detail.lineData} showArea height={280} />
                ) : (
                  <p className="py-8 text-center text-sm text-white/40">Sin ventas diarias para este evento.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-pink-500">
                Mix de ingresos (período)
              </h3>
              {!detail || detail.mixData.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/40">
                  Sin ingresos clasificados como tickets o mesas en este período.
                </p>
              ) : (
                <StatsPieChart data={detail.mixData} />
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
