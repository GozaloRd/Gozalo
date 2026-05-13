"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { WizardBottomBar } from "./WizardBottomBar";
import { WizardProgressBar } from "./WizardProgressBar";
import { DEFAULT_WIZARD_DRAFT } from "./constants";
import type { EventWizardDraft } from "./types";
import { WizardStep1Basic } from "./WizardStep1Basic";
import { WizardStep2Location } from "./WizardStep2Location";
import { WizardStep3Image } from "./WizardStep3Image";
import { WizardStep4Tickets } from "./WizardStep4Tickets";
import { WizardStep5Tables } from "./WizardStep5Tables";
import { WizardStep6Review } from "./WizardStep6Review";

type SlideDir = "forward" | "back";
const STEP_TITLES = [
  "Informacion basica",
  "Ubicacion",
  "Imagen y flyer",
  "Tipos de entrada",
  "Mesas y zonas VIP",
  "Revisar y publicar",
];

export function CreateEventWizard({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState<SlideDir>("forward");
  const [draft, setDraft] = useState<EventWizardDraft>(DEFAULT_WIZARD_DRAFT);

  const stepTitle = STEP_TITLES[step - 1] ?? "Crear evento";
  const total = 6;

  function onBack() {
    if (step === 1) {
      onExit();
      return;
    }
    setDir("back");
    setStep((v) => Math.max(1, v - 1));
  }

  function onNext() {
    if (step === total) {
      onExit();
      return;
    }
    setDir("forward");
    setStep((v) => Math.min(total, v + 1));
  }

  const body = useMemo(() => {
    const onChange = (patch: Partial<EventWizardDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
    if (step === 1) return <WizardStep1Basic draft={draft} onChange={onChange} />;
    if (step === 2) return <WizardStep2Location draft={draft} onChange={onChange} />;
    if (step === 3) return <WizardStep3Image draft={draft} onChange={onChange} />;
    if (step === 4) return <WizardStep4Tickets draft={draft} onChange={onChange} />;
    if (step === 5) return <WizardStep5Tables draft={draft} onChange={onChange} />;
    return <WizardStep6Review draft={draft} onChange={onChange} />;
  }, [draft, step]);

  return (
    <div className="flex min-h-0 flex-col">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={onBack} className="text-sm text-white/70 transition hover:text-white">
            ← Atras
          </button>
          <h2 className="text-base font-semibold text-white">{stepTitle}</h2>
          <div className="text-right text-sm text-white/60">
            <p className="text-orange-400">Ver vista previa</p>
            <p>
              {step}/{total}
            </p>
          </div>
        </div>

        <WizardProgressBar step={step} total={total} />
      </div>

      <div className="mt-6 min-h-[420px]">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ x: dir === "forward" ? "100%" : "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir === "forward" ? "-100%" : "100%", opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {body}
          </motion.div>
        </AnimatePresence>
      </div>

      <WizardBottomBar step={step} total={total} onBack={onBack} onNext={onNext} />
    </div>
  );
}
