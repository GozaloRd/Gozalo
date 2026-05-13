"use client";

import { CATEGORY_OPTIONS, MIN_AGE_OPTIONS } from "./constants";
import type { EventWizardDraft } from "./types";

export function WizardStep1Basic({
  draft,
  onChange,
}: {
  draft: EventWizardDraft;
  onChange: (patch: Partial<EventWizardDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Nombre del evento *">
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Ej. LOST IN TIME"
          className="w-full rounded-xl border border-white/10 border-l-2 border-l-orange-500 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
        />
      </Field>
      <Field label={`Descripcion corta * (${draft.shortDescription.length}/150)`}>
        <textarea
          value={draft.shortDescription}
          maxLength={150}
          onChange={(e) => onChange({ shortDescription: e.target.value })}
          placeholder="Una linea que enganche..."
          rows={3}
          className="w-full rounded-xl border border-white/10 border-l-2 border-l-orange-500 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
        />
      </Field>
      <Field label="Descripcion completa (opcional)">
        <textarea
          value={draft.fullDescription}
          onChange={(e) => onChange({ fullDescription: e.target.value })}
          placeholder="Detalle para la ficha publica (texto plano por ahora)"
          rows={5}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
        />
      </Field>
      <Field label="Fecha y hora inicio *">
        <input
          type="datetime-local"
          value={draft.startAt}
          onChange={(e) => onChange({ startAt: e.target.value })}
          className="w-full rounded-xl border border-white/10 border-l-2 border-l-orange-500 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500/60"
        />
      </Field>
      <Field label="Fecha y hora fin *">
        <input
          type="datetime-local"
          value={draft.endAt}
          onChange={(e) => onChange({ endAt: e.target.value })}
          className="w-full rounded-xl border border-white/10 border-l-2 border-l-orange-500 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500/60"
        />
      </Field>
      <Field label="Categoria / genero">
        <select
          value={draft.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500/60"
        >
          {CATEGORY_OPTIONS.map((row) => (
            <option key={row} value={row} className="bg-[#0d0d0d]">
              {row}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Edad minima">
        <select
          value={draft.minimumAge}
          onChange={(e) => onChange({ minimumAge: e.target.value })}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500/60"
        >
          {MIN_AGE_OPTIONS.map((row) => (
            <option key={row} value={row} className="bg-[#0d0d0d]">
              {row}
            </option>
          ))}
        </select>
      </Field>
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
