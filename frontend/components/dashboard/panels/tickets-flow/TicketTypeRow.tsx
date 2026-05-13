"use client";

import { formatMoney } from "@/lib/format";
import {
  type TicketTypeInput,
  type TicketUiStatus,
  previousTypeInQueue,
  uiStatusForType,
} from "@/lib/ticketQueueLogic";

const badges: Record<
  TicketUiStatus,
  { label: string; dot: string; bar: string; text: string }
> = {
  activo: {
    label: "ACTIVO",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    text: "text-emerald-400",
  },
  en_cola: {
    label: "EN COLA",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    text: "text-amber-400",
  },
  agotado: {
    label: "AGOTADO",
    dot: "bg-red-500",
    bar: "bg-red-500",
    text: "text-red-400",
  },
  inactivo: {
    label: "INACTIVO",
    dot: "bg-zinc-500",
    bar: "bg-zinc-500",
    text: "text-zinc-400",
  },
};

const emojiRank = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

type Props = {
  index: number;
  mode: string | undefined;
  tt: TicketTypeInput;
  allTypes: TicketTypeInput[];
};

export function TicketTypeRow({ index, mode, tt, allTypes }: Props) {
  const status = uiStatusForType(mode, tt, allTypes);
  const b = badges[status];
  const sold = tt.soldCount ?? 0;
  const cap = tt.quantityTotal ?? 0;
  const pct = cap > 0 ? Math.min(100, Math.round((sold / cap) * 100)) : sold > 0 ? 100 : 0;
  const rev = Number(tt.price || 0) * sold;
  const prev = previousTypeInQueue(tt, allTypes);
  const queueHint =
    status === "en_cola" && prev ? `Inicia al agotarse ${prev.name}` : status === "en_cola" ? "En cola de venta" : null;

  return (
    <li className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-base" aria-hidden>
            {emojiRank[index] ?? `${index + 1}.`}
          </span>
          <span className={`h-2 w-2 shrink-0 rounded-full ${b.dot}`} aria-hidden />
          <span className="min-w-0 truncate font-medium text-white">{tt.name}</span>
        </div>
        <span className={`shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase ${b.text}`}>
          {b.label}
        </span>
      </div>
      <p className="mt-1 pl-7 text-xs text-slate-400">{formatMoney(Number(tt.price || 0))}</p>
      <div className="mt-2 pl-7">
        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span className="tabular-nums">
            {sold}/{cap || "∞"} ({pct}%)
          </span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-[11px] text-emerald-200/90">
          💰 {formatMoney(rev)} generados
        </p>
        {queueHint ? (
          <p className="mt-1 text-[11px] text-amber-200/80">⏳ {queueHint}</p>
        ) : null}
      </div>
    </li>
  );
}
