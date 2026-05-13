"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { createCashClosing, fetchDashboardEvents } from "@/lib/dashboardApi";
import { CashOriginSection } from "./CashOriginSection";
import type { CashOriginAmounts, WorkspaceEvent } from "./types";
import { calculateReportTotals, formatRD } from "./utils";

function emptyAmounts(): CashOriginAmounts {
  return { cash: 0, card: 0, transfer: 0 };
}

export function NewCashReportView({
  venueId,
  onBack,
  onSaved,
}: {
  venueId: string;
  onBack: () => void;
  onSaved: () => void;
}) {
  const [entries, setEntries] = useState<CashOriginAmounts>(emptyAmounts);
  const [tables, setTables] = useState<CashOriginAmounts>(emptyAmounts);
  const [bar, setBar] = useState<CashOriginAmounts>(emptyAmounts);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [note, setNote] = useState("");

  const [events, setEvents] = useState<WorkspaceEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function loadEvents() {
      setEventsLoading(true);
      setEventsError(null);
      try {
        const res = (await fetchDashboardEvents("all", venueId)) as {
          data?: { id: string; title?: string; name?: string; startAt?: string }[];
        };
        if (!alive) return;
        const rows: WorkspaceEvent[] = (res.data ?? []).map((row) => ({
          id: String(row.id),
          name: String(row.title || row.name || "Evento"),
          date: row.startAt,
        }));
        setEvents(rows);
      } catch (e) {
        if (!alive) return;
        setEvents([]);
        setEventsError(e instanceof Error ? e.message : "No se pudieron cargar los eventos.");
      } finally {
        if (alive) setEventsLoading(false);
      }
    }
    if (venueId) void loadEvents();
    return () => {
      alive = false;
    };
  }, [venueId]);

  const totals = useMemo(
    () =>
      calculateReportTotals({
        entries,
        tables,
        bar,
        note,
        eventId: selectedEventId || undefined,
      }),
    [bar, entries, note, selectedEventId, tables]
  );

  async function saveReport() {
    if (totals.total === 0 || isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const selectedEvent = events.find((ev) => ev.id === selectedEventId);
      await createCashClosing(
        {
          eventId: selectedEventId || null,
          cashTotal: totals.totalsByPaymentMethod.cash,
          cardTotal: totals.totalsByPaymentMethod.card,
          transferTotal: totals.totalsByPaymentMethod.transfer,
          otherTotal: 0,
          breakdown: {
            entradas: entries,
            mesas: tables,
            consumo: bar,
          },
          notes: note.trim() || undefined,
          eventName: selectedEvent?.name,
        },
        venueId
      );
      setEntries(emptyAmounts());
      setTables(emptyAmounts());
      setBar(emptyAmounts());
      setSelectedEventId("");
      setNote("");
      onSaved();
      onBack();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "No se pudo guardar el reporte.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
      <button
        type="button"
        onClick={onBack}
        className="flex items-start gap-2 text-left text-white/70 transition hover:text-white"
      >
        <ArrowLeft className="mt-0.5 h-4 w-4 text-white/70" />
        <span>
          <span className="block text-sm font-semibold text-white">Nuevo reporte por origen</span>
          <span className="text-xs text-white/45">Ingresos fuera de la web · se suman con Ventas en estadísticas</span>
        </span>
      </button>

      <div className="border-b border-white/10" />

      <p className="text-sm text-white/50">
        Los totales de efectivo, tarjeta y transferencia se calculan solos a partir de estas tres filas. Asocia un
        evento para cuadrar métricas por fecha.
      </p>

      <CashOriginSection
        title="Entradas"
        description="Venta de tickets en taquilla u otros cobros de entrada."
        amounts={entries}
        onChange={setEntries}
      />
      <CashOriginSection
        title="Mesas y reservas"
        description="Anticipos de mesa, mínimos, saldo pagado en la mesa o fuera de la app."
        amounts={tables}
        onChange={setTables}
      />
      <CashOriginSection
        title="Bebidas y consumo"
        description="Bar, POS, consumo general no capturado como pago digital en el sistema."
        amounts={bar}
        onChange={setBar}
      />

      <section>
        <label className="mb-2 block text-[10px] uppercase tracking-widest text-white/40">EVENTO (OPCIONAL)</label>
        <select
          value={selectedEventId}
          disabled={eventsLoading}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none focus:border-purple-500/50 disabled:opacity-50"
        >
          <option value="">{eventsLoading ? "Cargando eventos..." : "Sin evento asociado"}</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
        {eventsError ? <p className="mt-2 text-xs text-red-300">{eventsError}</p> : null}
      </section>

      <section>
        <label className="mb-2 block text-[10px] uppercase tracking-widest text-white/40">TOTAL DEL REPORTE</label>
        <div className="w-full rounded-xl border border-purple-500/40 bg-purple-950/40 px-4 py-4 text-xl font-bold text-purple-100">
          {formatRD(totals.total)}
        </div>
      </section>

      <section>
        <label className="mb-2 block text-[10px] uppercase tracking-widest text-white/40">NOTA (OPCIONAL)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej.: Cierre turno noche — saldo mesas VIP cobrado en efectivo"
          className="min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
        />
      </section>

      <motion.button
        type="button"
        disabled={totals.total === 0 || isSaving}
        onClick={() => void saveReport()}
        whileHover={totals.total > 0 && !isSaving ? { scale: 1.005 } : undefined}
        whileTap={totals.total > 0 && !isSaving ? { scale: 0.98 } : undefined}
        className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 py-4 font-bold text-white shadow-lg shadow-purple-950/20 transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? "Guardando..." : "Guardar reporte"}
      </motion.button>

      {saveError ? (
        <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-red-300">
          <p className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-red-400" />
            {saveError}
          </p>
        </div>
      ) : null}
    </div>
  );
}
