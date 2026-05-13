"use client";

import { AlertCircle, Calculator, CreditCard, FileText, Info, Landmark, ReceiptText, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { fetchCashClosings } from "@/lib/dashboardApi";
import { CashActionCard } from "./CashActionCard";
import { CashMetricCard } from "./CashMetricCard";
import type { CashMetrics, CashReport } from "./types";
import { buildCashMetrics, formatDate, formatRD, normalizeCashReport } from "./utils";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function CashDashboardView({
  venueId,
  onOpenNewReport,
  onOpenHistory,
}: {
  venueId: string;
  onOpenNewReport: () => void;
  onOpenHistory: () => void;
}) {
  const [reports, setReports] = useState<CashReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = (await fetchCashClosings(venueId)) as { data?: unknown[] };
        if (!alive) return;
        const rows = (res.data ?? []).map(normalizeCashReport).filter((r) => r.id);
        setReports(rows);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "No se pudieron cargar los reportes de caja.");
        setReports([]);
      } finally {
        if (alive) setIsLoading(false);
      }
    }
    if (venueId) void load();
    return () => {
      alive = false;
    };
  }, [venueId]);

  const metrics: CashMetrics = useMemo(() => buildCashMetrics(reports), [reports]);
  const latest = useMemo(
    () =>
      [...reports]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .slice(-3)
        .reverse(),
    [reports]
  );

  return (
    <div className="min-h-0 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/35">WORKSPACE · CAJA</p>
          <h1 className="text-2xl font-bold text-white">Caja</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/35">Área activa</p>
          <span className="inline-block rounded-full border border-purple-400/40 bg-purple-500/15 px-3 py-1 text-sm font-semibold text-purple-200">
            Caja
          </span>
        </div>
      </div>

      <p className="text-sm text-white/50">
        Resumen desde reportes guardados. Registra ingresos fuera de la web para que cuadren con estadísticas.
      </p>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-red-300">
          <p className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-red-400" />
            {error}
          </p>
        </div>
      ) : null}

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <motion.div variants={itemVariants}>
          <CashMetricCard
            label="HISTÓRICO EFECTIVO"
            value={formatRD(metrics.cashTotal)}
            sub="Reportes guardados en efectivo"
            Icon={Wallet}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <CashMetricCard
            label="HISTÓRICO TARJETA"
            value={formatRD(metrics.cardTotal)}
            sub="Pagos manuales por tarjeta"
            Icon={CreditCard}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <CashMetricCard
            label="HISTÓRICO TRANSFERENCIA"
            value={formatRD(metrics.transferTotal)}
            sub="Transferencias registradas manualmente"
            Icon={Landmark}
            isLoading={isLoading}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <CashMetricCard
            label="TOTAL REPORTADO (CAJA)"
            value={formatRD(metrics.grandTotal)}
            sub="Suma efectivo + tarjeta + transferencia"
            Icon={Calculator}
            highlight
            isLoading={isLoading}
          />
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CashActionCard
          icon={ReceiptText}
          title="Nuevo reporte por origen"
          sub="Taquilla, mesa y bar · no pasó por la web"
          onClick={onOpenNewReport}
        />
        <CashActionCard
          icon={FileText}
          title="Historial de reportes"
          sub={
            isLoading
              ? "Cargando..."
              : reports.length === 0
                ? "Sin reportes aún"
                : `${reports.length} reportes guardados`
          }
          onClick={onOpenHistory}
        />
      </div>

      <section className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-[10px] uppercase tracking-widest text-white/40">ÚLTIMOS REPORTES</p>
        {isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="h-10 animate-pulse rounded-lg bg-white/10" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="mt-4 flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-6">
            <Info className="h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <p className="text-sm font-semibold text-white">Aún no hay reportes de caja</p>
              <p className="text-sm text-white/40">
                Cuando registres ingresos manuales, aparecerán aquí y se sumarán al total de Caja.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {latest.map((report) => (
              <div key={report.id} className="flex items-center justify-between border-b border-white/5 py-3 last:border-b-0">
                <div>
                  <p className="text-sm text-white/60">{formatDate(report.createdAt)}</p>
                  <p className="text-xs text-white/40">{report.eventName ?? "—"}</p>
                </div>
                <p className="text-sm font-bold text-purple-300">{formatRD(report.total)}</p>
              </div>
            ))}
            <button type="button" onClick={onOpenHistory} className="mt-3 text-xs text-purple-400 transition hover:text-purple-300">
              Ver historial completo
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
