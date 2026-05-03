"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createDashboardEvent,
  createDashboardTable,
  deactivateDashboardTable,
  fetchDashboardTables,
  updateDashboardEvent,
  updateDashboardTable,
  type VenueTableRow,
} from "@/lib/dashboardApi";
import { MUSIC_CATEGORIES } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import ImageUploader from "@/components/ui/ImageUploader";

function normalizeGalleryImages(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((u): u is string => typeof u === "string");
  return [];
}

type TicketRow = {
  name: string;
  price: string;
  quantityTotal: string;
  description: string;
  /** Mostrar cupo al público (ficha / checkout) */
  showQuantityPublic: boolean;
};

type Props = {
  venueId: string;
  venueCity?: string;
  /** Sin overlay `fixed`: para modal móvil que ya envuelve el asistente. */
  embedded?: boolean;
  initial: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    city?: string;
    startAt: string;
    endAt: string;
    coverImageUrl?: string;
    basePrice?: number | string | null;
    maxCapacity?: number | string | null;
    featured?: boolean;
    requiresCoverForTable?: boolean;
    includeInCollage?: boolean;
    status?: string;
    ticketTypes?: {
      name: string;
      price: number | string;
      quantityTotal?: number | null;
      showQuantityPublic?: boolean;
      description?: string | null;
    }[];
    images?: string[] | null;
    /** Plano/foto del salón para reservas de mesa */
    tableLayoutImageUrl?: string | null;
  } | null;
  onClose: () => void;
  onSaved: () => void;
};

function toLocal(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventWizard({ venueId, venueCity, embedded = false, initial, onClose, onSaved }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [eventId, setEventId] = useState<string | null>(initial?.id ?? null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Reggaeton");
  const [city, setCity] = useState(initial?.city ?? venueCity ?? "Santo Domingo");
  const [startAt, setStartAt] = useState(initial?.startAt ? toLocal(initial.startAt) : "");
  const [endAt, setEndAt] = useState(initial?.endAt ? toLocal(initial.endAt) : "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [galleryImages, setGalleryImages] = useState<string[]>(() =>
    normalizeGalleryImages(initial?.images)
  );
  const [maxCapacity, setMaxCapacity] = useState(
    initial?.maxCapacity != null ? String(initial.maxCapacity) : ""
  );
  const [featured, setFeatured] = useState(!!initial?.featured);
  const [includeInCollage, setIncludeInCollage] = useState(
    () => initial?.includeInCollage !== false
  );
  const [publicStatus, setPublicStatus] = useState<"draft" | "published" | "paused">(() => {
    const s = initial?.status;
    if (s === "published" || s === "paused" || s === "draft") return s;
    return "draft";
  });

  const [ticketRows, setTicketRows] = useState<TicketRow[]>(() => {
    const tt = initial?.ticketTypes?.length
      ? initial.ticketTypes
      : [{ name: "", price: "", quantityTotal: "", description: "", showQuantityPublic: true }];
    return tt.map((t) => ({
      name: t.name,
      price: String(t.price ?? ""),
      quantityTotal: t.quantityTotal != null ? String(t.quantityTotal) : "",
      description: t.description ?? "",
      showQuantityPublic: t.showQuantityPublic !== false,
    }));
  });

  const [reservable, setReservable] = useState(false);
  const [tables, setTables] = useState<VenueTableRow[]>([]);
  const [layoutImageUrl, setLayoutImageUrl] = useState(initial?.tableLayoutImageUrl ?? "");

  const [zone, setZone] = useState("VIP");
  const [label, setLabel] = useState("");
  const [cap, setCap] = useState("4");
  const [minSpend, setMinSpend] = useState("");
  /** 1–100: qué % del total cobrar al reservar online (100 = pago completo). */
  const [depositPercent, setDepositPercent] = useState("50");
  const [editingTableId, setEditingTableId] = useState<string | null>(null);

  const loadTablesFor = useCallback(
    async (id: string | null) => {
      if (!id) return;
      const res = await fetchDashboardTables(id, venueId, { tableScope: "event" });
      setTables(res.mesas ?? []);
    },
    [venueId]
  );

  const loadTables = useCallback(async () => {
    await loadTablesFor(eventId);
  }, [eventId, loadTablesFor]);

  useEffect(() => {
    if (initial?.id) {
      void loadTablesFor(initial.id);
    }
  }, [initial?.id, loadTablesFor]);

  useEffect(() => {
    if (tables.length > 0) setReservable(true);
  }, [tables.length]);

  useEffect(() => {
    if (publicStatus !== "published") setFeatured(false);
  }, [publicStatus]);

  function validateStep1() {
    if (!title.trim()) return "Indica el título";
    if (!startAt || !endAt) return "Indica fechas de inicio y fin";
    if (new Date(startAt) >= new Date(endAt)) return "La fecha de fin debe ser posterior";
    return null;
  }

  function validateStep2() {
    const rows = ticketRows.filter((r) => r.name.trim());
    if (!rows.length) return "Añade al menos un tipo de entrada";
    for (const r of rows) {
      const p = parseFloat(r.price);
      if (Number.isNaN(p) || p < 0) return "Precio inválido en tipos de entrada";
    }
    return null;
  }

  async function persistEventDraft(): Promise<string> {
    const ticketTypes = ticketRows
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        price: parseFloat(r.price),
        quantityTotal: r.quantityTotal ? parseInt(r.quantityTotal, 10) : null,
        showQuantityPublic: r.showQuantityPublic,
        description: r.description.trim() || undefined,
      }));

    const body = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      city,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      coverImageUrl: coverImageUrl.trim() || undefined,
      tableLayoutImageUrl: layoutImageUrl.trim() ? layoutImageUrl.trim() : null,
      images: galleryImages.length ? galleryImages : undefined,
      maxCapacity: maxCapacity.trim() ? parseInt(maxCapacity, 10) : undefined,
      status: "draft" as const,
      featured,
      includeInCollage,
      ticketTypes,
    };

    if (eventId) {
      await updateDashboardEvent(eventId, body, venueId);
      return eventId;
    }
    const res = await createDashboardEvent(body, venueId);
    const id = (res as { evento?: { id: string } }).evento?.id;
    if (!id) throw new Error("No se recibió el id del evento");
    setEventId(id);
    return id;
  }

  async function goNext() {
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        alert(err);
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const err = validateStep2();
      if (err) {
        alert(err);
        return;
      }
      setSaving(true);
      try {
        const id = await persistEventDraft();
        await loadTablesFor(id);
        setStep(3);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Error al guardar");
      } finally {
        setSaving(false);
      }
      return;
    }
    if (step === 3) {
      if (!eventId) {
        setStep(4);
        return;
      }
      setSaving(true);
      void (async () => {
        try {
          await persistEventDraft();
          setStep(4);
        } catch (e) {
          alert(e instanceof Error ? e.message : "Error al guardar el plano de mesas");
        } finally {
          setSaving(false);
        }
      })();
    }
  }

  function addTicketRow() {
    setTicketRows((r) => [
      ...r,
      { name: "", price: "", quantityTotal: "", description: "", showQuantityPublic: true },
    ]);
  }

  async function handleAddOrUpdateTable() {
    const err = validateStep1();
    if (err) {
      alert(err);
      return;
    }
    if (!reservable) return;
    if (!label.trim()) {
      alert("Indica etiqueta o número de mesa");
      return;
    }
    if (!eventId) {
      alert("Guarda el paso anterior primero");
      return;
    }
    setSaving(true);
    try {
      const dp = Math.max(1, Math.min(100, parseInt(depositPercent, 10) || 50));
      const payload = {
        eventId,
        zone: zone.trim() || "General",
        label: label.trim(),
        capacity: cap.trim() ? parseInt(cap, 10) : 4,
        minPrice: minSpend.trim() ? parseFloat(minSpend) : null,
        initialPaymentPercent: dp,
        posX: 50,
        posY: 50,
      };
      if (editingTableId) {
        await updateDashboardTable(editingTableId, payload, venueId);
      } else {
        await createDashboardTable(payload, venueId);
      }
      setLabel("");
      setDepositPercent("50");
      setEditingTableId(null);
      await loadTables();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al guardar mesa");
    } finally {
      setSaving(false);
    }
  }

  async function removeTable(id: string) {
    // UX: retirar la mesa de inmediato para corregir errores rápido.
    const previous = tables;
    setTables((curr) => curr.filter((t) => t.id !== id));
    setSaving(true);
    try {
      await deactivateDashboardTable(id, venueId);
    } catch (e) {
      setTables(previous);
      alert(e instanceof Error ? e.message : "Error al eliminar mesa");
    } finally {
      setSaving(false);
    }
  }

  function editTable(t: VenueTableRow) {
    setEditingTableId(t.id);
    setZone(t.zone);
    setLabel(t.label);
    setCap(String(t.capacity));
    setMinSpend(t.minPrice != null ? String(t.minPrice) : "");
    const p = t.initialPaymentPercent;
    setDepositPercent(String(p != null ? Math.max(1, Math.min(100, Number(p))) : 50));
  }

  async function finishNonPublish() {
    if (!eventId) return;
    setSaving(true);
    try {
      await persistEventDraft();
      const st = publicStatus;
      await updateDashboardEvent(
        eventId,
        { status: st, featured: st === "published" ? featured : false, includeInCollage },
        venueId
      );
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function finishPublish() {
    if (!eventId) return;
    setSaving(true);
    try {
      await persistEventDraft();
      await updateDashboardEvent(
        eventId,
        { status: "published", featured, includeInCollage },
        venueId
      );
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const progress = ((step - 1) / 3) * 100;

  const shellClass = embedded
    ? "relative w-full"
    : "fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm";

  const cardClass = embedded
    ? "relative w-full rounded-2xl border border-[#9B7FCA]/25 bg-[#0B0B14] p-4 pb-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] sm:p-6"
    : "relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[#9B7FCA]/25 bg-[#0B0B14] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)]";

  return (
    <div className={shellClass}>
      <div className={cardClass}>
        <button
          type="button"
          className="absolute right-4 top-4 text-slate-500 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>
        <h2 className="pr-8 font-display text-3xl font-bold text-white">
          {initial ? "Editar evento" : "Nuevo evento"}
        </h2>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-night-800">
          <div
            className="h-full bg-gradient-to-r from-[#2979FF] to-gozalo-blue transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-slate-400">
          Paso {step} de 4 —{" "}
          {step === 1
            ? "Información"
            : step === 2
              ? "Tipos de entrada"
              : step === 3
                ? "Mesas"
                : "Resumen"}
        </p>

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-[#D4C2EE]">Completa la información base del evento.</p>
            <label className="block text-xs text-slate-400">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
            />
            <label className="block text-xs text-slate-400">Descripción</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                >
                  {MUSIC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Ciudad</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400">Inicio</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Fin</label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-slate-400">Imagen de portada</label>
              <ImageUploader
                label="Subir foto de portada del evento"
                onUpload={(url) => setCoverImageUrl(url)}
                currentImage={coverImageUrl}
              />
              <label className="block text-xs text-slate-400">Galería del evento</label>
              <ImageUploader
                label="Subir fotos del evento (galería)"
                multiple
                initialGallery={galleryImages}
                onUploadMultiple={(urls) => setGalleryImages(urls)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400">Capacidad máxima</label>
                <input
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(e.target.value)}
                  type="number"
                  className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-[#D4C2EE]">
              Define uno o más tipos de entrada. Puedes dejar cantidad vacía para cupo abierto.
            </p>
            {ticketRows.map((row, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    placeholder="Nombre (ej. VIP)"
                    value={row.name}
                    onChange={(e) => {
                      const v = [...ticketRows];
                      v[i] = { ...v[i], name: e.target.value };
                      setTicketRows(v);
                    }}
                    className="rounded-xl border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                  />
                  <input
                    placeholder="Precio RD$"
                    type="number"
                    value={row.price}
                    onChange={(e) => {
                      const v = [...ticketRows];
                      v[i] = { ...v[i], price: e.target.value };
                      setTicketRows(v);
                    }}
                    className="rounded-xl border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                  />
                  <input
                    placeholder="Cantidad (opcional)"
                    type="number"
                    value={row.quantityTotal}
                    onChange={(e) => {
                      const v = [...ticketRows];
                      v[i] = { ...v[i], quantityTotal: e.target.value };
                      setTicketRows(v);
                    }}
                    className="rounded-xl border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                  />
                </div>
                <input
                  placeholder="Descripción breve (opcional)"
                  value={row.description}
                  onChange={(e) => {
                    const v = [...ticketRows];
                    v[i] = { ...v[i], description: e.target.value };
                    setTicketRows(v);
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                />
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                  <input
                    type="checkbox"
                    checked={row.showQuantityPublic}
                    onChange={(e) => {
                      const v = [...ticketRows];
                      v[i] = { ...v[i], showQuantityPublic: e.target.checked };
                      setTicketRows(v);
                    }}
                    className="rounded border-white/20"
                  />
                  Mostrar cantidad disponible al público
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={addTicketRow}
              className="inline-flex items-center rounded-xl border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-3 py-2 text-sm font-semibold text-[#D4C2EE] transition hover:bg-[#9B7FCA]/20"
            >
              + Añadir tipo de ticket
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={reservable}
                onChange={(e) => setReservable(e.target.checked)}
                className="rounded border-white/20"
              />
              ¿Este evento tiene mesas reservables?
            </label>

            {reservable && (
              <>
                <div className="rounded-xl border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 p-3 text-sm text-[#E9DFF7]">
                  Configura las mesas por zona. El cliente verá esta información en la reserva.
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Plano/foto del local (opcional)</label>
                  <ImageUploader
                    label="Subir foto del local para referencia de mesas"
                    onUpload={(url) => {
                      setLayoutImageUrl(url);
                      if (eventId) {
                        void updateDashboardEvent(
                          eventId,
                          { tableLayoutImageUrl: url },
                          venueId
                        ).catch(() => {
                          /* se guardará también al pulsar Siguiente / Finalizar */
                        });
                      }
                    }}
                    currentImage={layoutImageUrl}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-slate-400">Zona</label>
                    <input
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                      placeholder="VIP, Terraza…"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Etiqueta / número</label>
                    <input
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                      placeholder="Mesa 1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Capacidad</label>
                    <input
                      value={cap}
                      onChange={(e) => setCap(e.target.value)}
                      type="number"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Mínimo consumo (RD$)</label>
                    <input
                      value={minSpend}
                      onChange={(e) => setMinSpend(e.target.value)}
                      type="number"
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400">Cobro al reservar (adelanto online)</label>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Porcentaje del total (mesa + cover + gastos) que paga el cliente al confirmar.{" "}
                      <span className="text-[#D4C2EE]">100</span> = debe pagar el monto completo;{" "}
                      <span className="text-[#D4C2EE]">50</span> = solo la mitad al reservar y el resto en el
                      local.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        value={depositPercent}
                        onChange={(e) => setDepositPercent(e.target.value)}
                        type="number"
                        min={1}
                        max={100}
                        className="w-24 rounded-xl border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#9B7FCA]/70"
                      />
                      <span className="text-sm text-slate-400">% del total</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateTable}
                    disabled={saving}
                    className="rounded-xl bg-gradient-to-r from-[#9B7FCA] to-[#7B5EA7] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(155,127,202,0.35)] disabled:opacity-50"
                  >
                    {editingTableId ? "Actualizar mesa" : "Añadir mesa"}
                  </button>
                  {editingTableId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTableId(null);
                        setLabel("");
                        setDepositPercent("50");
                      }}
                      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-300"
                    >
                      Cancelar edición
                    </button>
                  )}
                </div>

                {layoutImageUrl && (
                  <div>
                    <p className="text-sm font-medium text-white">Referencia visual del local</p>
                    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                      <img
                        src={layoutImageUrl}
                        alt="Plano o foto del local"
                        className="h-56 w-full object-cover sm:h-72"
                      />
                    </div>
                  </div>
                )}

                <ul className="space-y-2">
                  {tables.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm text-slate-300"
                    >
                      <span>
                        {t.zone} · {t.label} — {t.capacity} pers.
                        {t.minPrice != null && ` · mín. ${formatMoney(Number(t.minPrice))}`}
                        {` · reserva ${Math.max(1, Math.min(100, Number(t.initialPaymentPercent ?? 50)))}%`}
                        {Number(t.initialPaymentPercent ?? 50) >= 100 ? " (pago completo)" : ""}
                      </span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          className="text-[#D4C2EE]"
                          onClick={() => editTable(t)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-[#FF6B81]"
                          onClick={() => void removeTable(t.id)}
                        >
                          Eliminar
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 space-y-5 text-sm text-slate-300">
            <p>
              <strong className="text-white">Evento:</strong> {title}
            </p>
            <p>
              <strong className="text-white">Ciudad:</strong> {city} · {category}
            </p>
            <p>
              <strong className="text-white">Entradas:</strong>{" "}
              {ticketRows.filter((r) => r.name.trim()).length} tipo(s)
            </p>
            <p>
              <strong className="text-white">Mesas:</strong>{" "}
              {reservable ? `${tables.length} configurada(s)` : "Sin mesas reservables"}
            </p>

            <div className="visibility-section">
              <h3>Visibilidad del evento</h3>

              <div className="status-selector">
                <label>Estado:</label>
                <div className="status-options">
                  <button
                    type="button"
                    className={publicStatus === "draft" ? "active" : ""}
                    onClick={() => setPublicStatus("draft")}
                  >
                    📝 Borrador
                    <span>Solo tú lo ves</span>
                  </button>
                  <button
                    type="button"
                    className={publicStatus === "published" ? "active" : ""}
                    onClick={() => setPublicStatus("published")}
                  >
                    🌐 Publicado
                    <span>Visible para todos</span>
                  </button>
                </div>
              </div>

              {publicStatus === "published" && (
                <div className="featured-toggle">
                  <label className="featured-label">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(e) => setFeatured(e.target.checked)}
                      className="featured-checkbox"
                    />
                    <div className="featured-info">
                      <span className="featured-title">⭐ Destacar en página principal</span>
                      <span className="featured-desc">
                        Tu evento aparecerá primero y con mayor visibilidad para todos los usuarios
                      </span>
                    </div>
                  </label>
                </div>
              )}

              <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeInCollage}
                    onChange={(e) => setIncludeInCollage(e.target.checked)}
                    className="mt-1 rounded border-white/20"
                  />
                  <span>
                    <span className="block font-medium text-white">Añadir al collage público</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      Si lo activas, cuando el evento pase deberás ir a{" "}
                      <span className="text-slate-400">Panel → Collage</span> y autorizarlo para publicar. Solo
                      entonces se suben recuerdos y el evento puede listarse en{" "}
                      <span className="text-slate-400">/collage</span>. Si desactivas la casilla, no se
                      publicarán recuerdos al sitio aunque subas imágenes en el panel.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="rounded-xl border border-white/15 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-200"
            >
              Atrás
            </button>
          )}
          {step < 4 && (
            <button
              type="button"
              onClick={() => void goNext()}
              disabled={saving}
              className="rounded-xl bg-gradient-to-r from-[#2979FF] to-[#4C8DFF] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(41,121,255,0.35)] disabled:opacity-50"
            >
              {saving ? "Guardando…" : "Continuar"}
            </button>
          )}
          {step === 4 && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => void finishNonPublish()}
                className="rounded-xl border border-white/15 px-5 py-2 text-sm font-semibold text-white"
              >
                {publicStatus === "published" ? "Guardar cambios" : "Guardar borrador"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void finishPublish()}
                className="rounded-xl bg-gradient-to-r from-[#FF1744] to-gozalo-purple px-5 py-2 text-sm font-semibold text-white"
              >
                Publicar ahora
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
