"use client";

import { useState } from "react";
import { createWeeklyRecurrence } from "@/lib/recurrenceApi";
import { useDashboard } from "@/contexts/DashboardContext";

type Props = {
  sourceEvent: {
    id: string;
    title: string;
    startAt: string;
  };
  onClose: () => void;
  onCreated?: () => void;
};

export default function RecurrenceModal({ sourceEvent, onClose, onCreated }: Props) {
  const { venueId } = useDashboard();
  const [weeks, setWeeks] = useState(4);
  const [copyTickets, setCopyTickets] = useState(true);
  const [publish, setPublish] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseDate = new Date(sourceEvent.startAt);
  const dowName = baseDate.toLocaleDateString("es-ES", { weekday: "long" });
  const preview: Date[] = [];
  for (let i = 1; i <= weeks; i++) {
    preview.push(new Date(baseDate.getTime() + i * 7 * 86400000));
  }

  async function submit() {
    if (!venueId) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWeeklyRecurrence(
        { sourceEventId: sourceEvent.id, weeks, copyTickets, publish },
        venueId
      );
      if (onCreated) onCreated();
      onClose();
    } catch (e) {
      setError((e as Error)?.message ?? "Error creando la serie");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111118] p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Repetir semanalmente</h2>
            <p className="mt-1 text-xs text-slate-400">
              &quot;{sourceEvent.title}&quot; · cada {dowName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 hover:border-white/30 hover:text-white"
          >
            ✕
          </button>
        </header>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              ¿Cuántas semanas? ({weeks})
            </label>
            <input
              type="range"
              min={1}
              max={24}
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full accent-[#C77DFF]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>1</span>
              <span>8</span>
              <span>16</span>
              <span>24</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={copyTickets}
                onChange={(e) => setCopyTickets(e.target.checked)}
                className="accent-[#C77DFF]"
              />
              Copiar los tipos de entrada
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={publish}
                onChange={(e) => setPublish(e.target.checked)}
                className="accent-[#C77DFF]"
              />
              Publicar las copias automáticamente
              <span className="text-xs text-slate-500">(si no, quedan en borrador)</span>
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/30 p-3">
            <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">
              Se crearán {weeks} eventos:
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {preview.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                  <span>Semana {i + 1}</span>
                  <span className="font-mono text-slate-400">
                    {d.toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          )}
        </div>

        <footer className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-white/30"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] px-4 py-2 text-sm font-semibold text-white hover:border-[#E0AAFF]/70 disabled:opacity-60"
          >
            {submitting ? "Creando…" : `Crear ${weeks} evento${weeks === 1 ? "" : "s"}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
