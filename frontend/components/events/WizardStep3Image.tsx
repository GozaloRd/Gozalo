"use client";

import { ImagePlus } from "lucide-react";
import type { EventWizardDraft } from "./types";

export function WizardStep3Image({
  draft,
  onChange,
}: {
  draft: EventWizardDraft;
  onChange: (patch: Partial<EventWizardDraft>) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <p className="mb-2 text-sm text-white/60">URL del flyer (demo)</p>
        <input
          value={draft.flyerUrl}
          onChange={(e) => onChange({ flyerUrl: e.target.value })}
          placeholder="https://..."
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
        />
      </label>

      <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20 bg-white/5 text-center transition hover:border-orange-500/50 hover:bg-orange-500/5">
        <ImagePlus className="h-10 w-10 text-white/30" />
        <p className="text-sm text-white/70">Arrastra tu flyer aqui o haz clic para subir</p>
        <p className="text-xs text-white/40">PNG, JPG o WEBP - Max. 5MB - Recomendado 1080x1080</p>
        <button type="button" className="rounded-lg border border-orange-400/50 px-3 py-1.5 text-sm text-orange-300">
          Seleccionar archivo
        </button>
      </div>

      {draft.flyerUrl ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <img src={draft.flyerUrl} alt="Preview flyer" className="mx-auto max-h-56 rounded-xl object-contain" />
        </div>
      ) : null}

      <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 text-xs text-white/60">
        <p className="mb-2 font-semibold text-orange-300">Tip</p>
        <ul className="space-y-1">
          <li>- Usa alto contraste y titulo grande.</li>
          <li>- Evita texto muy pequeno en el flyer.</li>
          <li>- Mantén informacion clave en el centro.</li>
        </ul>
      </div>
    </div>
  );
}
