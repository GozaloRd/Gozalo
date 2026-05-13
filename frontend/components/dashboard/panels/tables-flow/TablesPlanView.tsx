"use client";

import type { AugmentedTable } from "@/lib/tableFlowLogic";

type Props = {
  tables: AugmentedTable[];
  onSelectTable: (t: AugmentedTable) => void;
};

export function TablesPlanView({ tables, onSelectTable }: Props) {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-zinc-950/90"
      aria-label="Plano de mesas"
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(circle_at_30%_20%,#fff_0,transparent_45%),radial-gradient(circle_at_70%_80%,#fff_0,transparent_40%)]" />
      {tables.map((t) => (
        <button
          key={t.id}
          type="button"
          style={{
            left: `${Math.min(96, Math.max(4, Number(t.posX) || 50))}%`,
            top: `${Math.min(96, Math.max(4, Number(t.posY) || 50))}%`,
            transform: "translate(-50%, -50%)",
          }}
          className="absolute flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-emerald-500/35 bg-zinc-900/95 px-2 py-1 text-[11px] font-bold text-white shadow-lg transition hover:border-emerald-400/60 active:scale-95"
          onClick={() => onSelectTable(t)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
