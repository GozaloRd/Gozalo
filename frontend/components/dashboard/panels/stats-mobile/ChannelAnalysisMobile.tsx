"use client";

import { useMemo } from "react";
import { useStatsAnalytics30d } from "@/hooks/useStatsAnalytics";
import { formatMoney } from "@/lib/format";
import { StatsSubHeader } from "@/components/dashboard/panels/stats-mobile/StatsSubHeader";
import { StatsEmptyState } from "@/components/dashboard/panels/stats-mobile/StatsEmptyState";

export function ChannelAnalysisMobile({ venueId, onBack }: { venueId: string; onBack: () => void }) {
  const { data, isLoading } = useStatsAnalytics30d(venueId);

  const channels = useMemo(() => {
    const rc = (data as Record<string, unknown> | undefined)?.revenueChannels as
      | {
          combined?: { entradas?: { total: number }; mesas?: { total: number }; consumo?: { total: number } };
          grandCombinedRD?: number;
        }
      | undefined;
    const c = rc?.combined;
    const te = Number(c?.entradas?.total ?? 0);
    const tm = Number(c?.mesas?.total ?? 0);
    const tc = Number(c?.consumo?.total ?? 0);
    /** Solo tickets + mesas (bar/consumo no se muestra en esta vista). */
    const denom = te + tm;
    const grand = te + tm + tc || Number(rc?.grandCombinedRD ?? 0);
    return {
      tickets: { rd: te, pct: denom > 0 ? Math.round((te / denom) * 100) : 0 },
      mesas: { rd: tm, pct: denom > 0 ? Math.round((tm / denom) * 100) : 0 },
      denom,
      consumoOnly: denom <= 0 && tc > 0,
      grand,
    };
  }, [data]);

  const topVipInsight =
    channels.mesas.pct >= 40
      ? "Las mesas representan una parte relevante del ingreso. Revisa zonas VIP y precios."
      : channels.tickets.pct >= 50
        ? "El canal entradas domina; prueba bundles con mesas para subir ticket medio."
        : "Compara tickets vs mesas y ajusta promos según el canal más rentable.";

  return (
    <div className="space-y-4">
      <StatsSubHeader title="Análisis de canales" onBack={onBack} />
      <p className="text-xs text-zinc-500">Ingresos por canal (últimos 30 días, digital + cierres con desglose).</p>

      {isLoading && !data ? (
        <p className="text-sm text-zinc-500">Cargando…</p>
      ) : channels.grand <= 0 ? (
        <StatsEmptyState
          title="Aún no hay ingresos por canal"
          reason="En los últimos 30 días no hay pagos clasificados como entradas ni como reservas de mesa en el sistema."
          action="Vende tickets desde el flujo de entradas o confirma reservas de mesas; el desglose aparecerá aquí."
        />
      ) : channels.consumoOnly ? (
        <StatsEmptyState
          title="Solo hay consumo en bar (sin tickets ni mesas)"
          reason="Esta vista compara tickets frente a mesas; el dinero que ves en Ventas puede estar solo en consumo."
          action="Añade ventas de entradas o reservas para ver el mix tickets vs mesas."
        />
      ) : (
        <>
          <div className="space-y-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-sm font-medium text-white">🎟️ Tickets</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-pink-500 transition-all" style={{ width: `${channels.tickets.pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                {channels.tickets.pct}% · <span className="tabular-nums text-pink-300">{formatMoney(channels.tickets.rd)}</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">Ventas vía entradas / órdenes tipo tickets.</p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-sm font-medium text-white">🪑 Mesas</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-fuchsia-500 transition-all" style={{ width: `${channels.mesas.pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                {channels.mesas.pct}% · <span className="tabular-nums text-fuchsia-300">{formatMoney(channels.mesas.rd)}</span>
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">Pagos ligados a reservas.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-pink-300">💡 Insight</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-200">{topVipInsight}</p>
          </div>
        </>
      )}
    </div>
  );
}
