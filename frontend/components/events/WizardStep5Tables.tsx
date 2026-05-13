"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { EventWizardDraft, TableZoneStat } from "./types";

type ZoneForm = {
  name: string;
  peoplePerTable: string;
  minSpend: string;
  totalTables: string;
  description: string;
};

const emptyForm: ZoneForm = {
  name: "",
  peoplePerTable: "",
  minSpend: "",
  totalTables: "",
  description: "",
};

export function WizardStep5Tables({
  draft,
  onChange,
}: {
  draft: EventWizardDraft;
  onChange: (patch: Partial<EventWizardDraft>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ZoneForm>(emptyForm);

  function addZone() {
    const row: TableZoneStat = {
      id: `zone-${Date.now()}`,
      name: form.name.trim(),
      peoplePerTable: Number(form.peoplePerTable || 0),
      minSpend: Number(form.minSpend || 0),
      totalTables: Number(form.totalTables || 0),
      reserved: 0,
    };
    if (!row.name || row.peoplePerTable <= 0 || row.minSpend <= 0 || row.totalTables <= 0) return;
    onChange({ tableZones: [...draft.tableZones, row] });
    setForm(emptyForm);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
        <span className="text-sm text-white/80">Este evento tiene mesas?</span>
        <input
          type="checkbox"
          checked={draft.hasTables}
          onChange={(e) => onChange({ hasTables: e.target.checked })}
          className="h-4 w-4 accent-orange-500"
        />
      </label>

      {!draft.hasTables ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
          Activa el switch para configurar zonas y mesas VIP.
        </div>
      ) : (
        <>
          {draft.tableZones.map((zone) => (
            <div key={zone.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="font-semibold text-white">{zone.name}</p>
              <p className="mt-1 text-xs text-white/50">
                {zone.peoplePerTable} personas/mesa · RD$ {zone.minSpend.toLocaleString("es-DO")} minimo
              </p>
              <p className="mt-1 text-xs text-white/50">{zone.totalTables} mesas</p>
              <button
                type="button"
                onClick={() => onChange({ tableZones: draft.tableZones.filter((z) => z.id !== zone.id) })}
                className="mt-2 text-xs text-red-300 hover:text-red-200"
              >
                Eliminar
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-full rounded-xl border border-dashed border-white/20 p-4 text-center text-sm text-white/70 transition hover:border-orange-500/40 hover:text-orange-400"
          >
            + Anadir zona
          </button>

          <AnimatePresence>
            {open ? (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Nombre zona"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={form.peoplePerTable}
                    onChange={(e) => setForm((s) => ({ ...s, peoplePerTable: e.target.value }))}
                    placeholder="Personas por mesa"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
                  />
                  <input
                    value={form.minSpend}
                    onChange={(e) => setForm((s) => ({ ...s, minSpend: e.target.value }))}
                    placeholder="Consumo minimo RD$"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
                  />
                </div>
                <input
                  value={form.totalTables}
                  onChange={(e) => setForm((s) => ({ ...s, totalTables: e.target.value }))}
                  placeholder="Cantidad de mesas"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
                />
                <input
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Descripcion opcional"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white/80"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={addZone}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white"
                  >
                    Guardar zona
                  </button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
