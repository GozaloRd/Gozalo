"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { TableCard } from "./TableCard";
import { groupTablesByZone } from "./groupTablesByZone";
import type { PublicTable } from "./types";

/** Primer zona = primer color; el ciclo se repite si hay muchas zonas. */
const ZONE_DOT_PALETTE = [
  "bg-[#e8b86d]",
  "bg-[#f472b6]",
  "bg-[#38bdf8]",
  "bg-[#34d399]",
  "bg-[#a78bfa]",
  "bg-[#fb923c]",
  "bg-[#22d3ee]",
  "bg-[#f0abfc]",
] as const;

type Props = {
  tables: PublicTable[];
  bgColor: string;
  onTableAction: (tableId: string) => void;
  /** Estilo sobre panel translúcido (página /e) */
  tone?: "paper" | "glass";
};

export function TablesByZoneAccordion({ tables, bgColor, onTableAction, tone = "paper" }: Props) {
  const glass = tone === "glass";
  const grouped = useMemo(() => groupTablesByZone(tables), [tables]);
  const [openZone, setOpenZone] = useState<string | null>(grouped[0]?.zone ?? null);

  if (grouped.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {grouped.map(({ zone, tables: zoneTables }, zoneIndex) => {
        const isOpen = openZone === zone;
        const dotClass = ZONE_DOT_PALETTE[zoneIndex % ZONE_DOT_PALETTE.length];
        return (
          <div
            key={zone}
            className={
              glass
                ? "overflow-hidden rounded-[14px] border border-white/12 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                : "overflow-hidden rounded-[12px] border border-neutral-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            }
          >
            <button
              type="button"
              onClick={() => setOpenZone(isOpen ? null : zone)}
              className={
                glass
                  ? "flex w-full items-center justify-between gap-2 bg-white/[0.05] px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
                  : "flex w-full items-center justify-between gap-2 bg-neutral-50 px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-100/90"
              }
              aria-expanded={isOpen}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.22)] ${dotClass}`}
                  aria-hidden
                />
                <span
                  className={`min-w-0 truncate text-[13px] font-semibold uppercase tracking-[0.06em] ${glass ? "text-white" : "text-neutral-900"}`}
                >
                  {zone}
                </span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 transition-transform duration-200 ${glass ? "text-white" : "text-neutral-500"} ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen ? (
              <div
                className={
                  glass
                    ? "space-y-1.5 border-t border-white/10 bg-black/25 px-2 py-2"
                    : "space-y-1.5 border-t border-neutral-200/80 bg-[#fafafa] px-2 py-2"
                }
              >
                {zoneTables.map((table, index) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    bgColor={bgColor}
                    index={index}
                    variant="light"
                    tone={tone}
                    onClick={() => onTableAction(table.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
