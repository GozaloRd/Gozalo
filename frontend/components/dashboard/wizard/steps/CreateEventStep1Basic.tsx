"use client";

import { useFormContext } from "react-hook-form";
import { EVENT_WIZARD_GENRES, MIN_AGE_OPTIONS } from "../createEventWizardTypes";
import type { CreateEventWizardFormValues } from "../createEventWizardTypes";
export function CreateEventStep1Basic() {
  const {
    register,
    formState: { errors },
    watch,
  } = useFormContext<CreateEventWizardFormValues>();

  const shortLen = watch("shortDescription")?.length ?? 0;

  return (
    <div className="space-y-4 border-l-2 border-orange-500 pl-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Nombre del evento *</label>
        <input
          {...register("title")}
          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
          placeholder="Ej. LOST IN TIME"
          autoComplete="off"
          aria-invalid={errors.title ? "true" : "false"}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-amber-400">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">
          Descripción corta * <span className="text-zinc-600">({shortLen}/150)</span>
        </label>
        <textarea
          {...register("shortDescription")}
          rows={3}
          maxLength={150}
          className="min-h-[88px] w-full resize-none rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
          placeholder="Una línea que enganche…"
        />
        {errors.shortDescription && (
          <p className="mt-1 text-xs text-amber-400">{errors.shortDescription.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Descripción completa (opcional)</label>
        <textarea
          {...register("fullDescription")}
          rows={5}
          className="min-h-[120px] w-full resize-y rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
          placeholder="Detalle para la ficha pública (texto plano por ahora)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Fecha y hora inicio *</label>
          <input
            type="datetime-local"
            {...register("startAt")}
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
          />
          {errors.startAt && (
            <p className="mt-1 text-xs text-amber-400">{String(errors.startAt.message)}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-400">Fecha y hora fin *</label>
          <input
            type="datetime-local"
            {...register("endAt")}
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
          />
          {errors.endAt && (
            <p className="mt-1 text-xs text-amber-400">{errors.endAt.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Categoría / género</label>
        <select
          {...register("category")}
          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
        >
          {EVENT_WIZARD_GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Edad mínima</label>
        <select
          {...register("minAge")}
          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
        >
          {MIN_AGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

    </div>
  );
}
