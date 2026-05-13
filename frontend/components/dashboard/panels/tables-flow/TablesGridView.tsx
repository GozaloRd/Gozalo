"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AugmentedTable, MesaUiEstado } from "@/lib/tableFlowLogic";
import { MESA_ESTADO_META } from "@/lib/tableFlowLogic";
import { TableMiniCard } from "@/components/dashboard/panels/tables-flow/TableMiniCard";
import { TablesPlanView } from "@/components/dashboard/panels/tables-flow/TablesPlanView";
import { formatMoney } from "@/lib/format";
import { deactivateDashboardTable } from "@/lib/dashboardApi";

const EMOJI: Record<MesaUiEstado, string> = {
  disponible: "🟢",
  reservada: "🟡",
  ocupada: "🔵",
  sin_pago: "🔴",
  bloqueada: "⚪",
};

type FilterKey = "todas" | "disp" | "reserv" | "sinpago";

type Props = {
  zoneName: string;
  eventTitle: string;
  tables: AugmentedTable[];
  venueId: string;
  summaryLine: string;
  onOpenDetail: (t: AugmentedTable) => void;
  onRefresh: () => void;
};

export function TablesGridView({
  zoneName,
  eventTitle,
  tables,
  venueId,
  summaryLine,
  onOpenDetail,
  onRefresh,
}: Props) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [view, setView] = useState<"grid" | "list" | "plan">("grid");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tables.filter((t) => {
      if (filter === "disp" && t.estadoUi !== "disponible") return false;
      if (filter === "reserv" && !["reservada", "ocupada"].includes(t.estadoUi)) return false;
      if (filter === "sinpago" && t.estadoUi !== "sin_pago") return false;
      if (!needle) return true;
      if (String(t.label).toLowerCase().includes(needle)) return true;
      for (const r of t.matches) {
        const name = String(r.cliente?.nombre ?? "").toLowerCase();
        if (name.includes(needle)) return true;
      }
      return false;
    });
  }, [tables, q, filter]);

  const counts = useMemo(() => {
    const todas = tables.length;
    const disp = tables.filter((t) => t.estadoUi === "disponible").length;
    const reserv = tables.filter((t) => ["reservada", "ocupada", "sin_pago"].includes(t.estadoUi)).length;
    const sinpago = tables.filter((t) => t.estadoUi === "sin_pago").length;
    return { todas, disp, reserv, sinpago };
  }, [tables]);

  function toggleSel(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function bulkBlock() {
    if (!selectedIds.size || !venueId) return;
    if (!confirm(`¿Bloquear ${selectedIds.size} mesa(s)?`)) return;
    for (const id of Array.from(selectedIds)) {
      try {
        await deactivateDashboardTable(id, venueId);
      } catch {
        /* ignore individual failures */
      }
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
    onRefresh();
  }

  const chip = (id: FilterKey, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(id)}
      className={`rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition ${
        filter === id
          ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-200"
          : "border-white/10 bg-white/[0.04] text-slate-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-w-0 space-y-3">
      <div>
        <p className="font-display text-sm font-semibold text-white">
          {zoneName} — {eventTitle}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">{summaryLine}</p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar mesa o cliente…"
          className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600"
          aria-label="Buscar mesa o cliente"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {chip("todas", `Todas ${counts.todas}`)}
        {chip("disp", `Disp ${counts.disp}`)}
        {chip("reserv", `Reserv ${counts.reserv}`)}
        {chip("sinpago", `Sin pago ${counts.sinpago}`)}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="mr-1 text-[10px] uppercase text-slate-500">Vista:</span>
        {(["grid", "list", "plan"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-lg border px-2 py-1 text-[11px] ${
              view === v ? "border-emerald-500/50 text-emerald-300" : "border-white/10 text-slate-400"
            }`}
          >
            {v === "grid" ? "🔲 Grid" : v === "list" ? "📋 Lista" : "🗺️"}
          </button>
        ))}
        {selectionMode ? (
          <button
            type="button"
            onClick={() => {
              setSelectionMode(false);
              setSelectedIds(new Set());
            }}
            className="ml-auto text-[11px] text-amber-300 underline"
          >
            Cancelar selección
          </button>
        ) : null}
      </div>

      {view === "plan" ? (
        <TablesPlanView tables={filtered} onSelectTable={onOpenDetail} />
      ) : view === "list" ? (
        <ul className="max-h-[min(48vh,380px)] space-y-2 overflow-y-auto pr-1">
          {filtered.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => (selectionMode ? toggleSel(t.id) : onOpenDetail(t))}
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-zinc-900/70 px-3 py-2.5 text-left"
              >
                <span className="text-white">
                  {EMOJI[t.estadoUi]} Mesa {t.label}
                </span>
                <span className="text-[11px] text-slate-500">{MESA_ESTADO_META[t.estadoUi].label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-auto grid max-h-[min(52vh,440px)] grid-cols-4 gap-2 overflow-y-auto overscroll-contain pr-1 max-[380px]:grid-cols-3">
          {filtered.map((t) => (
            <TableMiniCard
              key={t.id}
              table={t}
              selected={selectedIds.has(t.id)}
              selectionMode={selectionMode}
              onTap={() => {
                if (selectionMode) toggleSel(t.id);
                else onOpenDetail(t);
              }}
              onLongPress={() => {
                setSelectionMode(true);
                setSelectedIds((prev) => new Set(prev).add(t.id));
              }}
            />
          ))}
        </div>
      )}

      {selectionMode && selectedIds.size > 0 ? (
        <div className="sticky bottom-0 z-10 rounded-xl border border-amber-500/30 bg-zinc-950/95 p-3 backdrop-blur-sm">
          <p className="text-center text-[11px] text-slate-400">{selectedIds.size} seleccionadas</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => void bulkBlock()}
              className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-200"
            >
              Bloquear
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-500"
            >
              Marcar pagadas
            </button>
            <button
              type="button"
              disabled
              className="rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-500"
            >
              Cancelar reservas
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
