"use client";

import { useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import type { BreakdownNums } from "@/lib/cashReportForm";
import { channelTotal } from "@/lib/cashReportForm";
import { deleteCashClosing } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

export type CashClosingRow = {
  id: string;
  createdAt?: string;
  grandTotal?: string | number;
  cashTotal?: string | number;
  cardTotal?: string | number;
  transferTotal?: string | number;
  closedBy?: { fullName?: string };
  metadata?: { breakdown?: BreakdownNums } | null;
};

export function CashReportHistoryFlow({
  closings,
  loading,
  venueId,
  onBack,
  onDeleted,
}: {
  closings: CashClosingRow[];
  loading: boolean;
  venueId: string;
  onBack: () => void;
  onDeleted?: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!venueId) return;
    if (
      !window.confirm(
        "¿Eliminar este reporte de caja? Los totales del historial y estadísticas se actualizarán. No se puede deshacer."
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteCashClosing(id, venueId);
      setExpandedId((cur) => (cur === id ? null : cur));
      onDeleted?.();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "No se pudo eliminar el reporte");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg p-2 text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Volver a caja"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white">Historial de reportes</h2>
          <p className="text-[11px] text-zinc-500">
            {closings.length === 0 && !loading
              ? "Sin reportes aún"
              : `${closings.length} registro${closings.length === 1 ? "" : "s"} · puedes borrar si hubo un error`}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : closings.length === 0 ? (
        <p className="rounded-xl border border-white/[0.08] bg-zinc-950/50 px-4 py-6 text-center text-sm text-slate-500">
          Aún no hay reportes de caja guardados.
        </p>
      ) : (
        <ul className="space-y-2">
          {closings.map((c) => {
            const b = c.metadata?.breakdown;
            const open = expandedId === c.id;
            const ex = (k: keyof BreakdownNums) => (b ? formatMoney(channelTotal(b, k)) : "—");
            const busy = deletingId === c.id;
            return (
              <li key={c.id} className="overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900/60">
                <div className="flex min-h-[52px] items-stretch">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : c.id)}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-3 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400">
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleString("es-DO", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </p>
                      <p className="mt-0.5 text-base font-semibold tabular-nums text-white">
                        {formatMoney(Number(c.grandTotal ?? 0))}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Ef. {formatMoney(Number(c.cashTotal ?? 0))} · Tarj. {formatMoney(Number(c.cardTotal ?? 0))} ·
                        Transf. {formatMoney(Number(c.transferTotal ?? 0))}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-purple-400">{open ? "▲" : "▼"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={busy || !venueId}
                    onClick={() => void handleDelete(c.id)}
                    className="flex shrink-0 items-center justify-center border-l border-white/[0.08] px-3 text-rose-400 transition hover:bg-rose-500/10 disabled:opacity-40"
                    aria-label="Eliminar reporte"
                  >
                    <Trash2 className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
                  </button>
                </div>
                {open ? (
                  <div className="border-t border-white/[0.06] px-3 py-3 text-xs text-slate-400">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Entradas</p>
                        <p className="mt-0.5 font-medium text-slate-200">{ex("entradas")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Mesas</p>
                        <p className="mt-0.5 font-medium text-slate-200">{ex("mesas")}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-slate-500">Consumo</p>
                        <p className="mt-0.5 font-medium text-slate-200">{ex("consumo")}</p>
                      </div>
                    </div>
                    {b ? (
                      <div className="mt-3 space-y-2">
                        {(["entradas", "mesas", "consumo"] as const).map((k) => (
                          <div key={k} className="rounded-lg border border-white/[0.06] bg-black/20 p-2">
                            <p className="font-medium capitalize text-slate-300">
                              {k === "entradas" ? "Entradas" : k === "mesas" ? "Mesas / reservas" : "Consumo"}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Ef. {formatMoney(b[k].cash)} · Tarj. {formatMoney(b[k].card)} · Transf.{" "}
                              {formatMoney(b[k].transfer)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 text-[11px] text-slate-500">Por: {c.closedBy?.fullName ?? "—"}</p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
