"use client";

import { useState } from "react";
import { X } from "lucide-react";

export function RefundModal({
  open,
  orderLabel,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  orderLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 px-3 pb-8 pt-16 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refund-modal-title"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Cerrar" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 id="refund-modal-title" className="text-base font-semibold text-white">
              Reembolsar orden
            </h2>
            <p className="mt-1 text-xs text-slate-400">{orderLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="block text-xs font-medium text-slate-400" htmlFor="refund-reason">
          Motivo (visible para el cliente en el correo)
        </label>
        <textarea
          id="refund-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          placeholder="Ej. solicitud del cliente, evento cancelado…"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-600 py-2.5 text-sm font-medium text-white/90 hover:bg-white/[0.04]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => void onConfirm(reason.trim())}
            className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-40"
          >
            {busy ? "Procesando…" : "Confirmar reembolso"}
          </button>
        </div>
      </div>
    </div>
  );
}
