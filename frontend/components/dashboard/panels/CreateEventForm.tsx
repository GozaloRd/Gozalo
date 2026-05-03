"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EventWizard } from "@/components/dashboard/EventWizard";
import { MOBILE_AREA_BORDER_L } from "@/components/dashboard/mobile/shared/mobileAreaTokens";
import { TableLayoutEditor, type TableLayoutSlot } from "@/components/dashboard/panels/TableLayoutEditor";

type Props = {
  open: boolean;
  onClose: () => void;
  venueId: string;
  venueCity?: string;
  /** Tras publicar o guardar borrador desde el asistente. */
  onEventSaved: () => void;
};

/**
 * Modal pantalla completa: reutiliza `EventWizard` (API real).
 * `TableLayoutEditor` es boceto visual de plano; la configuración persistida de mesas sigue en el asistente (paso mesas).
 */
export function CreateEventForm({ open, onClose, venueId, venueCity, onEventSaved }: Props) {
  const [mounted, setMounted] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [layoutDraft, setLayoutDraft] = useState<TableLayoutSlot[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setShowGrid(false);
      setLayoutDraft([]);
    }
  }, [open]);

  if (!mounted || !open) return null;

  const modal = (
    <div
      className={`fixed inset-0 z-[200] flex flex-col bg-[#0A0A0F] ${MOBILE_AREA_BORDER_L.eventos}`}
      role="presentation"
    >
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10 pt-4">
        <EventWizard
          embedded
          venueId={venueId}
          venueCity={venueCity}
          initial={null}
          onClose={onClose}
          onSaved={onEventSaved}
        />

        <div className="mt-8 border-t border-white/[0.08] pt-6">
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-white/[0.1] bg-zinc-900/90 px-4 py-3 text-left text-sm font-medium text-white backdrop-blur-sm"
          >
            <span>Plano de mesas (vista en cuadrícula)</span>
            {showGrid ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showGrid ? (
            <div className="mt-3">
              <TableLayoutEditor enabled value={layoutDraft} onChange={setLayoutDraft} />
              <p className="mt-2 text-xs text-slate-500">
                Boceto local. Las mesas reservables oficiales se configuran en el paso «Mesas» del asistente.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
