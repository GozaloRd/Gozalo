"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { VenueTableRow } from "@/lib/dashboardApi";
import type { DashboardReservationRow } from "@/lib/dashboardEventReservations";
import { formatMoney } from "@/lib/format";
import { paymentInfo } from "@/lib/reservationPayment";
import { augmentTablesForAccess } from "@/lib/accessTableAugment";
import { AccessDetailHeader } from "@/components/dashboard/panels/access/AccessDetailHeader";

type DebtSort = "amount" | "mesa";

type Props = {
  eventId: string;
  eventTitle: string;
  eventLine: string;
  tables: VenueTableRow[];
  reservations: DashboardReservationRow[];
  loading: boolean;
  onBack: () => void;
};

export function PaymentsControlView({
  eventId,
  eventTitle,
  eventLine,
  tables,
  reservations,
  loading,
  onBack,
}: Props) {
  const [filt, setFilt] = useState<"all" | "pend" | "ok">("all");
  const [sortBy, setSortBy] = useState<DebtSort>("amount");

  const augmented = useMemo(
    () => (eventId ? augmentTablesForAccess(tables, reservations, eventId) : []),
    [tables, reservations, eventId]
  );

  const debtors = useMemo(() => augmented.filter((t) => t.pendingTotal > 0), [augmented]);

  const totals = useMemo(() => {
    let expected = 0;
    let paid = 0;
    for (const r of reservations.filter((x) => x.evento?.id === eventId && x.estado !== "cancelled")) {
      const p = paymentInfo(r);
      expected += p.total;
      paid += p.paidBeforeEvent;
    }
    const pendingSum = debtors.reduce((a, t) => a + t.pendingTotal, 0);
    return { expected, paid, pendingSum };
  }, [reservations, eventId, debtors]);

  const pctCollected =
    totals.expected > 0 ? Math.min(100, Math.round((totals.paid / totals.expected) * 100)) : 0;

  const sortedList = useMemo(() => {
    let rows = [...augmented];
    if (filt === "pend") rows = rows.filter((r) => r.pendingTotal > 0);
    if (filt === "ok") rows = rows.filter((r) => r.pendingTotal <= 0 && r.matches.length > 0);
    if (sortBy === "amount") {
      rows.sort((a, b) => b.pendingTotal - a.pendingTotal);
    } else {
      rows.sort((a, b) =>
        String(a.table.label).localeCompare(String(b.table.label), undefined, { numeric: true })
      );
    }
    return rows;
  }, [augmented, filt, sortBy]);

  const alDiaCompact = useMemo(
    () =>
      augmented
        .filter((r) => r.pendingTotal <= 0 && r.matches.length > 0)
        .slice(0, 12)
        .map((r) => `${r.table.zone} ${r.table.label}`)
        .join(" · "),
    [augmented]
  );

  function phoneHref(phone: string | undefined) {
    const d = String(phone ?? "").replace(/\D/g, "");
    if (!d) return null;
    return `tel:${d}`;
  }
  function waHref(phone: string | undefined, name: string) {
    const d = String(phone ?? "").replace(/\D/g, "");
    if (!d) return null;
    const text = encodeURIComponent(`Hola ${name}, recordatorio de saldo en ${eventTitle}.`);
    return `https://wa.me/${d}?text=${text}`;
  }

  return (
    <div className="space-y-4">
      <AccessDetailHeader onBack={onBack} itemTitle="Control de pagos" eventLine={eventLine} />

      {loading ? (
        <p className="text-sm text-slate-500">Cargando…</p>
      ) : !eventId ? (
        <div className="text-center text-sm text-slate-400">
          <p>Sin eventos próximos con mesas reservables.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl border border-blue-500/40 py-2 text-sm font-semibold text-blue-300"
          >
            ← Volver
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">
            <p>
              ⚠️ {debtors.length} mesa{debtors.length === 1 ? "" : "s"} con saldo pendiente
            </p>
            <p className="font-semibold text-amber-200/90">💰 Total pendiente: {formatMoney(totals.pendingSum)}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["all", "pend", "ok"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilt(k)}
                className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
                  filt === k
                    ? "border-blue-500/50 bg-blue-500/15 text-white"
                    : "border-white/10 text-slate-400"
                }`}
              >
                {k === "all" ? "Todos" : k === "pend" ? "⚠️ Pend" : "✅ OK"}
              </button>
            ))}
          </div>

          <label className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            Ordenar
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as DebtSort)}
              className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
            >
              <option value="amount">Mayor deuda</option>
              <option value="mesa">Nº mesa</option>
            </select>
          </label>

          <ul className="space-y-2">
            {sortedList.map((row) => {
              const pr = row.primary;
              const name = pr?.cliente?.nombre ?? "Sin nombre";
              const p = pr ? paymentInfo(pr) : null;
              const hasDebt = row.pendingTotal > 0;
              const head =
                hasDebt && row.state === "ocupada" ? "🔴" : hasDebt ? "🟡" : "✅";
              return (
                <li
                  key={row.table.id}
                  className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2.5 text-sm"
                >
                  <p className="font-semibold text-white">
                    {hasDebt ? head : "✅"} MESA {row.table.label} · {row.table.zone}
                  </p>
                  {hasDebt && pr ? <p className="text-xs text-slate-400">👤 {name}</p> : null}
                  {hasDebt && p ? (
                    <>
                      <p className="text-xs text-slate-300">
                        Total: {formatMoney(p.total)} · Pagado: {formatMoney(p.paidBeforeEvent)} · Falta:{" "}
                        <span className="text-amber-300">{formatMoney(p.pendingAtVenue)}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Estado:{" "}
                        {row.state === "ocupada"
                          ? "🔵 Cliente está"
                          : row.state === "reservada"
                            ? "🟡 No ha llegado"
                            : "🟢 Mesa libre"}
                      </p>
                    </>
                  ) : !hasDebt ? (
                    <p className="text-xs text-emerald-300/80">✅ Al día</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {hasDebt ? (
                      <Link
                        href={`/dashboard/caja?eventHint=${encodeURIComponent(eventTitle)}`}
                        className="inline-flex min-h-[40px] items-center rounded-lg bg-[#2979FF] px-2.5 py-1.5 text-[11px] font-semibold text-white"
                      >
                        Cobrar saldo
                      </Link>
                    ) : null}
                    {hasDebt && pr?.cliente?.telefono ? (
                      <a
                        href={phoneHref(pr.cliente.telefono) ?? "#"}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200"
                      >
                        📞 Llamar
                      </a>
                    ) : null}
                    {hasDebt && pr?.cliente?.telefono ? (
                      <a
                        href={waHref(pr.cliente.telefono, name) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-[11px] text-emerald-200"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {alDiaCompact ? (
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/90">
                ✅ Mesas al día
              </p>
              <p className="mt-1 text-xs text-slate-400">{alDiaCompact}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 text-[11px] text-slate-300">
            <p className="font-semibold text-white">📊 Resumen financiero</p>
            <p>Total esperado: {formatMoney(totals.expected)}</p>
            <p>Cobrado: {formatMoney(totals.paid)}</p>
            <p>Pendiente: {formatMoney(totals.pendingSum)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500/80 transition-[width]"
                style={{ width: `${pctCollected}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-500">{pctCollected}% cobrado (estimado)</p>
          </div>
        </div>
      )}
    </div>
  );
}
