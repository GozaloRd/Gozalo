"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { CreateEventWizardFormValues } from "../createEventWizardTypes";

function CheckRow({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={ok ? "text-emerald-400" : "text-amber-400"}>{ok ? "✅" : "⚠️"}</span>
      <span className={ok ? "text-zinc-200" : "text-amber-200/90"}>{children}</span>
    </li>
  );
}

export function CreateEventStep6Config() {
  const { register, control } = useFormContext<CreateEventWizardFormValues>();

  const w = useWatch({ control });
  const tickets = w?.tickets || [];
  const validTickets = tickets.filter((t) => t.name?.trim() && t.price && t.quantityTotal);
  const totalQty = validTickets.reduce((a, t) => a + (parseInt(String(t.quantityTotal), 10) || 0), 0);
  const cap = w?.maxCapacity?.trim() ? parseInt(String(w.maxCapacity), 10) : NaN;

  const titleLen = (w?.title?.trim() ?? "").length;
  const basicOk = Boolean(
    w &&
      titleLen >= 3 &&
      w.shortDescription?.trim() &&
      w.startAt &&
      w.endAt &&
      new Date(w.endAt) > new Date(w.startAt)
  );
  const locOk = Boolean(
    w &&
      (w.useVenueAddress || w.address?.trim()) &&
      w.city &&
      w.lat != null &&
      w.lng != null
  );
  const imgOk = Boolean(w?.principalImageUrl?.trim());
  const ticketsOk = validTickets.length > 0 && !Number.isNaN(cap) && cap > 0;
  const tablesLine =
    w?.tablesEnabled && (w?.tableZones?.length ?? 0) > 0
      ? `Mesas (${w?.tableZones?.reduce((a, z) => a + (z.tableCount || 0), 0) ?? 0} mesas)`
      : w?.tablesEnabled
        ? "Falta definir zonas de mesa"
        : "Sin mesas";

  return (
    <div className="space-y-6 border-l-2 border-orange-500 pl-4">
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">Visibilidad</p>
        <div className="space-y-2">
          <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-200">
            <input type="radio" value="public" {...register("visibility")} className="h-4 w-4" />
            Público (visible para todos)
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-200">
            <input type="radio" value="private" {...register("visibility")} className="h-4 w-4" />
            Privado (solo con enlace; se guarda el estado en metadatos)
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-sm text-zinc-200">
            <input type="radio" value="hidden" {...register("visibility")} className="h-4 w-4" />
            Oculto (borrador, no visible)
          </label>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">Política de reembolso</p>
        <div className="space-y-2">
          <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
            <input type="radio" value="none" {...register("refundPolicy")} className="h-4 w-4" />
            No reembolsable
          </label>
          <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
            <input type="radio" value="24h" {...register("refundPolicy")} className="h-4 w-4" />
            Hasta 24h antes
          </label>
          <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
            <input type="radio" value="48h" {...register("refundPolicy")} className="h-4 w-4" />
            Hasta 48h antes
          </label>
          <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
            <input type="radio" value="custom" {...register("refundPolicy")} className="h-4 w-4" />
            Personalizada (fecha límite)
          </label>
          <input
            type="datetime-local"
            {...register("refundCustomUntil")}
            className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-zinc-400">Términos y condiciones</label>
        <textarea
          {...register("terms")}
          rows={4}
          className="w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2 text-sm text-white"
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">Notificaciones</p>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" {...register("notify24h")} className="h-4 w-4" />
          Recordatorio 24h antes
        </label>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" {...register("notify1h")} className="h-4 w-4" />
          Recordatorio 1h antes
        </label>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" {...register("notifyEmailConfirm")} className="h-4 w-4" />
          Email de confirmación al comprar
        </label>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" {...register("notifySmsConfirm")} className="h-4 w-4" />
          SMS de confirmación
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">Compartir en redes</p>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" {...register("sharePublicLink")} className="h-4 w-4" />
          Generar link público compartible
        </label>
        <label className="flex min-h-[40px] items-center gap-2 text-sm text-zinc-200">
          <input type="checkbox" {...register("shareButton")} className="h-4 w-4" />
          Botón de compartir en la página del evento
        </label>
      </div>

      <div>
        <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 px-3 py-3">
          <input type="checkbox" {...register("includeInCollage")} className="mt-1 h-4 w-4" />
          <span className="text-sm text-zinc-300">Añadir al collage público (tras el evento)</span>
        </label>
        <label className="mt-2 flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-zinc-900/50 px-3 py-3">
          <input type="checkbox" {...register("featured")} className="mt-1 h-4 w-4" />
          <span className="text-sm text-zinc-300">Destacar en página principal (solo si público)</span>
        </label>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 backdrop-blur-sm">
        <p className="mb-3 text-sm font-semibold text-white">Validación final</p>
        <ul className="space-y-2">
          <CheckRow ok={basicOk}>Información básica completa</CheckRow>
          <CheckRow ok={locOk}>Ubicación definida</CheckRow>
          <CheckRow ok={imgOk}>Imagen principal</CheckRow>
          <CheckRow ok={ticketsOk}>
            Tickets configurados
            {ticketsOk ? ` (${totalQty} entradas)` : ""}
          </CheckRow>
          <CheckRow
            ok={
              !w?.tablesEnabled ||
              (!!(w?.tableZones?.length) && w.tableZones!.every((z) => z.name?.trim()))
            }
          >
            {tablesLine}
          </CheckRow>
          <CheckRow ok>Preferencias de configuración introducidas</CheckRow>
        </ul>
      </div>
    </div>
  );
}
