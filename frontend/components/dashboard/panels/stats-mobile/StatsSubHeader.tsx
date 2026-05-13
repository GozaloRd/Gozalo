"use client";

import { ChevronLeft } from "lucide-react";

export function StatsSubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
      <button
        type="button"
        onClick={onBack}
        className="shrink-0 rounded-lg p-2 text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
        aria-label="Volver"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{title}</h2>
    </div>
  );
}
