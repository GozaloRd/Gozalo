"use client";

import { Save } from "lucide-react";

export function WizardBottomBar({
  step,
  total,
  onBack,
  onNext,
}: {
  step: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const isLast = step === total;
  return (
    <div className="sticky bottom-0 z-20 mt-8 border-t border-white/10 bg-[#0d0d0d] px-8 py-4">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-white/10 px-6 py-3 text-white transition hover:bg-white/15"
        >
          ← Atras
        </button>
        <div className="flex items-center gap-2 text-white/30">
          <button
            type="button"
            title="Guardar borrador"
            className="rounded-xl bg-white/10 p-3 text-white/70 transition hover:bg-white/15"
          >
            <Save className="h-4 w-4" />
          </button>
          <span className="text-xs">Borrador sin guardar en servidor</span>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="rounded-xl bg-orange-500 px-8 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          {isLast ? "Publicar evento ✓" : "Siguiente →"}
        </button>
      </div>
    </div>
  );
}
