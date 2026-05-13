"use client";

import { useMemo, useState } from "react";
import { patchReservationStatus } from "@/lib/dashboardApi";
import type { VenueTableRow } from "@/lib/dashboardApi";
import type { DashboardReservationRow } from "@/lib/dashboardEventReservations";
import { formatMoney } from "@/lib/format";
import { paymentInfo } from "@/lib/reservationPayment";
import {
  augmentTablesForAccess,
  countStates,
  type AugmentedAccessTable,
  type MesaUiState,
} from "@/lib/accessTableAugment";
import { AccessDetailHeader } from "@/components/dashboard/panels/access/AccessDetailHeader";

const DOT: Record<MesaUiState, string> = {
  libre: "🟢",
  reservada: "🟡",
  ocupada: "🔵",
};

const LABEL: Record<MesaUiState, string> = {
  libre: "LIBRE",
  reservada: "RESV",
  ocupada: "OCUP",
};

function shortCheckIn(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

function sortRows(rows: AugmentedAccessTable[], by: "mesa" | "estado", filter: "all" | MesaUiState) {
  let r = rows;
  if (filter !== "all") {
    r = r.filter((x) => x.state === filter);
  }
  if (by === "mesa") {
    return [...r].sort((a, b) =>
      String(a.table.label).localeCompare(String(b.table.label), undefined, { numeric: true })
    );
  }
  const order: Record<MesaUiState, number> = { ocupada: 0, reservada: 1, libre: 2 };
  return [...r].sort((a, b) => order[a.state] - order[b.state]);
}

type Props = {
  eventId: string;
  eventTitle: string;
  eventLine: string;
  tables: VenueTableRow[];
  reservations: DashboardReservationRow[];
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
};

export function TablesStatusView({
  eventId,
  eventTitle,
  eventLine,
  tables,
  reservations,
  loading,
  onBack,
  onRefresh,
}: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | MesaUiState>("all");
  const [sortBy, setSortBy] = useState<"mesa" | "estado">("mesa");
  const [busy, setBusy] = useState<string | null>(null);

  const augmented = useMemo(
    () => (eventId ? augmentTablesForAccess(tables, reservations, eventId) : []),
    [tables, reservations, eventId]
  );

  const { libres, reserv, ocup } = useMemo(() => countStates(augmented), [augmented]);

  const filteredList = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const base = sortRows(augmented, sortBy, filter);
    if (!qn) return base;
    return base.filter((row) => {
      const name = String(row.primary?.cliente?.nombre ?? "").toLowerCase();
      const label = String(row.table.label).toLowerCase();
      const zone = String(row.table.zone).toLowerCase();
      return name.includes(qn) || label.includes(qn) || zone.includes(qn);
    });
  }, [augmented, q, sortBy, filter]);

  async function checkIn(resId: string) {
    setBusy(resId);
    try {
      await patchReservationStatus(resId, "checked_in");
      onRefresh();
    } finally {
      setBusy(null);
    }
  }

  function phoneHref(phone: string | undefined) {
    const d = String(phone ?? "").replace(/\D/g, "");
    if (!d) return null;
    return `tel:${d}`;
  }
  function waHref(phone: string | undefined, name: string) {
    const d = String(phone ?? "").replace(/\D/g, "");
    if (!d) return null;
    const text = encodeURIComponent(`Hola ${name}, te contactamos desde el acceso del evento.`);
    return `https://wa.me/${d}?text=${text}`;
  }

  return (
    <div className="space-y-4">
      <AccessDetailHeader onBack={onBack} itemTitle="Estado de mesas" eventLine={eventLine} />

      {loading ? (
        <p className="text-sm text-slate-500">Cargando mesas…</p>
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
          <div className="flex flex-wrap gap-2 text-xs text-slate-300">
            <span>
              🟢 {libres} libres · 🟡 {reserv} reserv · 🔵 {ocup} ocupadas
            </span>
          </div>

          <input
            type="search"
            placeholder="Buscar mesa o cliente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
          />

          <div className="flex flex-wrap gap-1.5">
            {(["all", "libre", "reservada", "ocupada"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k === "all" ? "all" : k)}
                className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-[11px] font-medium ${
                  (k === "all" && filter === "all") || (k !== "all" && filter === k)
                    ? "border-blue-500/50 bg-blue-500/15 text-white"
                    : "border-white/10 text-slate-400"
                }`}
              >
                {k === "all" ? "Todas" : k === "libre" ? "🟢" : k === "reservada" ? "🟡" : "🔵"}
              </button>
            ))}
          </div>

          <label className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            Ordenar
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "mesa" | "estado")}
              className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
            >
              <option value="mesa">Nº mesa</option>
              <option value="estado">Estado</option>
            </select>
          </label>

          <ul className="space-y-2">
            {filteredList.map((row) => {
              const name = row.primary?.cliente?.nombre ?? "Sin cliente";
              const party = row.primary?.partySize ?? "—";
              const pend = row.pendingTotal;
              const pay = row.primary ? paymentInfo(row.primary) : null;
              const st = row.state;
              return (
                <li
                  key={row.table.id}
                  className="rounded-xl border border-white/[0.07] bg-black/30 px-3 py-2.5 text-sm"
                >
                  <p className="font-semibold text-white">
                    MESA {row.table.label} · {row.table.zone}{" "}
                    <span className="text-xs font-normal text-slate-400">
                      {DOT[st]} {LABEL[st]}
                    </span>
                  </p>
                  {st === "libre" ? (
                    <p className="text-xs text-emerald-300/90">Disponible</p>
                  ) : (
                    <>
                      <p className="text-xs text-slate-400">
                        👤 {name} · {party} pers.
                      </p>
                      {st === "ocupada" && shortCheckIn(row.primary?.horaCheckIn) ? (
                        <p className="text-xs text-emerald-300/90">
                          ✅ Check-in: {shortCheckIn(row.primary?.horaCheckIn)}
                        </p>
                      ) : null}
                      {st === "reservada" ? (
                        <p className="text-xs text-amber-200/80">⏳ Esperando llegada</p>
                      ) : null}
                      {pend > 0 ? (
                        <p className="text-xs text-amber-300">⚠️ Saldo: {formatMoney(pend)}</p>
                      ) : pay ? (
                        <p className="text-xs text-emerald-300/80">💰 Pagado al día</p>
                      ) : null}
                    </>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {st === "reservada" && row.primary ? (
                      <button
                        type="button"
                        disabled={busy === row.primary.id}
                        onClick={() => void checkIn(row.primary!.id)}
                        className="min-h-[40px] rounded-lg bg-emerald-600/90 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                      >
                        Check-in
                      </button>
                    ) : null}
                    {row.primary?.cliente?.telefono ? (
                      <a
                        href={phoneHref(row.primary.cliente.telefono) ?? "#"}
                        className="inline-flex min-h-[40px] items-center rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-200"
                      >
                        📞 Llamar
                      </a>
                    ) : null}
                    {row.primary?.cliente?.telefono ? (
                      <a
                        href={waHref(row.primary.cliente.telefono, name) ?? "#"}
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

        </div>
      )}
    </div>
  );
}
