"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { fetchCashClosings } from "@/lib/dashboardApi";
import type { CashReport } from "./types";
import { formatDate, formatRD, normalizeCashReport, originSubtotal } from "./utils";

export function CashReportsHistoryView({
  venueId,
  onBack,
  onGoToNewReport,
}: {
  venueId: string;
  onBack: () => void;
  onGoToNewReport: () => void;
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
        setReports((res.data ?? []).map(normalizeCashReport).filter((r) => r.id));
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "No se pudo cargar el historial.");
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

  const sorted = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reports]
  );

  return (
    <div className="min-h-0 space-y-4">
      <button type="button" onClick={onBack} className="flex items-start gap-2 text-left text-white/70 transition hover:text-white">
        <ArrowLeft className="mt-0.5 h-4 w-4" />
        <span>
          <span className="block text-sm font-semibold text-white">Historial de reportes</span>
          <span className="text-xs text-white/45">
            {isLoading
              ? "Cargando..."
              : sorted.length === 0
                ? "Sin reportes aún"
                : `${sorted.length} reportes guardados`}
          </span>
        </span>
      </button>
      <div className="border-b border-white/10" />

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div key={idx} className="h-12 animate-pulse rounded-lg bg-white/10" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-4 text-red-300">
          <p className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-red-400" />
            {error}
          </p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] p-12">
          <p className="text-center text-sm text-white/30">Aún no hay reportes de caja guardados.</p>
          <button type="button" onClick={onGoToNewReport} className="mt-2 text-xs text-purple-400 hover:text-purple-300">
            Crear primer reporte
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40">REPORTES DE CAJA</p>
            <p className="text-xs text-white/40">{sorted.length} resultados</p>
          </div>

          <AnimatePresence mode="popLayout">
            {sorted.map((report, idx) => (
              <motion.div
                key={report.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.04 } }}
                exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-[auto_1fr_auto_auto_auto_auto_1fr] items-center gap-4 border-b border-white/5 px-5 py-4 text-sm hover:bg-white/[0.04]"
              >
                <span className="font-mono text-white/60">{formatDate(report.createdAt)}</span>
                <span className={report.eventName ? "text-white" : "text-white/30"}>{report.eventName ?? "—"}</span>
                <span className="text-white/50">{formatRD(originSubtotal(report.entries))}</span>
                <span className="text-white/50">{formatRD(originSubtotal(report.tables))}</span>
                <span className="text-white/50">{formatRD(originSubtotal(report.bar))}</span>
                <span className="font-bold text-purple-300">{formatRD(report.total)}</span>
                <span className="truncate text-xs text-white/30">{report.note ?? "—"}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
