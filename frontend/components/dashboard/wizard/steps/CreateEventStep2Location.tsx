"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { CITIES_RD } from "@/lib/constants";
import type { CreateEventWizardFormValues } from "../createEventWizardTypes";

const LocationMapPicker = dynamic(
  () => import("../LocationMapPicker").then((m) => m.LocationMapPicker),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse rounded-2xl bg-zinc-800" /> }
);

type Props = {
  venueName?: string;
  venueAddress?: string;
  venueCity?: string;
};

export function CreateEventStep2Location({ venueName, venueAddress, venueCity }: Props) {
  const { register, watch, setValue, formState: { errors } } =
    useFormContext<CreateEventWizardFormValues>();

  const useVenue = watch("useVenueAddress");
  const lat = watch("lat");
  const lng = watch("lng");

  useEffect(() => {
    if (useVenue && venueAddress) {
      setValue("address", venueAddress, { shouldDirty: true });
    }
    if (useVenue && venueCity) {
      setValue("city", venueCity, { shouldDirty: true });
    }
  }, [useVenue, venueAddress, venueCity, setValue]);

  return (
    <div className="space-y-4 border-l-2 border-orange-500 pl-4">
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 px-3 py-3 backdrop-blur-sm">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 rounded border-white/20"
          {...register("useVenueAddress")}
        />
        <span className="text-sm text-zinc-200">
          <span className="font-semibold text-white">Usar dirección del local</span>
          {venueName ? (
            <span className="mt-0.5 block text-xs text-zinc-500">
              {venueName}
              {venueAddress ? ` — ${venueAddress}` : ""}
            </span>
          ) : null}
        </span>
      </label>

      <p className="text-center text-[11px] text-zinc-600">— O ingresa otra ubicación —</p>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Dirección *</label>
        <input
          {...register("address")}
          disabled={!!useVenue}
          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50 disabled:opacity-60"
          placeholder="Calle, número, sector…"
        />
        {errors.address && (
          <p className="mt-1 text-xs text-amber-400">{errors.address.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Ciudad *</label>
        <select
          {...register("city")}
          disabled={!!useVenue}
          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-base text-white outline-none backdrop-blur-sm focus:border-orange-500/50 disabled:opacity-60"
        >
          {CITIES_RD.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-zinc-400">Mapa interactivo</p>
        <LocationMapPicker
          lat={lat}
          lng={lng}
          onChange={(la, lg) => {
            setValue("lat", la, { shouldDirty: true });
            setValue("lng", lg, { shouldDirty: true });
          }}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Referencia / instrucciones</label>
        <textarea
          {...register("locationNotes")}
          rows={3}
          className="min-h-[88px] w-full resize-none rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-sm text-white outline-none backdrop-blur-sm focus:border-orange-500/50"
          placeholder="Ej. Entrada por la parte lateral…"
        />
      </div>
    </div>
  );
}
