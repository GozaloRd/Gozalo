"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CreateEventWizard } from "@/components/dashboard/wizard/CreateEventWizard";
import { StarryBackground } from "@/components/dashboard/StarryBackground";
import { MOBILE_AREA_BORDER_L } from "@/components/dashboard/mobile/shared/mobileAreaTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  venueId: string;
  venueCity?: string;
  venueName?: string;
  venueAddress?: string;
  onEventSaved: () => void;
};

/** Modal pantalla completa: asistente móvil de 6 pasos (API real). */
export function CreateEventForm({
  open,
  onClose,
  venueId,
  venueCity,
  venueName,
  venueAddress,
  onEventSaved,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  const modal = (
    <div
      data-prevent-dashboard-collapse
      className={`fixed inset-0 z-[200] flex flex-col bg-[#0A0A0F] ${MOBILE_AREA_BORDER_L.eventos}`}
      role="presentation"
    >
      <StarryBackground />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <CreateEventWizard
          embedded
          venueId={venueId}
          venueCity={venueCity}
          venueName={venueName}
          venueAddress={venueAddress ?? ""}
          initial={null}
          onClose={onClose}
          onSaved={onEventSaved}
        />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
