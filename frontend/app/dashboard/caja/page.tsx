"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { DashCard } from "@/components/dashboard/pro/DashCard";
import { useDashboard } from "@/contexts/DashboardContext";
import { createCashClosing, fetchCashClosings, fetchDashboardEvents } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

type MethodSlice = { cash: string; card: string; transfer: string };

type BreakdownNums = {
  entradas: { cash: number; card: number; transfer: number; other: number };
  mesas: { cash: number; card: number; transfer: number; other: number };
  consumo: { cash: number; card: number; transfer: number; other: number };
};

type ClosingRow = {
  id: string;
  createdAt?: string;
  grandTotal?: string | number;
  cashTotal?: string | number;
  cardTotal?: string | number;
  transferTotal?: string | number;
  closedBy?: { fullName?: string };
  metadata?: { breakdown?: BreakdownNums } | null;
};

const emptySlice = (): MethodSlice => ({ cash: "", card: "", transfer: "" });

function parseSlice(s: MethodSlice) {
  return {
    cash: Math.max(0, Number(s.cash || 0)),
    card: Math.max(0, Number(s.card || 0)),
    transfer: Math.max(0, Number(s.transfer || 0)),
    other: 0,
  };
}

function buildBreakdown(e: MethodSlice, m: MethodSlice, c: MethodSlice): BreakdownNums {
  return {
    entradas: parseSlice(e),
    mesas: parseSlice(m),
    consumo: parseSlice(c),
  };
}

function sumBreakdown(b: BreakdownNums) {
  let cash = 0;
  let card = 0;
  let transfer = 0;
  let other = 0;
  for (const ch of Object.values(b)) {
    cash += ch.cash;
    card += ch.card;
    transfer += ch.transfer;
    other += ch.other;
  }
  return { cash, card, transfer, other, grand: cash + card + transfer + other };
}

function channelTotal(b: BreakdownNums, key: keyof BreakdownNums) {
  const x = b[key];
  return x.cash + x.card + x.transfer + x.other;
}

export default function DashboardCajaPage() {
  const { venueId } = useDashboard();
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [eventId, setEventId] = useState("");
  const [entradas, setEntradas] = useState<MethodSlice>(() => emptySlice());
  const [mesas, setMesas] = useState<MethodSlice>(() => emptySlice());
  const [consumo, setConsumo] = useState<MethodSlice>(() => emptySlice());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closings, setClosings] = useState<ClosingRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    setLoading(true);
    try {
      const [ev, cc] = await Promise.all([
        fetchDashboardEvents("upcoming", venueId),
        fetchCashClosings(venueId),
      ]);
      const evList = (ev as { data?: { id: string; title: string }[] })?.data ?? [];
      setEvents(evList);
      if (!eventId && evList[0]?.id) setEventId(evList[0].id);
      const rows = (cc as { data?: ClosingRow[] })?.data ?? [];
      setClosings(rows);
    } catch {
      setEvents([]);
      setClosings([]);
    } finally {
      setLoading(false);
    }
  }, [venueId, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const breakdownLive = useMemo(
    () => buildBreakdown(entradas, mesas, consumo),
    [entradas, mesas, consumo]
  );
  const totals = useMemo(() => sumBreakdown(breakdownLive), [breakdownLive]);

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
      const b = r.metadata?.breakdown;
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

  async function submitReport() {
    if (!venueId) return;
    if (totals.grand <= 0) {
      alert("Ingresa al menos un monto en alguna fila (efectivo, tarjeta o transferencia).");
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
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar reporte");
    } finally {
      setSaving(false);
    }
  }

  const sliceRow = (
    label: string,
    hint: string,
    slice: MethodSlice,
    setSlice: (v: MethodSlice) => void
  ) => (
    <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] p-4">
      <p className="text-sm font-medium text-white">{label}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-slate-500">Efectivo</label>
          <input
            type="number"
            min={0}
            step="0.01"
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
            value={slice.transfer}
            onChange={(e) => setSlice({ ...slice, transfer: e.target.value })}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#111118] px-2 py-2 text-sm text-white"
            placeholder="0"
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Subtotal canal:{" "}
        <span className="font-semibold text-[#E0AAFF]">
          {formatMoney(
            Math.max(0, Number(slice.cash || 0)) +
              Math.max(0, Number(slice.card || 0)) +
              Math.max(0, Number(slice.transfer || 0))
          )}
        </span>
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      <DashCard className="p-5">
        <h1 className="text-xl font-semibold text-white">Caja centralizada</h1>
        <p className="mt-1 text-sm text-slate-400">
          Desglosa lo reportado por entradas, mesas o reservas, y bebidas y consumo (bar o POS). Las
          estadísticas combinan pagos digitales en la app con lo que registres aquí, por canal y método de pago.
        </p>
      </DashCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">Histórico efectivo</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(stats.cash)}</p>
        </DashCard>
        <DashCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">Histórico tarjeta</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(stats.card)}</p>
        </DashCard>
        <DashCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">Histórico transferencia</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatMoney(stats.transfer)}</p>
        </DashCard>
        <DashCard>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total reportado (caja)</p>
          <p className="mt-2 text-2xl font-semibold text-[#9B7FCA]">{formatMoney(stats.total)}</p>
        </DashCard>
      </div>

      {(stats.byChannel.entradas > 0 || stats.byChannel.mesas > 0 || stats.byChannel.consumo > 0) && (
        <div className="grid gap-4 sm:grid-cols-3">
          <DashCard>
            <p className="text-xs uppercase tracking-wide text-slate-500">Solo entradas (detalle)</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatMoney(stats.byChannel.entradas)}</p>
          </DashCard>
          <DashCard>
            <p className="text-xs uppercase tracking-wide text-slate-500">Solo mesas / reservas</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatMoney(stats.byChannel.mesas)}</p>
          </DashCard>
          <DashCard>
            <p className="text-xs uppercase tracking-wide text-slate-500">Solo consumo / bar</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatMoney(stats.byChannel.consumo)}</p>
          </DashCard>
        </div>
      )}

      <DashCard className="p-5">
        <h2 className="text-base font-semibold text-white">Nuevo reporte por origen</h2>
        <p className="mt-1 text-xs text-slate-500">
          Los totales de efectivo, tarjeta y transferencia se calculan solos a partir de estas tres filas.
        </p>

        <div className="mt-4 space-y-4">
          {sliceRow(
            "Entradas",
            "Venta de tickets en taquilla u otros cobros de entrada.",
            entradas,
            setEntradas
          )}
          {sliceRow(
            "Mesas y reservas",
            "Anticipos de mesa, mínimos, saldo pagado en la mesa o fuera de la app.",
            mesas,
            setMesas
          )}
          {sliceRow(
            "Bebidas y consumo",
            "Bar, POS, consumo general no capturado como pago digital en el sistema.",
            consumo,
            setConsumo
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-500">Evento (opcional)</label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white"
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
            <div className="mt-1 rounded-xl border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-3 py-2.5 text-sm font-semibold text-[#E0AAFF]">
              {formatMoney(totals.grand)}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs uppercase tracking-wide text-slate-500">Nota (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white"
            placeholder="Ej.: Cierre turno noche — saldo mesas VIP cobrado en efectivo"
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submitReport()}
          className="mt-4 rounded-xl bg-gradient-to-r from-[#9B7FCA] to-[#7B5EA7] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar reporte"}
        </button>
      </DashCard>

      <DashCard padding={false}>
        <div className="border-b border-white/[0.08] px-6 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Historial de reportes
          </p>
        </div>
        {loading ? (
          <p className="px-6 py-8 text-sm text-slate-500">Cargando reportes...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-white/[0.08] text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Efect.</th>
                  <th className="px-4 py-3">Tarj.</th>
                  <th className="px-4 py-3">Transf.</th>
                  <th className="px-4 py-3">Entradas</th>
                  <th className="px-4 py-3">Mesas</th>
                  <th className="px-4 py-3">Consumo</th>
                  <th className="px-4 py-3">Por</th>
                  <th className="px-4 py-3 w-24">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {closings.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-sm text-slate-500">
                      Aún no hay reportes de caja.
                    </td>
                  </tr>
                ) : (
                  closings.map((c) => {
                    const b = c.metadata?.breakdown;
                    const ex = (k: keyof BreakdownNums) =>
                      b ? formatMoney(channelTotal(b, k)) : "—";
                    const open = expandedId === c.id;
                    return (
                      <Fragment key={c.id}>
                        <tr className="border-b border-white/[0.06] hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-slate-400">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString("es-DO") : "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">
                            {formatMoney(Number(c.grandTotal ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {formatMoney(Number(c.cashTotal ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {formatMoney(Number(c.cardTotal ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {formatMoney(Number(c.transferTotal ?? 0))}
                          </td>
                          <td className="px-4 py-3 text-slate-400">{ex("entradas")}</td>
                          <td className="px-4 py-3 text-slate-400">{ex("mesas")}</td>
                          <td className="px-4 py-3 text-slate-400">{ex("consumo")}</td>
                          <td className="px-4 py-3 text-slate-400">{c.closedBy?.fullName ?? "—"}</td>
                          <td className="px-4 py-3">
                            {b ? (
                              <button
                                type="button"
                                className="text-xs text-[#9B7FCA] hover:underline"
                                onClick={() => setExpandedId(open ? null : c.id)}
                              >
                                {open ? "Ocultar" : "Ver"}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </td>
                        </tr>
                        {open && b && (
                          <tr className="bg-[#0a0a10]">
                            <td colSpan={10} className="px-6 py-4 text-xs text-slate-400">
                              <div className="grid gap-4 sm:grid-cols-3">
                                {(["entradas", "mesas", "consumo"] as const).map((k) => (
                                  <div key={k} className="rounded-lg border border-white/[0.06] p-3">
                                    <p className="font-medium capitalize text-slate-300">
                                      {k === "entradas"
                                        ? "Entradas"
                                        : k === "mesas"
                                          ? "Mesas / reservas"
                                          : "Consumo"}
                                    </p>
                                    <p className="mt-1 text-slate-500">
                                      Ef. {formatMoney(b[k].cash)} · Tarj. {formatMoney(b[k].card)} · Transf.{" "}
                                      {formatMoney(b[k].transfer)}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>
    </div>
  );
}
