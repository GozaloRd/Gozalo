"use client";

import type { DashboardOrdersSummary } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";
import { LiveIndicator } from "@/components/dashboard/panels/orders-flow/LiveIndicator";

export function OrdersGlobalSummary({
  summary,
  loading,
  live,
}: {
  summary: DashboardOrdersSummary | null;
  loading: boolean;
  live: boolean;
}) {
  if (loading && !summary) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-zinc-950/60 px-3 py-3 text-sm text-slate-500">
        Cargando resumen…
      </div>
    );
  }
  if (!summary) return null;

  const ok = summary.completedCount;
  const pend = summary.pendingCount;
  const bad = Math.max(0, summary.totalOrders - ok - pend - summary.refundedCount);

  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] bg-zinc-950/60 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white/90">
          <span className="tabular-nums">{summary.totalOrders}</span> órdenes ·{" "}
          <span className="tabular-nums text-emerald-300">{formatMoney(summary.revenueCollected)}</span> recaudado ·{" "}
          <span className="tabular-nums text-amber-300">{summary.pendingCount}</span> pendientes
        </p>
        <LiveIndicator active={live} />
      </div>
      <p className="text-xs text-slate-400">
        🎯 Ticket promedio:{" "}
        <span className="font-semibold tabular-nums text-emerald-300">{formatMoney(summary.avgTicket)}</span>
      </p>
      <p className="text-[11px] text-slate-500">
        <span className="text-emerald-400">✅ {ok}</span>
        {" · "}
        <span className="text-amber-400">⏳ {pend}</span>
        {" · "}
        <span className="text-red-400">❌ {bad}</span>
        {summary.refundedCount > 0 ? (
          <>
            {" · "}
            <span className="text-purple-400">↩️ {summary.refundedCount}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
