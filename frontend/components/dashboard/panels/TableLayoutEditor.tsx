"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { Armchair, Trash2 } from "lucide-react";

const ROWS = 8;
const COLS = 10;

export type TableLayoutSlot = {
  id: string;
  row: number;
  col: number;
  capacity: number;
  minPrice: number;
  zone: "general" | "vip";
};

function genId() {
  return `tbl_${Math.random().toString(36).slice(2, 10)}`;
}

type Props = {
  enabled: boolean;
  value: TableLayoutSlot[];
  onChange: (next: TableLayoutSlot[]) => void;
};

/**
 * Grid simple: clic en celda vacía añade mesa; clic en ocupada abre edición.
 * Estado local al padre — enlazar con persistencia cuando exista API dedicada.
 */
export function TableLayoutEditor({ enabled, value, onChange }: Props) {
  const baseId = useId();
  const [editingId, setEditingId] = useState<string | null>(null);

  const byCell = useMemo(() => {
    const m = new Map<string, TableLayoutSlot>();
    for (const t of value) {
      m.set(`${t.row},${t.col}`, t);
    }
    return m;
  }, [value]);

  const editing = value.find((t) => t.id === editingId) ?? null;

  const remove = useCallback(
    (id: string) => {
      onChange(value.filter((t) => t.id !== id));
      setEditingId(null);
    },
    [onChange, value]
  );

  const upsert = useCallback(
    (next: TableLayoutSlot) => {
      const others = value.filter((t) => t.id !== next.id);
      onChange([...others, next]);
    },
    [onChange, value]
  );

  return (
    <div
      className={`space-y-3 rounded-xl border border-white/[0.08] bg-zinc-950/60 p-3 ${!enabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <p className="text-xs text-slate-400">
        Toca una celda vacía para añadir una mesa. Toca una ocupada para editar o eliminar.
      </p>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: ROWS * COLS }, (_, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          const slot = byCell.get(`${row},${col}`);
          const active = !!slot;
          return (
            <button
              key={`${baseId}-${row}-${col}`}
              type="button"
              disabled={!enabled}
              onClick={() => {
                if (!enabled) return;
                if (slot) {
                  setEditingId(slot.id);
                  return;
                }
                const nu: TableLayoutSlot = {
                  id: genId(),
                  row,
                  col,
                  capacity: 4,
                  minPrice: 0,
                  zone: "general",
                };
                onChange([...value, nu]);
                setEditingId(nu.id);
              }}
              className={`flex aspect-square min-h-[22px] items-center justify-center rounded border text-[10px] transition active:scale-95 ${
                active
                  ? slot?.zone === "vip"
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                    : "border-emerald-500/50 bg-emerald-500/15 text-emerald-100"
                  : "border-white/[0.06] bg-white/[0.03] hover:border-white/15"
              }`}
              aria-label={slot ? `Mesa ${slot.capacity} plazas` : "Añadir mesa"}
            >
              {slot ? <Armchair className="h-3 w-3 opacity-90" aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      {editing ? (
        <div className="space-y-2 rounded-lg border border-white/[0.08] bg-zinc-900/90 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-white">Mesa ({editing.row + 1},{editing.col + 1})</span>
            <button
              type="button"
              onClick={() => remove(editing.id)}
              className="rounded-md p-1.5 text-rose-400 transition hover:bg-rose-500/15"
              aria-label="Eliminar mesa"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <label className="block text-[11px] text-slate-400">
            Capacidad
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white"
              value={editing.capacity}
              onChange={(e) =>
                upsert({ ...editing, capacity: Math.max(1, Number(e.target.value) || 1) })
              }
            />
          </label>
          <label className="block text-[11px] text-slate-400">
            Precio mínimo (RD$)
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm text-white"
              value={editing.minPrice}
              onChange={(e) =>
                upsert({ ...editing, minPrice: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={editing.zone === "vip"}
              onChange={(e) =>
                upsert({ ...editing, zone: e.target.checked ? "vip" : "general" })
              }
              className="rounded border-white/20"
            />
            Zona VIP
          </label>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="w-full rounded-lg border border-white/10 py-2 text-xs font-medium text-slate-300"
          >
            Cerrar
          </button>
        </div>
      ) : null}
    </div>
  );
}
