"use client";

import { formatMoney } from "@/lib/format";
import type { CreateEventWizardFormValues } from "../createEventWizardTypes";

type Props = {
  open: boolean;
  values: CreateEventWizardFormValues | null;
  onClose: () => void;
};

export function EventPreviewModal({ open, values, onClose }: Props) {
  if (!open || !values) return null;

  const cover = values.principalImageUrl?.trim();
  const banner = values.bannerImageUrl?.trim();

  return (
    <div
      className="fixed inset-0 z-[320] flex flex-col bg-black/90 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del evento"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-white">Vista previa</p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-lg px-4 text-sm text-orange-300"
        >
          Cerrar
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" className="h-36 w-full object-cover" />
        ) : null}
        <div className="px-4 py-4">
          <div className="flex gap-4">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt=""
                className="h-28 w-24 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div className="h-28 w-24 shrink-0 rounded-xl bg-zinc-800" />
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold leading-tight text-white">
                {values.title || "Sin título"}
              </h1>
              <p className="mt-1 text-xs text-zinc-500">{values.category}</p>
              <p className="mt-2 text-sm text-zinc-300">{values.shortDescription}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            {values.city} · {values.startAt ? new Date(values.startAt).toLocaleString("es-DO") : "—"}
          </p>
          <div className="mt-6 space-y-2">
            <p className="text-xs font-medium uppercase text-zinc-500">Entradas</p>
            {values.tickets
              .filter((t) => t.name.trim())
              .map((t) => (
                <div
                  key={t.localKey}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm"
                >
                  <span className="text-zinc-200">{t.name}</span>
                  <span className="font-semibold text-white">
                    {formatMoney(parseFloat(t.price) || 0)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
