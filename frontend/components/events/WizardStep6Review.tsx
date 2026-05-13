"use client";

import type { EventWizardDraft } from "./types";

export function WizardStep6Review({
  draft,
  onChange,
}: {
  draft: EventWizardDraft;
  onChange: (patch: Partial<EventWizardDraft>) => void;
}) {
  const checks = [
    { label: "Informacion basica", ok: Boolean(draft.title && draft.startAt && draft.endAt && draft.shortDescription) },
    { label: "Ubicacion", ok: Boolean(draft.venueName && draft.address && draft.city) },
    { label: "Imagen", ok: Boolean(draft.flyerUrl), optional: true },
    { label: "Al menos un tipo de entrada", ok: draft.ticketTypes.length > 0 },
    { label: "Mesas", ok: !draft.hasTables || draft.tableZones.length > 0, optional: true },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {draft.flyerUrl ? (
          <img src={draft.flyerUrl} alt={draft.title || "Flyer"} className="mb-3 aspect-video w-full rounded-xl object-cover" />
        ) : null}
        <p className="text-lg font-bold text-white">{draft.title || "Evento sin titulo"}</p>
        <p className="text-sm text-white/50">
          {draft.startAt || "Fecha por definir"} · {draft.venueName || "Lugar por definir"}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs text-white/40">Tickets</p>
            <ul className="mt-1 space-y-1 text-sm text-white/70">
              {draft.ticketTypes.length === 0 ? <li>Sin tickets</li> : draft.ticketTypes.map((tt) => <li key={tt.id}>{tt.name} · RD$ {tt.price.toLocaleString("es-DO")}</li>)}
            </ul>
          </div>
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs text-white/40">Mesas</p>
            <ul className="mt-1 space-y-1 text-sm text-white/70">
              {!draft.hasTables || draft.tableZones.length === 0 ? (
                <li>Sin mesas</li>
              ) : (
                draft.tableZones.map((z) => <li key={z.id}>{z.name} · RD$ {z.minSpend.toLocaleString("es-DO")}</li>)
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-sm font-semibold text-white">Estado de completitud</p>
        <ul className="space-y-1 text-sm">
          {checks.map((c) => (
            <li key={c.label} className={c.ok ? "text-emerald-300" : "text-amber-300"}>
              {c.ok ? "✅" : c.optional ? "⚠️" : "❌"} {c.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 text-sm font-semibold text-white">Opciones de publicacion</p>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="radio"
            checked={draft.publishMode === "now"}
            onChange={() => onChange({ publishMode: "now" })}
            className="accent-orange-500"
          />
          Publicar ahora
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm text-white/80">
          <input
            type="radio"
            checked={draft.publishMode === "scheduled"}
            onChange={() => onChange({ publishMode: "scheduled" })}
            className="accent-orange-500"
          />
          Programar publicacion
        </label>
        {draft.publishMode === "scheduled" ? (
          <input
            type="datetime-local"
            value={draft.publishAt}
            onChange={(e) => onChange({ publishAt: e.target.value })}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-orange-500/60"
          />
        ) : null}
      </div>
    </div>
  );
}
