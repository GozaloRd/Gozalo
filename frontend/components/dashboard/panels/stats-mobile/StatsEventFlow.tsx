"use client";

import { useEffect, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { useEventStatsDetailBundle } from "@/hooks/useStatsAnalytics";
import { fetchDashboardEvents } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";
import useSWR from "swr";
import { StatsEventCirclePicker } from "@/components/dashboard/panels/stats-mobile/StatsEventCirclePicker";
import { StatsSubHeader } from "@/components/dashboard/panels/stats-mobile/StatsSubHeader";
import { StatsEmptyState } from "@/components/dashboard/panels/stats-mobile/StatsEmptyState";

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-DO", { day: "numeric", month: "short" });
}

function publishedEvents(rows: UpcomingEventModel[]) {
  return rows.filter((e) => e.status === "published" || (e as { publicado?: boolean }).publicado === true);
}

function nearestUpcomingId(events: UpcomingEventModel[], nowMs: number) {
  const future = events
    .map((e) => ({ e, t: new Date(e.startAt).getTime() }))
    .filter(({ t }) => t >= nowMs)
    .sort((a, b) => a.t - b.t);
  return future[0]?.e.id ?? null;
}

function Kpi({ label, a, b }: { label: string; a: string; b?: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-white">{a}</p>
      {b ? <p className="mt-0.5 text-[10px] text-zinc-500">{b}</p> : null}
    </div>
  );
}

function EventDetailBody({ venueId, event }: { venueId: string; event: UpcomingEventModel }) {
  const { data, isLoading } = useEventStatsDetailBundle(venueId, event.id);
  const ana = data?.analytics ?? null;
  const summary = ana?.summary as
    | {
        tickets?: { total?: number; orders?: number };
        reservations?: { total?: number };
        revenue?: { total?: number };
        occupancyCurrent?: {
          percentage?: number;
          maxCapacity?: number;
          currentAttendees?: number;
        };
      }
    | undefined;
  const charts = ana?.charts as { salesByDay?: { day: string; total: number }[] } | undefined;
  const salesByDay = charts?.salesByDay ?? [];
  const rc = ana?.revenueChannels as
    | {
        combined?: { entradas?: { total: number }; mesas?: { total: number }; consumo?: { total: number } };
      }
    | undefined;
  const ins = ana?.eventInsights as
    | {
        peakHourLabel?: string | null;
        topTicketType?: string | null;
        noShowPct?: number | null;
        validatedCount?: number;
      }
    | undefined;
  const tables = ana?.tables as
    | { occupancyByEvent?: { eventId: string; attended: number; capacity: number; occupancyRate: number }[] }
    | undefined;
  const occRows = tables?.occupancyByEvent;
  const occRow = occRows?.find((r) => String(r.eventId) === String(event.id));

  const tr = data?.tickets as { data?: { name?: string; soldCount?: number }[]; items?: { name?: string; soldCount?: number }[] };
  const rows = tr?.data ?? tr?.items ?? [];
  let topName = "";
  let topN = -1;
  for (const r of rows) {
    const n = Number(r.soldCount ?? 0);
    if (n > topN) {
      topN = n;
      topName = String(r.name ?? "");
    }
  }

  const ticketsSold = Number(summary?.tickets?.total ?? 0);
  const ticketOrders = Number(summary?.tickets?.orders ?? ticketsSold);
  const tablesReserved = Number(summary?.reservations?.total ?? 0);
  const cap = Number(occRow?.capacity ?? event.maxCapacity ?? 0);
  const revenue = Number(summary?.revenue?.total ?? 0);
  const occPct = Number(occRow?.occupancyRate ?? summary?.occupancyCurrent?.percentage ?? 0);
  const attended = Number(occRow?.attended ?? ticketsSold);
  const ratioSold = cap > 0 ? Math.min(100, Math.round((ticketsSold / cap) * 100)) : 0;
  const peakLabel = ins?.peakHourLabel ?? null;
  const tipoTop = ins?.topTicketType || (topN > 0 ? topName : "");

  const bestDay = useMemo(() => {
    if (!salesByDay.length) return null;
    return salesByDay.reduce((a, b) => (a.total >= b.total ? a : b));
  }, [salesByDay]);

  const lineData = useMemo(
    () =>
      salesByDay.map((d, i) => ({
        i: i + 1,
        t: String(d.day).slice(5),
        v: d.total,
      })),
    [salesByDay]
  );

  const mix = rc?.combined;
  const te = Number(mix?.entradas?.total ?? 0);
  const tm = Number(mix?.mesas?.total ?? 0);
  const mixDenom = te + tm;
  const avgTicket = ticketsSold > 0 && te > 0 ? te / ticketsSold : 0;

  if (isLoading && !data) {
    return <p className="text-sm text-zinc-500">Cargando métricas…</p>;
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Ingresos" a={formatMoney(revenue)} b={ratioSold ? `${ratioSold}% vs aforo (vend.)` : undefined} />
        <Kpi
          label="Tickets / mesas"
          a={`${ticketsSold} tickets · ${tablesReserved} mesas`}
          b={`${ticketOrders} compra${ticketOrders === 1 ? "" : "s"} de tickets${cap ? ` · ${attended}/${cap} asignación total${occPct ? ` · ${Math.round(occPct)}%` : ""}` : ""}`}
        />
        <Kpi
          label="Ticket prom."
          a={avgTicket > 0 ? formatMoney(avgTicket) : "Sin ventas"}
          b={avgTicket > 0 ? "Solo tickets, no incluye mesas" : "Vende tickets de este evento para calcular el promedio."}
        />
        <Kpi
          label="Pico de ventas (hora)"
          a={peakLabel ?? (bestDay ? `Día ${bestDay.day.slice(5)}` : "Sin datos")}
          b={
            peakLabel
              ? "Según pagos vinculados a órdenes del evento"
              : bestDay
                ? `Máx. ${formatMoney(bestDay.total)}`
                : "Registra pagos con hora en el período o revisa fechas del informe."
          }
        />
        <Kpi
          label="Tipo de entrada top"
          a={tipoTop || "Ninguna aún"}
          b={
            !tipoTop
              ? "Configura tipos de entrada y vende para ver cuál lidera."
              : ins?.topTicketType
                ? "Del catálogo"
                : topN > 0
                  ? `${topN} u.`
                  : undefined
          }
        />
        {ins?.noShowPct != null && ins?.validatedCount != null ? (
          <Kpi
            label="No-show (estim.)"
            a={`${ins.noShowPct}%`}
            b={`${ins.validatedCount} validaciones · entradas pagadas vs accesos`}
          />
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-pink-400">Velocidad de ventas (día a día)</p>
        <p className="mb-2 text-[10px] text-zinc-500">
          Ingresos diarios atribuidos a este evento (pagos + cierres + cobros sin fila payment en ese día).
        </p>
        <div className="h-36 w-full">
          {lineData.length === 0 ? (
            <p className="flex min-h-[140px] flex-col items-center justify-center gap-1 px-3 text-center text-xs text-zinc-400">
              <span>Aún no hay ventas por día en este período.</span>
              <span className="text-[11px] text-zinc-600">Publica y vende entradas; el gráfico se rellenará con los pagos reales.</span>
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="t" tick={{ fill: "#71717a", fontSize: 9 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Line type="monotone" dataKey="v" stroke="#EC4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-pink-400">Mix de ingresos (período)</p>
        {mixDenom <= 0 ? (
          <p className="mt-2 text-xs text-zinc-500">Sin ingresos clasificados como tickets o mesas en este período.</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm text-zinc-200">
            <li className="flex justify-between gap-2">
              <span>🎟️ Tickets</span>
              <span className="tabular-nums text-pink-300">{Math.round((te / mixDenom) * 100)}%</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>🪑 Mesas</span>
              <span className="tabular-nums text-pink-300">{Math.round((tm / mixDenom) * 100)}%</span>
            </li>
          </ul>
        )}
      </div>

    </div>
  );
}

export function StatsEventFlow({
  venueId,
  nowMs,
  onBackToPanel,
}: {
  venueId: string;
  nowMs: number;
  onBackToPanel: () => void;
}) {
  const [phase, setPhase] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<UpcomingEventModel | null>(null);

  const { data: evRes, isLoading } = useSWR(
    venueId ? ["stats-events-all", venueId] : null,
    () => fetchDashboardEvents("all", venueId),
    { revalidateOnFocus: false }
  );

  const events = useMemo(() => {
    const list = ((evRes as { data?: UpcomingEventModel[] })?.data ?? []).filter((e) => e.status !== "cancelled");
    return publishedEvents(list);
  }, [evRes]);

  const nearestId = useMemo(() => nearestUpcomingId(events, nowMs), [events, nowMs]);

  useEffect(() => {
    setPhase("list");
    setSelected(null);
  }, [venueId]);

  if (phase === "detail" && selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <button
            type="button"
            onClick={() => {
              setPhase("list");
              setSelected(null);
            }}
            className="shrink-0 rounded-lg p-2 text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Volver a eventos"
          >
            <span className="text-lg">←</span>
          </button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
            {selected.title} · {shortDate(selected.startAt)}
          </h2>
        </div>
        <EventDetailBody venueId={venueId} event={selected} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <StatsSubHeader title="Estadísticas por evento" onBack={onBackToPanel} />
      {isLoading && !evRes ? (
        <p className="text-sm text-zinc-500">Cargando eventos…</p>
      ) : events.length === 0 ? (
        <StatsEmptyState
          title="No hay eventos publicados"
          reason="Solo mostramos métricas de eventos en estado publicado (no borradores ni cancelados)."
          action="Publica un evento desde el panel; luego podrás abrir su detalle de estadísticas aquí."
        />
      ) : (
        <StatsEventCirclePicker
          events={events}
          nearestEventId={nearestId}
          onSelect={(ev) => {
            setSelected(ev);
            setPhase("detail");
          }}
        />
      )}
    </div>
  );
}
