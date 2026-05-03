"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  CreditCard,
  FileSpreadsheet,
  Receipt,
  ShoppingBag,
  Ticket,
  TrendingUp,
  Undo2,
} from "lucide-react";
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import { MobileCard } from "@/components/dashboard/mobile/shared/MobileCard";
import { PanelFooterLinks } from "@/components/dashboard/panels/PanelFooterLinks";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { formatMoney } from "@/lib/format";

export function SalesPanel({
  area,
  stats,
  analytics,
  opsAlertCount,
}: {
  area: QuickAreaConfig;
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
  opsAlertCount: number;
}) {
  const isMobile = useIsMobile();
  const resv = stats?.reservations;
  const today = stats?.revenue?.totalRD?.today ?? 0;
  const week = stats?.revenue?.totalRD?.week ?? 0;
  const month = stats?.revenue?.totalRD?.month ?? 0;

  const chartEv = analytics?.charts?.revenueByEvent ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { k: "Hoy", v: today },
          { k: "Semana", v: week },
          { k: "Mes", v: month },
        ].map((x) => (
          <div
            key={x.k}
            className="rounded-xl border border-white/[0.08] bg-zinc-950/60 px-2 py-3 text-center"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{x.k}</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-white">{formatMoney(x.v)}</p>
          </div>
        ))}
      </div>

      <MobileCard variant="inner" area="ventas">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
          <TrendingUp className="h-4 w-4" aria-hidden />
          Ventas por evento
        </h3>
        <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto">
          {chartEv.length === 0 ? (
            <li className="text-xs text-slate-500">Sin datos de período reciente.</li>
          ) : (
            chartEv.slice(0, 6).map((r) => (
              <li
                key={r.eventId}
                className="flex items-center justify-between gap-2 text-sm text-white/90"
              >
                <span className="min-w-0 truncate">{r.eventTitle}</span>
                <span className="shrink-0 tabular-nums text-emerald-300">{formatMoney(r.total)}</span>
              </li>
            ))
          )}
        </ul>
      </MobileCard>

      <div className="space-y-2">
        <SalesRow
          Icon={Ticket}
          label="Tickets"
          hint={analytics?.summary?.tickets ? `${analytics.summary.tickets.today} hoy` : undefined}
        />
        <SalesRow
          Icon={Receipt}
          label="Mesas / reservas"
          hint={resv != null ? `Índice período: ${resv.today} hoy` : undefined}
        />
        <SalesRow Icon={ShoppingBag} label="Bar / consumo" hint="Consolidado en reportes" />
        <SalesRow
          Icon={CreditCard}
          label="Órdenes recientes"
          href="/dashboard/reportes"
          externalNewTab={isMobile}
        />
        <SalesRow
          Icon={Undo2}
          label="Reembolsos y cancelaciones"
          href="/dashboard/reportes"
          externalNewTab={isMobile}
        />
        <SalesRow
          Icon={FileSpreadsheet}
          label="Exportar (PDF / Excel)"
          href="/dashboard/reportes"
          externalNewTab={isMobile}
        />
      </div>

      <PanelFooterLinks area={area} items={area.items} opsAlertCount={opsAlertCount} />
    </div>
  );
}

function SalesRow({
  Icon,
  label,
  hint,
  href,
  externalNewTab,
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  href?: string;
  externalNewTab?: boolean;
}) {
  const inner = (
    <div className="flex min-h-[44px] items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      </div>
      <ArrowDownRight className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
    </div>
  );
  if (href) {
    return (
      <Link
        href={href}
        target={externalNewTab ? "_blank" : undefined}
        rel={externalNewTab ? "noopener noreferrer" : undefined}
        className="block transition active:scale-[0.99] hover:bg-emerald-500/5"
      >
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}
