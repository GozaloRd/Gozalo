"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import type { EventWizardDraft, TicketTypeStat } from "./types";

type TicketForm = {
  name: string;
  price: string;
  total: string;
  description: string;
};

const emptyForm: TicketForm = { name: "", price: "", total: "", description: "" };

export function WizardStep4Tickets({
  draft,
  onChange,
}: {
  draft: EventWizardDraft;
  onChange: (patch: Partial<EventWizardDraft>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TicketForm>(emptyForm);

  function addTicketType() {
    const name = form.name.trim();
    const price = Number(form.price || 0);
    const total = Number(form.total || 0);
    if (!name || price <= 0 || total <= 0) return;
    const row: TicketTypeStat = {
      id: `ticket-${Date.now()}`,
      name,
      price,
      total,
      sold: 0,
    };
    onChange({ ticketTypes: [...draft.ticketTypes, row] });
    setForm(emptyForm);
    setOpen(false);
  }

  return (
    <div className="space-y-4">
      {draft.ticketTypes.map((tt) => {
        const pct = tt.total > 0 ? Math.round((tt.sold / tt.total) * 100) : 0;
        return (
          <div key={tt.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-white">{tt.name}</p>
              <p className="text-sm text-white/60">RD$ {tt.price.toLocaleString("es-DO")}</p>
            </div>
            <p className="mt-1 text-xs text-white/50">Stock: {tt.total}</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-orange-500"
              />
            </div>
            <button
              type="button"
              onClick={() => onChange({ ticketTypes: draft.ticketTypes.filter((x) => x.id !== tt.id) })}
              className="mt-3 text-xs text-red-300 hover:text-red-200"
            >
              Eliminar
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-xl border border-dashed border-white/20 p-4 text-center text-sm text-white/70 transition hover:border-orange-500/40 hover:text-orange-400"
      >
        + Anadir tipo de entrada
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
              placeholder="Nombre del tipo"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                placeholder="Precio"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
              />
              <input
                value={form.total}
                onChange={(e) => setForm((s) => ({ ...s, total: e.target.value }))}
                placeholder="Stock maximo"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/30 outline-none focus:border-orange-500/60"
              />
            </div>
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
                onClick={addTicketType}
                className="rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white"
              >
                Guardar tipo
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
