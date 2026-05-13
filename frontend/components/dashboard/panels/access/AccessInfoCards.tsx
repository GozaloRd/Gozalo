"use client";

import { ScanLine, TrendingUp, Users } from "lucide-react";
import type { MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";

type OccSnapshot = {
  venueCapacity: number;
  successfulScans: number;
} | null;

export function AccessInfoCards({
  stats,
  occupancyRest,
  sessionQrBump,
}: {
  stats: MobileStats | null;
  occupancyRest: OccSnapshot;
  sessionQrBump: number;
}) {
  const occ = stats?.occupancy;
  const cap = occ?.maxCapacity ?? occupancyRest?.venueCapacity ?? 0;
  const inside = occ?.currentAttendees ?? 0;
  const scans = occupancyRest?.successfulScans ?? null;
  const ratio = cap > 0 ? Math.min(100, Math.round((inside / cap) * 1000) / 10) : null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 text-center backdrop-blur-sm">
        <Users className="mx-auto h-5 w-5 text-blue-400" aria-hidden />
        <p className="mt-1 text-[10px] uppercase text-slate-500">Aforo en vivo</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
          {inside} / {cap || "—"}
        </p>
        {ratio != null ? <p className="text-[10px] text-slate-500">{ratio.toFixed(1)}%</p> : null}
      </div>
      <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 text-center backdrop-blur-sm">
        <ScanLine className="mx-auto h-5 w-5 text-blue-400" aria-hidden />
        <p className="mt-1 text-[10px] uppercase text-slate-500">QR validados</p>
        <p className="mt-0.5 text-lg font-bold tabular-nums text-white">{scans ?? "—"}</p>
        <p className="inline-flex items-center justify-center gap-0.5 text-[10px] text-emerald-400/90">
          <TrendingUp className="h-3 w-3" aria-hidden />
          {sessionQrBump > 0 ? `+${sessionQrBump} en sesión` : "En vivo en acceso"}
        </p>
      </div>
    </div>
  );
}
