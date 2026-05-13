"use client";

import { motion } from "framer-motion";
import { MESA_ESTADO_META, type AugmentedTable, type MesaUiEstado } from "@/lib/tableFlowLogic";

const EMOJI: Record<MesaUiEstado, string> = {
  disponible: "🟢",
  reservada: "🟡",
  ocupada: "🔵",
  sin_pago: "🔴",
  bloqueada: "⚪",
};

type Props = {
  table: AugmentedTable;
  selected: boolean;
  selectionMode: boolean;
  onTap: () => void;
  onLongPress: () => void;
};

export function TableMiniCard({ table, selected, selectionMode, onTap, onLongPress }: Props) {
  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.96 }}
      onClick={onTap}
      onPointerDown={(e) => {
        const t = window.setTimeout(() => {
          onLongPress();
        }, 520);
        const clear = () => {
          window.clearTimeout(t);
          window.removeEventListener("pointerup", clear);
          window.removeEventListener("pointercancel", clear);
        };
        window.addEventListener("pointerup", clear);
        window.addEventListener("pointercancel", clear);
      }}
      aria-label={`Mesa ${table.label}`}
      className={`relative flex h-[70px] min-h-[70px] w-[70px] min-w-[70px] flex-col items-center justify-center rounded-xl border-2 bg-zinc-800/60 px-1 py-1 text-center transition duration-300 ease-out touch-manipulation ${
        MESA_ESTADO_META[table.estadoUi].border
      } ${selected ? "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-zinc-950" : ""} ${
        selectionMode ? "ring-1 ring-dashed ring-white/25" : ""
      }`}
    >
      <span className="text-[11px] font-bold leading-none text-white">{table.label}</span>
      <span className="mt-0.5 text-base leading-none" aria-hidden>
        {EMOJI[table.estadoUi]}
      </span>
      <span className="mt-0.5 max-w-full truncate text-[9px] font-medium uppercase text-slate-400">
        {table.estadoUi === "disponible"
          ? "Disp"
          : table.estadoUi === "reservada"
            ? "Rese"
            : table.estadoUi === "ocupada"
              ? "Ocup"
              : table.estadoUi === "sin_pago"
                ? "SinP"
                : "Blq"}
      </span>
    </motion.button>
  );
}
