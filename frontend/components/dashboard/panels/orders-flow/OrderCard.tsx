"use client";

import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown } from "lucide-react";
import type { DashboardOrderRow } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";
import {
  deriveUiStatus,
  orderKind,
  orderVenueNetTotal,
  statusClasses,
  type UiOrderStatus,
} from "@/components/dashboard/panels/orders-flow/orderUi";

const statusEmoji: Record<UiOrderStatus, string> = {
  completed: "✅",
  pending: "⏳",
  processing: "🔄",
  cancelled: "❌",
  refunded: "↩️",
  failed: "⚠️",
};

function kindEmoji(kind: ReturnType<typeof orderKind>) {
  switch (kind) {
    case "ticket":
      return "🎟️";
    case "mesa":
      return "🪑";
    case "bar":
      return "🍹";
    case "combo":
      return "📦";
    case "cortesia":
      return "🎁";
    default:
      return "📦";
  }
}

function methodLabel(m: string) {
  if (m === "card") return "💳 Tarjeta";
  if (m === "cash") return "💵 Efectivo";
  if (m === "transfer") return "🏦 Transferencia";
  return m || "Otro";
}

function channelLabel(order: DashboardOrderRow) {
  const web =
    order.type === "tickets" ||
    order.type === "mixed" ||
    (order.tickets?.length ?? 0) > 0;
  return web ? "🌐 Web" : "🖥️ POS";
}

export function OrderCard({
  order,
  expanded,
  onToggle,
}: {
  order: DashboardOrderRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const ui = deriveUiStatus(order);
  const kind = orderKind(order);
  const netoLocal = orderVenueNetTotal(order);
  const subtotalOrd = Number(order.subtotal ?? 0);
  const totalOrd = Number(order.total ?? subtotalOrd);
  const pay = (order.payments ?? []).find((p) => p.status === "completed");
  const created = new Date(order.createdAt);
  const shortId = String(order.id).slice(0, 8);

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-700/90 bg-zinc-800/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full min-h-[52px] items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
        aria-expanded={expanded}
        aria-label={`Orden ${order.id}, ${expanded ? "contraer" : "expandir"}`}
      >
        <span className={`shrink-0 text-base ${statusClasses(ui)}`} aria-hidden>
          {statusEmoji[ui]}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-white">
              #{shortId.toUpperCase()}
            </p>
            <p className="shrink-0 text-sm font-bold tabular-nums text-emerald-300">
              {formatMoney(netoLocal)}
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {order.user?.fullName ?? "Cliente"} · {kindEmoji(kind)}{" "}
            {order.event?.title ?? "Sin evento"} ·{" "}
            {formatDistanceToNow(created, { addSuffix: true, locale: es })}
          </p>
        </div>
        <ChevronDown
          className={`mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="border-t border-white/[0.06] px-3 pb-3 pt-2 text-sm">
          <section className="space-y-1 border-b border-white/[0.06] pb-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Cliente</p>
            <p className="text-white">{order.user?.fullName ?? "—"}</p>
            <p className="text-slate-400">{order.user?.phone ?? "—"}</p>
            <p className="text-slate-400">{order.user?.email ?? "—"}</p>
          </section>

          <section className="mt-3 space-y-2 border-b border-white/[0.06] pb-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Productos</p>
            <ul className="space-y-2">
              {(order.items ?? []).map((line, idx) => (
                <li key={idx} className="flex justify-between gap-2 text-xs">
                  <span className="min-w-0 text-slate-300">
                    {kindEmoji(kind)} {line.product?.name ?? "Producto"}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-400">
                    {line.quantity} × {formatMoney(Number(line.unitPrice ?? line.lineTotal))} ={" "}
                    {formatMoney(Number(line.lineTotal))}
                  </span>
                </li>
              ))}
              {(order.tickets ?? []).map((t) => (
                <li key={t.id} className="flex justify-between gap-2 text-xs">
                  <span className="min-w-0 text-slate-300">
                    🎟️ {t.ticketType}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-400">{formatMoney(Number(t.unitPrice))}</span>
                </li>
              ))}
              {(order.items?.length ?? 0) === 0 && (order.tickets?.length ?? 0) === 0 ? (
                <li className="text-xs text-slate-500">Sin líneas detalladas.</li>
              ) : null}
            </ul>
          </section>

          <section className="mt-3 space-y-1 border-b border-white/[0.06] pb-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Pago</p>
            <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
              <span className="text-slate-500">Subtotal</span>
              <span className="tabular-nums text-slate-200">{formatMoney(subtotalOrd)}</span>
              <span className="text-slate-500">Total</span>
              <span className="tabular-nums text-emerald-300">{formatMoney(totalOrd)}</span>
              <span className="text-slate-500">Ingreso</span>
              <span className="tabular-nums text-white">{formatMoney(netoLocal)}</span>
              <span className="text-slate-500">Método</span>
              <span>{pay ? methodLabel(String(pay.method)) : "—"}</span>
            </div>
          </section>

          <section className="mt-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Info</p>
            <p className="text-xs text-slate-300">
              Fecha: {format(created, "d MMM yyyy, HH:mm", { locale: es })}
            </p>
            <p className="text-xs text-slate-300">Canal: {channelLabel(order)}</p>
            <p className="text-xs text-slate-300">Evento: {order.event?.title ?? "—"}</p>
          </section>
        </div>
      ) : null}
    </div>
  );
}
