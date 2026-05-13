"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { WizardTicketDraft } from "../createEventWizardTypes";

type FormShape = WizardTicketDraft;

const defaultValues: FormShape = {
  localKey: "",
  name: "",
  price: "",
  quantityTotal: "",
  description: "",
  showQuantityPublic: true,
  showBeforeActive: false,
  saleStartMode: "immediate",
  saleStartHoursBefore: "48",
  saleStartAt: "",
  saleEndMode: "until_sold_out",
  saleEndSoldCount: "",
  saleEndAt: "",
  queueUi: "active",
};

type Props = {
  open: boolean;
  initial: WizardTicketDraft | null;
  onClose: () => void;
  onSave: (row: WizardTicketDraft) => void;
};

export function TicketTypeModal({ open, initial, onClose, onSave }: Props) {
  const { register, handleSubmit, reset } = useForm<FormShape>({ defaultValues });

  useEffect(() => {
    if (open && initial) {
      reset({ ...defaultValues, ...initial, localKey: initial.localKey });
    }
  }, [open, initial, reset]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl">
        <h2 id="ticket-modal-title" className="text-lg font-bold text-white">
          {initial?.name ? "Editar tipo de ticket" : "Nuevo tipo de ticket"}
        </h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={handleSubmit((data) => {
            onSave({ ...data, localKey: initial?.localKey || data.localKey });
            onClose();
          })}
        >
          <input type="hidden" {...register("localKey")} />
          <div>
            <label className="text-xs text-zinc-400">Nombre *</label>
            <input
              {...register("name", { required: true })}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Precio (RD$) *</label>
            <input
              type="number"
              step="0.01"
              {...register("price", { required: true })}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Cantidad disponible *</label>
            <input
              type="number"
              {...register("quantityTotal", { required: true })}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Descripción</label>
            <textarea
              {...register("description")}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-zinc-400">Inicio de venta</legend>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="radio" value="immediate" {...register("saleStartMode")} />
              Inmediato al publicar
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="radio" value="after_previous" {...register("saleStartMode")} />
              Activar al agotar el anterior
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="radio" value="hours_before_event" {...register("saleStartMode")} />
              Activar X horas antes del evento
            </label>
            <input
              type="number"
              {...register("saleStartHoursBefore")}
              className="ml-6 w-24 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="radio" value="scheduled" {...register("saleStartMode")} />
              Programar fecha
            </label>
            <input
              type="datetime-local"
              {...register("saleStartAt")}
              className="ml-6 min-h-[40px] w-full max-w-xs rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white"
            />
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-zinc-400">Fin de venta</legend>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="radio" value="until_sold_out" {...register("saleEndMode")} />
              Hasta agotar
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="radio" value="until_sold_count" {...register("saleEndMode")} />
              Hasta cierto número vendido
            </label>
            <input
              type="number"
              {...register("saleEndSoldCount")}
              className="ml-6 w-28 rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input type="radio" value="until_date" {...register("saleEndMode")} />
              Hasta fecha
            </label>
            <input
              type="datetime-local"
              {...register("saleEndAt")}
              className="ml-6 min-h-[40px] w-full max-w-xs rounded-lg border border-white/10 bg-zinc-900 px-2 py-1 text-sm text-white"
            />
          </fieldset>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" {...register("showBeforeActive")} />
            Mostrar en página pública antes de activarse
          </label>

          <fieldset className="space-y-1">
            <legend className="text-xs text-zinc-500">Estado inicial (visual)</legend>
            <select {...register("queueUi")} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white">
              <option value="active">Activo</option>
              <option value="queued">En cola</option>
              <option value="last_chance">Last chance</option>
            </select>
          </fieldset>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] flex-1 rounded-xl border border-white/15 py-2 text-sm font-semibold text-zinc-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-2 text-sm font-semibold text-white"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
