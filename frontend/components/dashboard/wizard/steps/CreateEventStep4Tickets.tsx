"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ChevronDown, ChevronUp, MoreVertical, Plus } from "lucide-react";
import { TicketTypeModal } from "../modals/TicketTypeModal";
import type { CreateEventWizardFormValues } from "../createEventWizardTypes";
import { defaultTicketRow, newLocalKey, type WizardTicketDraft } from "../createEventWizardTypes";

function queueEmoji(ui: string) {
  if (ui === "active") return "🟢";
  if (ui === "queued") return "🟡";
  return "🔴";
}

export function CreateEventStep4Tickets() {
  const { control, register, watch, getValues } = useFormContext<CreateEventWizardFormValues>();
  const { fields, append, remove, update, replace } = useFieldArray({
    control,
    name: "tickets",
  });

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<WizardTicketDraft | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [menuIdx, setMenuIdx] = useState<number | null>(null);

  const maxCap = watch("maxCapacity");
  const ticketAutoQueue = watch("ticketAutoQueue");
  const ticketsWatch = watch("tickets");

  const totalTickets = useMemo(() => {
    let s = 0;
    for (const t of ticketsWatch || []) {
      const n = parseInt(String(t.quantityTotal), 10);
      if (!Number.isNaN(n)) s += n;
    }
    return s;
  }, [ticketsWatch]);

  const capNum = maxCap.trim() ? parseInt(maxCap, 10) : NaN;
  const unassigned =
    !Number.isNaN(capNum) && capNum > 0 ? Math.max(0, capNum - totalTickets) : null;

  function openNew() {
    setEditingIndex(null);
    setEditDraft(defaultTicketRow(fields.length));
    setModalOpen(true);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setEditDraft({ ...getValues(`tickets.${index}`) });
    setModalOpen(true);
    setMenuIdx(null);
  }

  function saveModal(row: WizardTicketDraft) {
    const withKey = { ...row, localKey: row.localKey || newLocalKey() };
    if (editingIndex !== null) {
      update(editingIndex, withKey);
    } else {
      append(withKey);
    }
  }

  function moveUp(i: number) {
    const list = [...getValues("tickets")] as WizardTicketDraft[];
    if (i <= 0) return;
    [list[i - 1], list[i]] = [list[i], list[i - 1]];
    replace(list);
  }

  function moveDown(i: number) {
    const list = [...getValues("tickets")] as WizardTicketDraft[];
    if (i >= list.length - 1) return;
    [list[i], list[i + 1]] = [list[i + 1], list[i]];
    replace(list);
  }

  return (
    <div className="space-y-4 border-l-2 border-orange-500 pl-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Aforo total del evento *</label>
        <input
          type="number"
          min={1}
          {...register("maxCapacity")}
          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-white backdrop-blur-sm"
          placeholder="Ej. 499"
        />
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 px-3 py-3 backdrop-blur-sm">
        <input type="checkbox" className="mt-1 h-5 w-5" {...register("ticketAutoQueue")} />
        <span className="text-sm text-zinc-200">
          <span className="font-semibold text-white">Activación automática</span>
          <span className="mt-0.5 block text-xs text-zinc-500">
            Al agotarse un tipo, se activa el siguiente en orden.
          </span>
        </span>
      </label>

      <p className="text-xs font-medium text-zinc-400">Tipos de ticket</p>

      <div className="space-y-2">
        {fields.map((field, i) => {
          const t = ticketsWatch?.[i] as WizardTicketDraft | undefined;
          if (!t) return null;
          return (
            <div
              key={field.id}
              className={`relative rounded-2xl border border-white/10 bg-zinc-900/80 p-3 backdrop-blur-sm ${
                openIdx === i ? "ring-1 ring-orange-500/40" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  className="flex flex-1 flex-col text-left"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  <span className="text-sm font-semibold text-white">
                    {i === 0 ? "1️⃣" : i === 1 ? "2️⃣" : i === 2 ? "3️⃣" : `${i + 1}.`}{" "}
                    {queueEmoji(t.queueUi)} {t.name || "(sin nombre)"}
                  </span>
                  <span className="text-xs text-zinc-500">
                    RD$ {t.price || "—"} · {t.quantityTotal || "?"} entradas
                  </span>
                  <span className="text-[11px] text-zinc-600">
                    {ticketAutoQueue ? "Cola secuencial" : "Paralelo"}
                  </span>
                </button>
                <div className="relative flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-2 text-zinc-400 hover:bg-white/5"
                    aria-label="Menú"
                    onClick={() => setMenuIdx(menuIdx === i ? null : i)}
                  >
                    <MoreVertical className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-zinc-400"
                    onClick={() => setOpenIdx(openIdx === i ? null : i)}
                    aria-expanded={openIdx === i}
                  >
                    {openIdx === i ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                {menuIdx === i ? (
                  <div className="absolute right-2 top-12 z-10 min-w-[160px] rounded-xl border border-white/10 bg-zinc-950 py-1 shadow-xl">
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                      onClick={() => openEdit(i)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10"
                      onClick={() => {
                        const copy = {
                          ...t,
                          localKey: newLocalKey(),
                          name: `${t.name} (copia)`,
                        };
                        append(copy);
                        setMenuIdx(null);
                      }}
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-white/10"
                      onClick={() => {
                        remove(i);
                        setMenuIdx(null);
                      }}
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/10"
                      onClick={() => moveUp(i)}
                    >
                      Subir orden
                    </button>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/10"
                      onClick={() => moveDown(i)}
                    >
                      Bajar orden
                    </button>
                  </div>
                ) : null}
              </div>
              {openIdx === i ? (
                <p className="mt-2 text-xs text-zinc-500">{t.description || "Sin descripción"}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={openNew}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-orange-500/40 bg-orange-500/5 text-sm font-semibold text-orange-200"
      >
        <Plus className="h-5 w-5" />
        Añadir tipo de ticket
      </button>

      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
        <p className="text-zinc-300">
          Total entradas: <strong className="text-white">{totalTickets}</strong>
          {!Number.isNaN(capNum) && capNum > 0 ? (
            <>
              {" "}
              / {capNum}
            </>
          ) : null}
        </p>
        {unassigned != null && unassigned > 0 ? (
          <p className="mt-1 text-xs text-amber-400">
            ⚠️ Quedan {unassigned} plazas sin asignar a tipos de ticket
          </p>
        ) : null}
      </div>

      <TicketTypeModal
        open={modalOpen}
        initial={editDraft}
        onClose={() => {
          setModalOpen(false);
          setEditDraft(null);
          setEditingIndex(null);
        }}
        onSave={(row) => saveModal(row)}
      />
    </div>
  );
}
