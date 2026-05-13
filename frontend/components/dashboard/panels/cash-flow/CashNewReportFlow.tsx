"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { createCashClosing, fetchDashboardEvents } from "@/lib/dashboardApi";
import {
  buildBreakdown,
  emptySlice,
  sliceSubtotal,
  sumBreakdown,
  type MethodSlice,
} from "@/lib/cashReportForm";
import { formatMoney } from "@/lib/format";

export function CashNewReportFlow({
  venueId,
  onBack,
  onSaved,
}: {
  venueId: string;
  onBack: () => void;
  onSaved?: () => void;
}) {
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [entradas, setEntradas] = useState<MethodSlice>(() => emptySlice());
  const [mesas, setMesas] = useState<MethodSlice>(() => emptySlice());
  const [consumo, setConsumo] = useState<MethodSlice>(() => emptySlice());
  const [notes, setNotes] = useState("");
  const [loadingEv, setLoadingEv] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!venueId) return;
    setLoadingEv(true);
    try {
      const ev = await fetchDashboardEvents("upcoming", venueId);
      const evList = (ev as { data?: { id: string; title: string }[] })?.data ?? [];
      setEvents(evList);
      setEventId((cur) => (cur ? cur : evList[0]?.id ?? ""));
    } catch {
      setEvents([]);
    } finally {
      setLoadingEv(false);
    }
  }, [venueId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const breakdownLive = useMemo(
    () => buildBreakdown(entradas, mesas, consumo),
    [entradas, mesas, consumo]
  );
  const totals = useMemo(() => sumBreakdown(breakdownLive), [breakdownLive]);

  async function submitReport() {
    if (!venueId) return;
    if (totals.grand <= 0) {
      window.alert("Ingresa al menos un monto en alguna fila (efectivo, tarjeta o transferencia).");
      return;
    }
    setSaving(true);
    try {
      await createCashClosing(
        {
          eventId: eventId || null,
          cashTotal: totals.cash,
          cardTotal: totals.card,
          transferTotal: totals.transfer,
          otherTotal: totals.other,
          breakdown: breakdownLive,
          notes: notes.trim() || "Reporte manual del local",
        },
        venueId
      );
      setEntradas(emptySlice());
      setMesas(emptySlice());
      setConsumo(emptySlice());
      setNotes("");
      onSaved?.();
      onBack();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Error al guardar reporte");
    } finally {
      setSaving(false);
    }
  }

  const sliceBlock = (
    label: string,
    hint: string,
    slice: MethodSlice,
    setSlice: (v: MethodSlice) => void
  ) => (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] p-3">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-slate-500">Efectivo</label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={slice.cash}
            onChange={(e) => setSlice({ ...slice, cash: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-2 text-sm text-white"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-slate-500">Tarjeta</label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={slice.card}
            onChange={(e) => setSlice({ ...slice, card: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-2 text-sm text-white"
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-slate-500">Transferencia</label>
          <input
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={slice.transfer}
            onChange={(e) => setSlice({ ...slice, transfer: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-2 text-sm text-white"
            placeholder="0"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Subtotal canal: <span className="font-semibold text-fuchsia-300">{formatMoney(sliceSubtotal(slice))}</span>
      </p>
    </div>
  );

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
          <h2 className="truncate text-sm font-semibold text-white">Nuevo reporte por origen</h2>
          <p className="text-[11px] text-zinc-500">
            Ingresos fuera de la web · se suman con Ventas en estadísticas
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Los totales de efectivo, tarjeta y transferencia se calculan solos a partir de estas tres filas. Asocia un
        evento para cuadrar métricas por fecha.
      </p>

      <div className="space-y-3">
        {sliceBlock(
          "Entradas",
          "Venta de tickets en taquilla u otros cobros de entrada.",
          entradas,
          setEntradas
        )}
        {sliceBlock(
          "Mesas y reservas",
          "Anticipos de mesa, mínimos, saldo pagado en la mesa o fuera de la app.",
          mesas,
          setMesas
        )}
        {sliceBlock(
          "Bebidas y consumo",
          "Bar, POS, consumo general no capturado como pago digital en el sistema.",
          consumo,
          setConsumo
        )}
      </div>

      <div className="grid gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Evento (opcional)</label>
          <select
            value={eventId}
            disabled={loadingEv}
            onChange={(e) => setEventId(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white disabled:opacity-50"
          >
            <option value="">Sin asociar a evento</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">Total del reporte</label>
          <div className="mt-1 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-2.5 text-sm font-semibold text-fuchsia-200">
            {formatMoney(totals.grand)}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500">Nota (opcional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white"
          placeholder="Ej.: Cierre turno noche — saldo mesas VIP cobrado en efectivo"
        />
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={() => void submitReport()}
        className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar reporte"}
      </button>
    </div>
  );
}
