"use client";

import { useFormContext } from "react-hook-form";
import ImageUploader from "@/components/ui/ImageUploader";
import type { CreateEventWizardFormValues } from "../createEventWizardTypes";

export function CreateEventStep3Images() {
  const { watch, setValue } = useFormContext<CreateEventWizardFormValues>();

  const principal = watch("principalImageUrl");
  const banner = watch("bannerImageUrl");

  return (
    <div className="space-y-6 border-l-2 border-orange-500 pl-4">
      <div>
        <p className="mb-2 text-sm font-medium text-white">Foto principal * (vertical, app clientes)</p>
        <p className="mb-2 text-xs text-zinc-500">Recomendado 1080×1350 (4:5). Máx. 2MB · JPG, PNG, WEBP</p>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3 backdrop-blur-sm">
          <ImageUploader
            label="Subir imagen"
            onUpload={(url) => setValue("principalImageUrl", url, { shouldDirty: true, shouldValidate: true })}
            currentImage={principal}
          />
        </div>
        {!principal?.trim() && (
          <p className="mt-1 text-xs text-amber-400">Sube la foto principal para continuar</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-white">Portada / banner (horizontal)</p>
        <p className="mb-2 text-xs text-zinc-500">Recomendado 1920×600 (16:5). Opcional en ficha</p>
        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3 backdrop-blur-sm">
          <ImageUploader
            label="Subir banner"
            onUpload={(url) => setValue("bannerImageUrl", url, { shouldDirty: true })}
            currentImage={banner}
          />
        </div>
      </div>
    </div>
  );
}
