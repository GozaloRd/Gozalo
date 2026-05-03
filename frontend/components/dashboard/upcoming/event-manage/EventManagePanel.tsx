"use client";

import type { ComponentType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Armchair,
  ChevronRight,
  Image as ImageIcon,
  Info,
  Settings2,
  Ticket,
  X,
} from "lucide-react";
import ImageUploader from "@/components/ui/ImageUploader";
import { TableLayoutEditor } from "@/components/dashboard/panels/TableLayoutEditor";
import { useDashboard } from "@/contexts/DashboardContext";
import { updateDashboardEvent } from "@/lib/dashboardApi";
import { MUSIC_CATEGORIES } from "@/lib/constants";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import {
  buildPutBody,
  formFromEvent,
  type EventForManage,
  type ManageFormState,
} from "@/components/dashboard/upcoming/event-manage/buildUpdateBody";
import {
  validateManageForm,
  type CheckKey,
} from "@/components/dashboard/upcoming/event-manage/validateManageForm";

const panelMotion = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
};

const CHECK_LABELS: Record<CheckKey, string> = {
  name: "Nombre del evento",
  datetime: "Fecha y hora",
  cover: "Foto principal",
  banner: "Portada / banner",
  description: "Descripción",
  tickets: "Tipos de ticket configurados",
  capacity: "Aforo definido",
  location: "Ubicación",
};

type SectionId = "basic" | "images" | "tickets" | "mesas" | "config";

function statusBadge(event: UpcomingEventModel, nowMs: number) {
  const st = (event.status || "").toLowerCase();
  if (st === "draft") return { text: "Borrador", className: "bg-zinc-600/40 text-zinc-200" };
  if (st === "paused") return { text: "Pausado", className: "bg-amber-500/20 text-amber-300" };
  if (st === "published") {
    const start = new Date(event.startAt).getTime();
    const end = new Date(event.endAt).getTime();
    if (nowMs < start) return { text: "En venta", className: "bg-sky-500/20 text-sky-300" };
    if (nowMs > end) return { text: "Finalizado", className: "bg-zinc-600/40 text-zinc-300" };
    return { text: "Publicado", className: "bg-emerald-500/20 text-emerald-300" };
  }
  return { text: st || "—", className: "bg-zinc-600/30 text-zinc-300" };
}

function snapshotForm(f: ManageFormState): string {
  return JSON.stringify({
    ...f,
    layoutTablesDraft: f.layoutTablesDraft,
  });
}

function ManageInnerAccordion({
  id,
  title,
  icon: Icon,
  openSection,
  setOpenSection,
  children,
}: {
  id: SectionId;
  title: string;
  icon: ComponentType<{ className?: string }>;
  openSection: SectionId | null;
  setOpenSection: (fn: (s: SectionId | null) => SectionId | null) => void;
  children: ReactNode;
}) {
  const open = openSection === id;
  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-zinc-950/50 transition-colors ${
        open ? "border-l-2 border-l-purple-500" : "border-l-2 border-l-transparent"
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpenSection((s) => (s === id ? null : id))}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon className="h-4 w-4 text-purple-400" aria-hidden />
          {title}
        </span>
        <ChevronRight
          className={`h-5 w-5 shrink-0 text-purple-400 transition-transform duration-300 ${
            open ? "rotate-90" : ""
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-white/[0.06] px-3 pb-4 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function EventManagePanel({
  event,
  nowMs,
  onClose,
  onSaved,
}: {
  event: UpcomingEventModel;
  nowMs: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { venueId } = useDashboard();
  const [form, setForm] = useState<ManageFormState>(() => formFromEvent(event as EventForManage));
  const baselineRef = useRef<string>("");
  const [openSection, setOpenSection] = useState<SectionId | null>("basic");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = formFromEvent(event as EventForManage);
    setForm(next);
    baselineRef.current = snapshotForm(next);
  }, [event]);

  const dirty = snapshotForm(form) !== baselineRef.current;
  const { checks, missingCount, readyToPublish } = useMemo(() => validateManageForm(form), [form]);
  const badge = statusBadge(event, nowMs);
  const isPublished = (event.status || "").toLowerCase() === "published";

  const tryClose = useCallback(() => {
    if (dirty && typeof window !== "undefined" && !window.confirm("¿Cerrar sin guardar los cambios?")) {
      return;
    }
    onClose();
  }, [dirty, onClose]);

  const persist = useCallback(
    async (opts?: { publish?: boolean; unpublish?: boolean }) => {
      if (!venueId) {
        alert("No hay local seleccionado.");
        return;
      }
      setSaving(true);
      try {
        const st = (event.status || "").toLowerCase();
        const currentStatus =
          st === "published" || st === "draft" || st === "paused" ? st : "draft";
        const body =
          opts?.publish != null && opts.publish
            ? buildPutBody(form, { statusOverride: "published" })
            : opts?.unpublish
              ? buildPutBody(form, { statusOverride: "draft" })
              : buildPutBody(form, { currentStatus });
        await updateDashboardEvent(event.id, body, venueId);
        baselineRef.current = snapshotForm(form);
        onSaved();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error al guardar");
      } finally {
        setSaving(false);
      }
    },
    [event.id, event.status, form, onSaved, venueId]
  );

  const onPublish = useCallback(() => {
    if (!readyToPublish) return;
    if (!window.confirm("¿Publicar este evento? Será visible según tu configuración.")) return;
    void persist({ publish: true });
  }, [persist, readyToPublish]);

  const onUnpublish = useCallback(() => {
    if (!window.confirm("¿Despublicar? El evento volverá a borrador.")) return;
    void persist({ unpublish: true });
  }, [persist]);

  const addTicket = () => {
    setForm((f) => ({
      ...f,
      ticketRows: [
        ...f.ticketRows,
        { name: "", price: "", quantityTotal: "", showQuantityPublic: true, active: true },
      ],
    }));
  };

  const updateTicket = (i: number, patch: Partial<ManageFormState["ticketRows"][0]>) => {
    setForm((f) => {
      const rows = [...f.ticketRows];
      rows[i] = { ...rows[i], ...patch };
      return { ...f, ticketRows: rows };
    });
  };

  const removeTicket = (i: number) => {
    setForm((f) => ({
      ...f,
      ticketRows: f.ticketRows.filter((_, j) => j !== i),
    }));
  };

  return (
    <motion.div
      key="manage-panel"
      id={`event-manage-panel-${event.id}`}
      role="region"
      aria-label="Gestionar evento"
      variants={panelMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mt-3 flex max-h-[min(85vh,720px)] flex-col overflow-hidden rounded-xl border border-zinc-800 border-l-2 border-l-purple-500 bg-zinc-900/80 shadow-lg backdrop-blur-sm"
    >
      <div className="shrink-0 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              <span aria-hidden>✏️</span> Gestionar evento
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Estado actual:{" "}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                {badge.text}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={tryClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="mt-3 space-y-1.5">
          {(Object.keys(CHECK_LABELS) as CheckKey[]).map((k) => (
            <div key={k} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-4 shrink-0 text-center">{checks[k] ? "✅" : "⚠️"}</span>
              <span>{CHECK_LABELS[k]}</span>
            </div>
          ))}
        </div>

        {missingCount > 0 ? (
          <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
            Faltan {missingCount} campos para publicar
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            ✅ Listo para publicar
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
        <ManageInnerAccordion
          id="basic"
          title="Información básica"
          icon={Info}
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-3">
            <label className="block text-xs text-slate-400">
              Nombre
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block text-xs text-slate-400">
                Inicio
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-xs text-slate-400">
                Fin
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                  className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
                />
              </label>
            </div>
            <label className="block text-xs text-slate-400">
              Descripción
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Ubicación (ciudad)
              <input
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2.5 text-sm text-white"
                placeholder="Ej. Santo Domingo"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Categoría
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              >
                {MUSIC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-slate-400">
              Edad mínima
              <input
                type="number"
                min={0}
                value={form.minimumAge}
                onChange={(e) => setForm((f) => ({ ...f, minimumAge: e.target.value }))}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                placeholder="Opcional"
              />
            </label>
          </div>
        </ManageInnerAccordion>

        <ManageInnerAccordion
          id="images"
          title="Imágenes"
          icon={ImageIcon}
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-1 text-xs text-slate-500">Foto principal (pública)</p>
              <ImageUploader
                label="Subir o reemplazar portada"
                currentImage={form.coverImageUrl}
                onUpload={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
              />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Portada / banner</p>
              <ImageUploader
                label="Subir banner"
                currentImage={form.bannerUrl}
                onUpload={(url) => setForm((f) => ({ ...f, bannerUrl: url }))}
              />
            </div>
          </div>
        </ManageInnerAccordion>

        <ManageInnerAccordion
          id="tickets"
          title="Tickets"
          icon={Ticket}
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-3">
            {form.ticketRows.map((row, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-zinc-900/80 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => updateTicket(i, { active: e.target.checked })}
                      className="rounded border-white/20"
                    />
                    Activo
                  </label>
                  <button
                    type="button"
                    onClick={() => removeTicket(i)}
                    className="text-xs text-rose-400"
                  >
                    Eliminar
                  </button>
                </div>
                <input
                  placeholder="Nombre del tipo"
                  value={row.name}
                  onChange={(e) => updateTicket(i, { name: e.target.value })}
                  className="mt-2 min-h-[44px] w-full rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Precio RD$"
                    value={row.price}
                    onChange={(e) => updateTicket(i, { price: e.target.value })}
                    className="min-h-[44px] rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
                  />
                  <input
                    type="number"
                    placeholder="Cantidad"
                    value={row.quantityTotal}
                    onChange={(e) => updateTicket(i, { quantityTotal: e.target.value })}
                    className="min-h-[44px] rounded-lg border border-white/10 bg-zinc-950 px-2 py-2 text-sm text-white"
                  />
                </div>
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={row.showQuantityPublic}
                    onChange={(e) => updateTicket(i, { showQuantityPublic: e.target.checked })}
                    className="rounded border-white/20"
                  />
                  Mostrar cupo al público
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={addTicket}
              className="min-h-[44px] w-full rounded-xl border border-dashed border-purple-500/40 py-2 text-sm text-purple-200"
            >
              + Añadir tipo
            </button>
          </div>
        </ManageInnerAccordion>

        <ManageInnerAccordion
          id="mesas"
          title="Mesas (opcional)"
          icon={Armchair}
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-3">
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.mesasEnabled}
                onChange={(e) => setForm((f) => ({ ...f, mesasEnabled: e.target.checked }))}
                className="rounded border-white/20"
              />
              Habilitar mesas reservables
            </label>
            <p className="text-xs text-slate-500">Plano de referencia (opcional)</p>
            <ImageUploader
              label="Subir plano del salón"
              currentImage={form.tableLayoutImageUrl}
              onUpload={(url) => setForm((f) => ({ ...f, tableLayoutImageUrl: url }))}
            />
            {form.mesasEnabled ? (
              <TableLayoutEditor
                enabled
                value={form.layoutTablesDraft}
                onChange={(layoutTablesDraft) => setForm((f) => ({ ...f, layoutTablesDraft }))}
              />
            ) : null}
            <p className="text-[10px] text-slate-600">
              El boceto de mesas es orientativo; la configuración definitiva de mesas sigue en el asistente de
              evento.
            </p>
          </div>
        </ManageInnerAccordion>

        <ManageInnerAccordion
          id="config"
          title="Configuración"
          icon={Settings2}
          openSection={openSection}
          setOpenSection={setOpenSection}
        >
          <div className="space-y-3">
            <label className="block text-xs text-slate-400">
              Aforo máximo
              <input
                type="number"
                min={1}
                value={form.maxCapacity}
                onChange={(e) => setForm((f) => ({ ...f, maxCapacity: e.target.value }))}
                className="mt-1 min-h-[44px] w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.visibilityPublic}
                onChange={(e) => setForm((f) => ({ ...f, visibilityPublic: e.target.checked }))}
                className="rounded border-white/20"
              />
              Visible públicamente (listado)
            </label>
            <label className="flex min-h-[44px] items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                className="rounded border-white/20"
              />
              Destacar en collage / promos
            </label>
            <label className="block text-xs text-slate-400">
              Notas de reembolsos (referencia interna)
              <textarea
                value={form.refundNote}
                onChange={(e) => setForm((f) => ({ ...f, refundNote: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
                placeholder="Política aplicada en taquilla…"
              />
            </label>
          </div>
        </ManageInnerAccordion>
      </div>

      <div className="shrink-0 space-y-2 border-t border-white/[0.08] bg-zinc-950/95 px-3 py-3 backdrop-blur-md">
        {dirty ? (
          <p className="text-center text-[11px] font-medium text-amber-400">Cambios sin guardar</p>
        ) : null}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!dirty || saving}
            onClick={() => void persist()}
            className={`min-h-[48px] w-full rounded-2xl px-4 py-3 text-sm font-bold transition ${
              dirty ? "bg-purple-600 text-white" : "bg-zinc-800 text-zinc-500"
            }`}
          >
            💾 Guardar cambios
          </button>
          {isPublished ? (
            <button
              type="button"
              disabled={saving}
              onClick={onUnpublish}
              className="min-h-[48px] w-full rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm font-bold text-rose-200"
            >
              📤 Despublicar
            </button>
          ) : (
            <button
              type="button"
              disabled={!readyToPublish || saving}
              onClick={onPublish}
              className={`min-h-[48px] w-full rounded-2xl px-4 py-3 text-sm font-bold ${
                readyToPublish ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-500"
              }`}
            >
              🚀 Publicar evento
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
