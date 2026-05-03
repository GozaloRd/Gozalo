"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { AlertTriangle, Archive, Calculator, CreditCard, Lock, Wallet } from "lucide-react";
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import { PanelFooterLinks } from "@/components/dashboard/panels/PanelFooterLinks";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchCashClosings } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

type ClosingRow = {
  id: string;
  createdAt?: string;
  grandTotal?: string | number;
  cashTotal?: string | number;
  cardTotal?: string | number;
  transferTotal?: string | number;
  metadata?: { breakdown?: unknown } | null;
};

type Breakdown = {
  entradas: { cash: number; card: number; transfer: number; other?: number };
  mesas: { cash: number; card: number; transfer: number; other?: number };
  consumo: { cash: number; card: number; transfer: number; other?: number };
};

function channelTotal(b: Breakdown, key: keyof Breakdown) {
  const x = b[key];
  return x.cash + x.card + x.transfer + (x.other ?? 0);
}

export function CashRegisterPanel({
  area,
  opsAlertCount,
}: {
  area: QuickAreaConfig;
  opsAlertCount: number;
}) {
  const { venueId } = useDashboard();
  const [closings, setClosings] = useState<ClosingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const cc = await fetchCashClosings(venueId);
      const rows = (cc as { data?: ClosingRow[] })?.data ?? [];
      setClosings(rows);
    } catch {
      setClosings([]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    let sumCash = 0;
    let sumCard = 0;
    let sumTransfer = 0;
    let histEntradas = 0;
    let histMesas = 0;
    let histConsumo = 0;
    for (const r of closings) {
      sumCash += Number(r.cashTotal ?? 0);
      sumCard += Number(r.cardTotal ?? 0);
      sumTransfer += Number(r.transferTotal ?? 0);
      const b = r.metadata?.breakdown as Breakdown | undefined;
      if (b) {
        histEntradas += channelTotal(b, "entradas");
        histMesas += channelTotal(b, "mesas");
        histConsumo += channelTotal(b, "consumo");
      }
    }
    return {
      cash: sumCash,
      card: sumCard,
      transfer: sumTransfer,
      total: sumCash + sumCard + sumTransfer,
      byChannel: { entradas: histEntradas, mesas: histMesas, consumo: histConsumo },
    };
  }, [closings]);

  const recent = closings.slice(0, 8);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Resumen desde reportes guardados. Para registrar un turno nuevo usa la vista completa.
      </p>

      <div className="flex flex-col gap-3">
        <SummaryCard
          label="Histórico efectivo"
          value={loading ? "…" : formatMoney(stats.cash)}
          Icon={Wallet}
        />
        <SummaryCard
          label="Histórico tarjeta"
          value={loading ? "…" : formatMoney(stats.card)}
          Icon={CreditCard}
        />
        <SummaryCard
          label="Histórico transferencia"
          value={loading ? "…" : formatMoney(stats.transfer)}
          Icon={CreditCard}
        />
        <SummaryCard
          label="Total reportado (caja)"
          value={loading ? "…" : formatMoney(stats.total)}
          Icon={Calculator}
          accent
        />
      </div>

      {(stats.byChannel.entradas > 0 || stats.byChannel.mesas > 0 || stats.byChannel.consumo > 0) && (
        <div className="space-y-2 rounded-xl border border-white/[0.08] bg-zinc-950/50 p-3">
          <p className="text-[11px] font-medium uppercase text-slate-500">Desglose acumulado</p>
          <div className="flex justify-between text-sm text-white/90">
            <span>Entradas</span>
            <span className="tabular-nums">{formatMoney(stats.byChannel.entradas)}</span>
          </div>
          <div className="flex justify-between text-sm text-white/90">
            <span>Mesas / reservas</span>
            <span className="tabular-nums">{formatMoney(stats.byChannel.mesas)}</span>
          </div>
          <div className="flex justify-between text-sm text-white/90">
            <span>Consumo / bar</span>
            <span className="tabular-nums">{formatMoney(stats.byChannel.consumo)}</span>
          </div>
        </div>
      )}

      <Link
        href="/dashboard/caja"
        className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-600 px-4 py-3 text-sm font-bold text-white shadow-lg"
      >
        Nuevo reporte, cierre y arqueo (completo)
      </Link>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase text-slate-500">Historial reciente</p>
        <ul className="space-y-2">
          {recent.length === 0 && !loading ? (
            <li className="text-xs text-slate-500">Aún no hay cierres registrados.</li>
          ) : null}
          {recent.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2"
            >
              <span className="min-w-0 truncate text-xs text-slate-400">
                {r.createdAt
                  ? new Date(r.createdAt).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-white">
                {formatMoney(Number(r.grandTotal ?? 0))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/caja"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-white"
        >
          <Lock className="h-3.5 w-3.5" aria-hidden />
          Cierre de turno
        </Link>
        <Link
          href="/dashboard/caja"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-white"
        >
          <Archive className="h-3.5 w-3.5" aria-hidden />
          Arqueo
        </Link>
        <Link
          href="/dashboard/caja"
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-amber-200"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          Alertas de caja
        </Link>
      </div>

      <PanelFooterLinks area={area} items={area.items} opsAlertCount={opsAlertCount} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  Icon,
  accent,
}: {
  label: string;
  value: string;
  Icon: ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] px-4 py-4 backdrop-blur-sm ${
        accent ? "bg-purple-500/10" : "bg-zinc-900/85"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`mt-2 text-xl font-semibold tabular-nums ${accent ? "text-fuchsia-200" : "text-white"}`}>
            {value}
          </p>
        </div>
        <Icon className={`h-6 w-6 shrink-0 ${accent ? "text-fuchsia-400" : "text-purple-400/80"}`} aria-hidden />
      </div>
    </div>
  );
}
