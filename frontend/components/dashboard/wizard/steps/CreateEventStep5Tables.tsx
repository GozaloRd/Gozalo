"use client";

import { useMemo, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { TableZoneModal } from "../modals/TableZoneModal";
import type { CreateEventWizardFormValues } from "../createEventWizardTypes";
import { defaultTableZone, newLocalKey, type WizardTableZone } from "../createEventWizardTypes";

const DOT: Record<string, string> = {
  purple: "bg-purple-500",
  green: "bg-emerald-500",
  red: "bg-red-500",
  yellow: "bg-amber-400",
  blue: "bg-sky-500",
  slate: "bg-slate-500",
};

export function CreateEventStep5Tables() {
  const { control, register, watch, getValues } = useFormContext<CreateEventWizardFormValues>();
  const { fields, append, remove, update } = useFieldArray({ control, name: "tableZones" });

  const enabled = watch("tablesEnabled");
  const zones = watch("tableZones");

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<WizardTableZone | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const totals = useMemo(() => {
    let tables = 0;
    let people = 0;
    for (const z of zones || []) {
      tables += Number(z.tableCount) || 0;
      people += (Number(z.tableCount) || 0) * (Number(z.seatsPerTable) || 0);
    }
    return { tables, people };
  }, [zones]);

  function openNew() {
    setEditingIndex(null);
    setEditDraft(defaultTableZone());
    setModalOpen(true);
  }

  function openEdit(i: number) {
    setEditingIndex(i);
    setEditDraft({ ...getValues(`tableZones.${i}`) });
    setModalOpen(true);
  }

  function saveZone(row: WizardTableZone) {
    const withKey = { ...row, localKey: row.localKey || newLocalKey() };
    if (editingIndex !== null) update(editingIndex, withKey);
    else append(withKey);
  }

  return (
    <div className="space-y-4 border-l-2 border-orange-500 pl-4">
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/80 px-3 py-3 backdrop-blur-sm">
        <input type="checkbox" className="h-5 w-5" {...register("tablesEnabled")} />
        <span className="text-sm font-semibold text-white">¿Habilitar reserva de mesas?</span>
      </label>

      {!enabled ? (
        <p className="text-sm text-zinc-400">
          Las mesas están desactivadas. Puedes activarlas más tarde o pasar al siguiente paso.
        </p>
      ) : null}

      {enabled ? (
        <>
      <p className="text-xs font-medium text-zinc-400">Zonas de mesas</p>

      <div className="space-y-2">
        {fields.map((field, i) => {
          const z = zones?.[i];
          if (!z) return null;
          return (
            <div key={field.id} className="rounded-2xl border border-white/10 bg-zinc-900/80 p-3 backdrop-blur-sm">
              <button
                type="button"
                className="flex w-full items-start justify-between text-left"
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
              >
                <div>
                  <span className={`mr-2 inline-block h-2 w-2 rounded-full ${DOT[z.color] || "bg-zinc-500"}`} />
                  <span className="font-semibold text-white">{z.name || "Zona"}</span>
                  <p className="mt-1 text-xs text-zinc-500">
                    {z.tableCount} mesas · {z.seatsPerTable} personas/mesa
                  </p>
                  <p className="text-xs text-zinc-400">
                    Consumo mín:{" "}
                    {z.minSpend ? formatMoney(Number(z.minSpend)) : "—"}
                    {z.requiresDeposit ? (
                      <span className="text-zinc-500">
                        {" "}
                        · Anticipo {z.depositPercent}%
                      </span>
                    ) : null}
                  </p>
                </div>
                <span className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs text-orange-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(i);
                    }}
                  >
                    Editar
                  </button>
                  {openIdx === i ? <ChevronUp className="h-5 w-5 text-zinc-500" /> : <ChevronDown className="h-5 w-5 text-zinc-500" />}
                </span>
              </button>
              {openIdx === i ? (
                <div className="mt-2 flex gap-2 border-t border-white/5 pt-2">
                  <button
                    type="button"
                    className="text-xs text-rose-400"
                    onClick={() => remove(i)}
                  >
                    Eliminar zona
                  </button>
                </div>
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
        Añadir zona
      </button>

      <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-zinc-300">
        Total mesas: <strong className="text-white">{totals.tables}</strong> · Total personas:{" "}
        <strong className="text-white">{totals.people}</strong>
      </div>

      <TableZoneModal
        open={modalOpen}
        initial={editDraft}
        onClose={() => {
          setModalOpen(false);
          setEditDraft(null);
          setEditingIndex(null);
        }}
        onSave={(z) => saveZone(z)}
      />
        </>
      ) : null}
    </div>
  );
}
