"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { TableZoneColor, WizardTableZone } from "../createEventWizardTypes";

const COLORS: { id: TableZoneColor; dot: string }[] = [
  { id: "slate", dot: "bg-slate-500" },
  { id: "purple", dot: "bg-purple-500" },
  { id: "green", dot: "bg-emerald-500" },
  { id: "red", dot: "bg-red-500" },
  { id: "yellow", dot: "bg-amber-400" },
  { id: "blue", dot: "bg-sky-500" },
];

type FormShape = WizardTableZone;

const empty: FormShape = {
  localKey: "",
  name: "",
  color: "purple",
  tableCount: 4,
  seatsPerTable: 8,
  minSpend: "",
  requiresDeposit: true,
  depositPercent: 50,
  description: "",
  inviteOnly: false,
  manualOnly: false,
};

type Props = {
  open: boolean;
  initial: WizardTableZone | null;
  onClose: () => void;
  onSave: (z: WizardTableZone) => void;
};

export function TableZoneModal({ open, initial, onClose, onSave }: Props) {
  const { register, handleSubmit, reset, watch, setValue } = useForm<FormShape>({
    defaultValues: empty,
  });
  const req = watch("requiresDeposit");

  useEffect(() => {
    if (open && initial) {
      reset({ ...empty, ...initial });
    }
  }, [open, initial, reset]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl">
        <h2 className="text-lg font-bold text-white">Nueva zona de mesas</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={handleSubmit((data) => {
            onSave({
              ...data,
              localKey: initial?.localKey || data.localKey || "",
            });
            onClose();
          })}
        >
          <input type="hidden" {...register("localKey")} />
          <div>
            <label className="text-xs text-zinc-400">Nombre de la zona *</label>
            <input
              {...register("name", { required: true })}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>

          <div>
            <p className="text-xs text-zinc-400">Color / etiqueta</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLORS.map(({ id, dot }) => (
                <button
                  key={id}
                  type="button"
                  className={`h-10 w-10 rounded-full ring-2 ring-offset-2 ring-offset-zinc-950 ${dot} ${
                    watch("color") === id ? "ring-orange-400" : "ring-transparent"
                  }`}
                  aria-label={id}
                  onClick={() => setValue("color", id, { shouldDirty: true })}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400">Número de mesas *</label>
            <input
              type="number"
              min={1}
              {...register("tableCount", { valueAsNumber: true, min: 1 })}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Capacidad por mesa *</label>
            <input
              type="number"
              min={1}
              {...register("seatsPerTable", { valueAsNumber: true, min: 1 })}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400">Consumo mínimo por mesa (RD$) *</label>
            <input
              type="number"
              step="0.01"
              {...register("minSpend", { required: true })}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" {...register("requiresDeposit")} />
            ¿Requiere anticipo?
          </label>

          {req ? (
            <div>
              <label className="text-xs text-zinc-400">% de anticipo</label>
              <input
                type="number"
                min={1}
                max={100}
                {...register("depositPercent", { valueAsNumber: true })}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
              />
            </div>
          ) : null}

          <div>
            <label className="text-xs text-zinc-400">Descripción</label>
            <textarea
              {...register("description")}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" {...register("inviteOnly")} />
            Solo invitación
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" {...register("manualOnly")} />
            Reserva manual (no online)
          </label>

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
