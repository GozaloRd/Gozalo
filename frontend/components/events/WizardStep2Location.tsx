"use client";

import { MapPin } from "lucide-react";
import { RD_CITIES } from "./constants";
import type { EventWizardDraft } from "./types";

export function WizardStep2Location({
  draft,
  onChange,
}: {
  draft: EventWizardDraft;
  onChange: (patch: Partial<EventWizardDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nombre del lugar *">
        <input
          value={draft.venueName}
          onChange={(e) => onChange({ venueName: e.target.value })}
          placeholder="Ej. Vagabunda Club"
          className="w-full rounded-xl border border-white/10 border-l-2 border-l-orange-500 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
        />
      </Field>
      <Field label="Direccion *">
        <input
          value={draft.address}
          onChange={(e) => onChange({ address: e.target.value })}
          placeholder="Calle, numero, ciudad"
          className="w-full rounded-xl border border-white/10 border-l-2 border-l-orange-500 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
        />
      </Field>
      <Field label="Ciudad *">
        <select
          value={draft.city}
          onChange={(e) => onChange({ city: e.target.value })}
          className="w-full rounded-xl border border-white/10 border-l-2 border-l-orange-500 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500/60"
        >
          {RD_CITIES.map((city) => (
            <option key={city} value={city} className="bg-[#0d0d0d]">
              {city}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Referencia (opcional)">
        <input
          value={draft.reference}
          onChange={(e) => onChange({ reference: e.target.value })}
          placeholder="Cerca de..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
        />
      </Field>
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-white/40">
        <MapPin className="h-8 w-8 text-white/20" />
        <p>Vista previa del mapa</p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-1 text-sm text-white/60">{label}</p>
      {children}
    </label>
  );
}
