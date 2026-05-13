"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { useStatsAnalytics30d } from "@/hooks/useStatsAnalytics";
import { formatMoney } from "@/lib/format";
import { StatsPieChart } from "./StatsPieChart";

export function ChannelsView({ onBack, venueId }: { onBack: () => void; venueId: string }) {
  const { data, isLoading } = useStatsAnalytics30d(venueId);
  const channels = useMemo(() => {
    const rc = (data as Record<string, unknown> | undefined)?.revenueChannels as
      | {
          combined?: { entradas?: { total: number }; mesas?: { total: number }; consumo?: { total: number } };
          grandCombinedRD?: number;
        }
      | undefined;
    const te = Number(rc?.combined?.entradas?.total ?? 0);
    const tm = Number(rc?.combined?.mesas?.total ?? 0);
    const tc = Number(rc?.combined?.consumo?.total ?? 0);
    const base = [
      { id: "tickets", name: "Tickets", amount: te, color: "#ec4899" },
      { id: "mesas", name: "Mesas", amount: tm, color: "#a855f7" },
    ].filter((x) => x.amount > 0);
    return {
      data: base,
      totalTicketsMesas: te + tm,
      grandTotal: te + tm + tc || Number(rc?.grandCombinedRD ?? 0),
      consumoOnly: te + tm <= 0 && tc > 0,
    };
  }, [data]);

  return (
    <div className="flex min-h-0 flex-col gap-4 pb-4">
      <button
        type="button"
        onClick={onBack}
        className="flex w-fit flex-col items-start gap-1 text-left text-sm text-white/70 transition-colors hover:text-white"
      >
        <span className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4 text-pink-500" aria-hidden />
          <span className="text-white/40">Estadísticas</span>
          <span className="text-white/25">/</span>
          <span className="font-medium text-white">Análisis de canales</span>
        </span>
        <span className="pl-6 text-xs text-white/40">
          Ingresos por canal (últimos 30 días, digital + cierres con desglose).
        </span>
      </button>

      {isLoading && !data ? (
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-sm text-white/45">Cargando canales...</p>
        </div>
      ) : channels.grandTotal <= 0 ? (
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <h3 className="font-bold text-white">Aún no hay ingresos por canal</h3>
          <p className="mt-4 text-sm text-white/40">
            En los últimos 30 días no hay pagos clasificados como entradas ni como reservas de mesa en el sistema.
          </p>
          <button
            type="button"
            className="mt-6 text-sm font-medium text-pink-500 underline-offset-4 hover:underline"
          >
            Vende tickets desde el flujo de entradas o confirma reservas de mesas; el desglose aparecerá aquí.
          </button>
        </div>
      ) : channels.consumoOnly ? (
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <h3 className="font-bold text-white">Solo hay consumo</h3>
          <p className="mt-4 text-sm text-white/40">
            Esta vista compara tickets vs mesas; hoy no hay ingresos de esos dos canales en el periodo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-pink-500">Desglose por canal</h3>
            <ul className="space-y-4">
              {channels.data.map((ch) => {
                const pct = channels.totalTicketsMesas > 0 ? (ch.amount / channels.totalTicketsMesas) * 100 : 0;
                return (
                  <li key={ch.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-white/80">{ch.name}</span>
                      <span className="tabular-nums text-white/60">
                        {Math.round(pct)}% · {formatMoney(ch.amount)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.85, ease: "easeOut" }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-pink-500">
              Distribución
            </h3>
            <StatsPieChart data={channels.data.map((c) => ({ name: c.name, value: c.amount, color: c.color }))} height={280} />
          </div>
        </div>
      )}
    </div>
  );
}
