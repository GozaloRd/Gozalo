"use client";

import { ArrowLeft } from "lucide-react";

export function AccessDetailHeader({
  onBack,
  itemTitle,
  eventLine,
}: {
  onBack: () => void;
  itemTitle: string;
  /** Ya formateado con `formatAccessEventLine` */
  eventLine: string;
}) {
  return (
    <div className="space-y-2 border-b border-zinc-800 pb-3">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-0 py-1 text-left text-sm font-medium text-white transition hover:text-blue-200"
      >
        <ArrowLeft className="h-5 w-5 shrink-0 text-blue-400" aria-hidden />
        <span>{itemTitle}</span>
      </button>
      <p className="pl-7 text-xs leading-snug text-zinc-400">{eventLine}</p>
    </div>
  );
}
