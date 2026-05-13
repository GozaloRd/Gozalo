"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, CreditCard, FileText, Receipt, Wallet } from "lucide-react";
import { MobilePanelRow } from "@/components/dashboard/mobile/shared/MobilePanelRow";
import { CashNewReportFlow } from "@/components/dashboard/panels/cash-flow/CashNewReportFlow";
import {
  CashReportHistoryFlow,
  type CashClosingRow,
} from "@/components/dashboard/panels/cash-flow/CashReportHistoryFlow";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchCashClosings } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

const fadeSlide = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] as const } },
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

type CajaView = "main" | "newReport" | "history";

export function CashRegisterPanel({
  onRegisterCajaCloseGuard,
}: {
  onRegisterCajaCloseGuard?: (fn: (() => boolean) | null) => void;
} = {}) {
  const { venueId } = useDashboard();
  const [view, setView] = useState<CajaView>("main");
  const [closings, setClosings] = useState<CashClosingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const cc = await fetchCashClosings(venueId);
      const rows = (cc as { data?: CashClosingRow[] })?.data ?? [];
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

  useEffect(() => {
    if (!onRegisterCajaCloseGuard) return;
    const fn = () => {
      if (view !== "main") {
        setView("main");
        return true;
      }
      return false;
    };
    onRegisterCajaCloseGuard(fn);
    return () => onRegisterCajaCloseGuard(null);
  }, [onRegisterCajaCloseGuard, view]);

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

  const historyHint =
    closings.length === 0 && !loading
      ? "Sin reportes aún"
      : loading
        ? "Cargando…"
        : `${closings.length} reporte${closings.length === 1 ? "" : "s"}`;

  const mainBody = (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">
        Resumen desde reportes guardados. Registra ingresos fuera de la web para que cuadren con estadísticas.
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

      {venueId ? (
        <div className="space-y-3">
          <MobilePanelRow
            Icon={Receipt}
            label="Nuevo reporte por origen"
            hint="Taquilla, mesa y bar · no pasó por la web"
            tone="caja"
            onRowClick={() => setView("newReport")}
          />
          <MobilePanelRow
            Icon={FileText}
            label="Historial de reportes"
            hint={historyHint}
            tone="caja"
            onRowClick={() => setView("history")}
          />
        </div>
      ) : null}
    </div>
  );

  const showNew = Boolean(venueId && view === "newReport");
  const showHist = Boolean(venueId && view === "history");

  return (
    <AnimatePresence mode="wait">
      {showNew ? (
        <motion.div
          key="caja-new-report"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <CashNewReportFlow
            venueId={venueId!}
            onBack={() => setView("main")}
            onSaved={() => void load()}
          />
        </motion.div>
      ) : showHist ? (
        <motion.div
          key="caja-history"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          <CashReportHistoryFlow
            closings={closings}
            loading={loading}
            venueId={venueId ?? ""}
            onBack={() => setView("main")}
            onDeleted={() => void load()}
          />
        </motion.div>
      ) : (
        <motion.div
          key="caja-main"
          variants={fadeSlide}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-3"
        >
          {mainBody}
        </motion.div>
      )}
    </AnimatePresence>
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
