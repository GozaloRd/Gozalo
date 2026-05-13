"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import {
  createDashboardEvent,
  createDashboardTable,
  deactivateDashboardTable,
  fetchDashboardTables,
  updateDashboardEvent,
  type VenueTableRow,
} from "@/lib/dashboardApi";
import { buildDashboardPayload, parseInitialToFormValues } from "./createEventWizardApi";
import { createEventWizardSchema, type CreateEventWizardFormValues } from "./createEventWizardTypes";
import { WizardProgressBar } from "./WizardProgressBar";
import { CreateEventStep1Basic } from "./steps/CreateEventStep1Basic";
import { CreateEventStep2Location } from "./steps/CreateEventStep2Location";
import { CreateEventStep3Images } from "./steps/CreateEventStep3Images";
import { CreateEventStep4Tickets } from "./steps/CreateEventStep4Tickets";
import { CreateEventStep5Tables } from "./steps/CreateEventStep5Tables";
import { CreateEventStep6Config } from "./steps/CreateEventStep6Config";
import { EventPreviewModal } from "./modals/EventPreviewModal";

const STEPS = 6;
const TITLES = [
  "Información básica",
  "Ubicación",
  "Imágenes",
  "Tickets",
  "Mesas reservables",
  "Configuración",
];

type Props = {
  venueId: string;
  venueCity?: string;
  venueAddress?: string;
  venueName?: string;
  embedded?: boolean;
  initial: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
};

function useDebouncedCallback<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => fn(...args), ms);
    },
    [fn, ms]
  );
}

export function CreateEventWizard({
  venueId,
  venueCity = "Santiago",
  venueAddress = "",
  venueName,
  embedded = false,
  initial,
  onClose,
  onSaved,
}: Props) {
  const eventIdInitial = typeof initial?.id === "string" ? initial.id : null;
  const [eventId, setEventId] = useState<string | null>(eventIdInitial);
  const [step, setStep] = useState(1);
  const [maxUnlocked, setMaxUnlocked] = useState(() => (eventIdInitial ? STEPS : 1));
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exitDialog, setExitDialog] = useState(false);
  const [venueTables, setVenueTables] = useState<VenueTableRow[] | undefined>(undefined);
  /** Re-render cada segundo mientras haya un `lastSavedAt` para el texto “hace Xs”. */
  const [saveUiTick, setSaveUiTick] = useState(0);

  useEffect(() => {
    const id = typeof initial?.id === "string" ? initial.id : null;
    if (!id || !venueId) return;
    void fetchDashboardTables(id, venueId, { tableScope: "event" }).then((r) => {
      setVenueTables(r.mesas ?? []);
    });
  }, [initial, venueId]);

  useEffect(() => {
    if (lastSavedAt == null) return;
    const id = window.setInterval(() => setSaveUiTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [lastSavedAt]);

  const defaults = useMemo(
    () =>
      parseInitialToFormValues({
        venueCity,
        venueAddress,
        event: initial,
        ticketTypes: (initial?.ticketTypes as Record<string, unknown>[]) ?? undefined,
        tables: venueTables,
      }),
    [initial, venueCity, venueAddress, venueTables]
  );

  const methods = useForm<CreateEventWizardFormValues>({
    resolver: zodResolver(createEventWizardSchema),
    defaultValues: defaults,
    mode: "onChange",
  });

  const { watch, getValues, trigger, reset, formState: { isDirty } } = methods;

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const persistDraft = useCallback(async (): Promise<string | null> => {
    const values = getValues();
    const payload = buildDashboardPayload(values, {
      status: "draft",
      venueAddress,
    });
    if (eventId) {
      await updateDashboardEvent(eventId, payload, venueId);
      setLastSavedAt(Date.now());
      return eventId;
    }
    const res = (await createDashboardEvent(payload, venueId)) as { evento?: { id: string } };
    const id = res.evento?.id ?? null;
    if (id) setEventId(id);
    setLastSavedAt(Date.now());
    return id;
  }, [eventId, getValues, venueId, venueAddress]);

  const debouncedPersist = useDebouncedCallback(() => {
    void persistDraft().catch(() => {
      /* silent; usuario puede guardar manual */
    });
  }, 2000);

  useEffect(() => {
    const sub = watch(() => {
      if (!eventId && step === 1) return;
      debouncedPersist();
    });
    return () => sub.unsubscribe();
  }, [watch, debouncedPersist, eventId, step]);

  const watched = watch();

  async function syncTablesForEvent(id: string, values: CreateEventWizardFormValues) {
    const res = await fetchDashboardTables(id, venueId, { tableScope: "event" });
    for (const t of res.mesas ?? []) {
      await deactivateDashboardTable(t.id, venueId);
    }
    if (!values.tablesEnabled) return;
    for (const z of values.tableZones) {
      const minP = z.minSpend.trim() ? parseFloat(z.minSpend) : null;
      const pct = z.requiresDeposit ? Math.max(1, Math.min(100, z.depositPercent)) : 100;
      for (let i = 0; i < z.tableCount; i++) {
        await createDashboardTable(
          {
            eventId: id,
            zone: z.name.trim(),
            label: `Mesa ${i + 1}`,
            capacity: z.seatsPerTable,
            minPrice: minP,
            initialPaymentPercent: pct,
            posX: 50,
            posY: 50,
          },
          venueId
        );
      }
    }
  }

  async function validateStep(n: number): Promise<boolean> {
    const v = getValues();
    if (n === 1) {
      const ok = await trigger(["title", "shortDescription", "startAt", "endAt", "category", "minAge"]);
      if (v.startAt && v.endAt && new Date(v.endAt) <= new Date(v.startAt)) {
        return false;
      }
      return ok;
    }
    if (n === 2) {
      if (v.useVenueAddress) return await trigger(["city", "lat", "lng"]);
      return await trigger(["address", "city", "lat", "lng"]);
    }
    if (n === 3) {
      return Boolean(v.principalImageUrl?.trim());
    }
    if (n === 4) {
      if (!v.maxCapacity?.trim()) return false;
      const rows = v.tickets.filter((t) => t.name.trim());
      if (!rows.length) return false;
      for (const t of rows) {
        const p = parseFloat(t.price);
        if (Number.isNaN(p) || p < 0) return false;
        const q = parseInt(t.quantityTotal, 10);
        if (Number.isNaN(q) || q < 1) return false;
      }
      return true;
    }
    if (n === 5) {
      if (!v.tablesEnabled) return true;
      return v.tableZones.length > 0 && v.tableZones.every((z) => z.name.trim());
    }
    return true;
  }

  async function goNext() {
    const ok = await validateStep(step);
    if (!ok) {
      setToast("Revisa los campos obligatorios");
      window.setTimeout(() => setToast(null), 2500);
      return;
    }
    setSaving(true);
    try {
      const id = await persistDraft();
      const effectiveId = id ?? eventId;
      if (effectiveId && step === 5) {
        await syncTablesForEvent(effectiveId, getValues());
      }
      const next = Math.min(STEPS, step + 1);
      setStep(next);
      setMaxUnlocked((m) => Math.max(m, next));
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error al guardar");
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  function tryClose() {
    if (isDirty) setExitDialog(true);
    else onClose();
  }

  async function saveDraftClick() {
    setSaving(true);
    try {
      const id = await persistDraft();
      if (id && step >= 5) {
        await syncTablesForEvent(id, getValues());
      }
      setToast("Borrador guardado");
      window.setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error");
      window.setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  const canPublish = useMemo(() => {
    const v = watched;
    const basic =
      v.title.trim().length >= 3 &&
      v.shortDescription.trim() &&
      v.startAt &&
      v.endAt &&
      new Date(v.endAt) > new Date(v.startAt);
    const loc = (v.useVenueAddress || v.address.trim()) && v.city && v.lat != null && v.lng != null;
    const img = Boolean(v.principalImageUrl?.trim());
    const tickets =
      v.tickets.some((t) => t.name.trim()) &&
      Boolean(v.maxCapacity?.trim()) &&
      v.tickets
        .filter((t) => t.name.trim())
        .every((t) => !Number.isNaN(parseFloat(t.price)) && parseInt(t.quantityTotal, 10) > 0);
    const tablesOk =
      !v.tablesEnabled || (v.tableZones.length > 0 && v.tableZones.every((z) => z.name.trim()));
    return basic && loc && img && tickets && tablesOk;
  }, [watched]);

  async function publish() {
    setSaving(true);
    try {
      const values = getValues();
      const payload = buildDashboardPayload(values, {
        status: "published",
        venueAddress,
      });
      let id = eventId;
      if (!id) {
        const res = (await createDashboardEvent(payload, venueId)) as { evento?: { id: string } };
        id = res.evento?.id ?? null;
        if (id) setEventId(id);
      } else {
        await updateDashboardEvent(id, payload, venueId);
      }
      if (id) await syncTablesForEvent(id, values);
      setPublishConfirm(false);
      setToast("Evento publicado");
      onSaved();
      window.setTimeout(() => {
        onClose();
      }, 600);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Error al publicar");
    } finally {
      setSaving(false);
    }
  }

  const shellClass = embedded
    ? "relative flex min-h-0 flex-1 flex-col bg-[#0A0A0F]"
    : "fixed inset-0 z-[100] flex flex-col bg-[#0A0A0F]";

  const secSinceSave = useMemo(() => {
    void saveUiTick;
    return lastSavedAt != null
      ? Math.max(0, Math.round((Date.now() - lastSavedAt) / 1000))
      : null;
  }, [lastSavedAt, saveUiTick]);

  return (
    <FormProvider {...methods}>
      <div className={shellClass}>
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: [
              "radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.35), transparent)",
              "radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.25), transparent)",
              "radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.2), transparent)",
            ].join(","),
          }}
        />

        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0F]/95 px-4 pb-3 pt-3 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={tryClose}
              className="min-h-[44px] min-w-[44px] rounded-xl text-lg text-zinc-300"
              aria-label="Volver"
            >
              ←
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{TITLES[step - 1]}</p>
              <WizardProgressBar current={step} total={STEPS} className="mt-2" />
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="min-h-[44px] shrink-0 rounded-xl px-2 text-xs font-medium text-orange-300"
            >
              Ver vista previa
            </button>
            <span className="text-xs tabular-nums text-zinc-500">{step}/{STEPS}</span>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(11.5rem+env(safe-area-inset-bottom,0px))] pt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="rounded-2xl border border-white/[0.07] bg-zinc-900/80 p-4 backdrop-blur-sm"
            >
              {step === 1 ? <CreateEventStep1Basic /> : null}
              {step === 2 ? (
                <CreateEventStep2Location
                  venueName={venueName}
                  venueAddress={venueAddress}
                  venueCity={venueCity}
                />
              ) : null}
              {step === 3 ? <CreateEventStep3Images /> : null}
              {step === 4 ? <CreateEventStep4Tickets /> : null}
              {step === 5 ? <CreateEventStep5Tables /> : null}
              {step === 6 ? <CreateEventStep6Config /> : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#0A0A0F]/98 backdrop-blur-md">
          <div className="mx-auto max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            <p className="min-h-[1.125rem] px-1 text-left text-[11px] text-zinc-500">
              {lastSavedAt != null && secSinceSave != null ? (
                <>
                  <span aria-hidden>💾</span> Guardado hace {secSinceSave}s
                </>
              ) : (
                <>
                  <span aria-hidden>💾</span> Borrador sin guardar en servidor
                </>
              )}
            </p>

            <div
              className="my-2.5 h-px w-full bg-gradient-to-r from-transparent via-white/12 to-transparent"
              aria-hidden
            />

            <div className="flex items-stretch gap-2">
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={step > 1 ? goBack : tryClose}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] px-2 text-sm font-semibold text-zinc-100"
                >
                  ← Atrás
                </button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDraftClick()}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-zinc-800/95 text-lg transition hover:bg-zinc-700/90 disabled:opacity-50"
                aria-label="Guardar borrador"
                title="Guardar borrador"
              >
                💾
              </button>

              <div className="min-w-0 flex-1">
                {step < STEPS ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void goNext()}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 px-2 text-sm font-semibold text-white shadow-lg shadow-amber-900/25 disabled:opacity-50"
                  >
                    {saving ? "Guardando…" : "Siguiente →"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving || !canPublish}
                    onClick={() => setPublishConfirm(true)}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Publicar
                  </button>
                )}
              </div>
            </div>

            <nav
              className="mt-2.5 flex flex-wrap items-center justify-center gap-y-1 text-[13px] leading-none text-zinc-500 tabular-nums"
              aria-label="Progreso por pasos"
            >
              {Array.from({ length: STEPS }, (_, i) => {
                const n = i + 1;
                const unlocked = n <= maxUnlocked;
                const isCurrent = n === step;
                return (
                  <span key={n} className="inline-flex items-center">
                    {i > 0 ? <span className="mx-1.5 text-zinc-600 select-none">·</span> : null}
                    {isCurrent ? (
                      <span className="text-amber-400" aria-current="step">
                        ●
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => unlocked && setStep(n)}
                        className={
                          unlocked
                            ? "flex min-h-[44px] min-w-[2.25rem] items-center justify-center text-zinc-400 transition hover:text-zinc-200"
                            : "flex min-h-[44px] min-w-[2.25rem] cursor-not-allowed items-center justify-center text-zinc-700"
                        }
                      >
                        {n}
                      </button>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>
        </footer>

        <EventPreviewModal
          open={previewOpen}
          values={getValues()}
          onClose={() => setPreviewOpen(false)}
        />

        {publishConfirm ? (
          <div
            className="fixed inset-0 z-[340] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5">
              <p className="text-lg font-bold text-white">¿Publicar evento?</p>
              <p className="mt-2 text-sm text-zinc-400">
                Se aplicará la visibilidad elegida y los tickets/mesas configurados.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPublishConfirm(false)}
                  className="min-h-[44px] flex-1 rounded-xl border border-white/15 py-2 text-sm text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void publish()}
                  className="min-h-[44px] flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {exitDialog ? (
          <div className="fixed inset-0 z-[340] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-5">
              <p className="text-lg font-bold text-white">¿Salir sin guardar?</p>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExitDialog(false);
                    onClose();
                  }}
                  className="min-h-[44px] rounded-xl border border-red-500/40 py-2 text-sm text-red-300"
                >
                  Salir y descartar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void persistDraft().then(() => {
                      setExitDialog(false);
                      onClose();
                    });
                  }}
                  className="min-h-[44px] rounded-xl bg-zinc-800 py-2 text-sm text-white"
                >
                  Guardar borrador y salir
                </button>
                <button
                  type="button"
                  onClick={() => setExitDialog(false)}
                  className="min-h-[44px] rounded-xl border border-white/15 py-2 text-sm text-zinc-300"
                >
                  Continuar editando
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className="fixed bottom-[calc(11rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[350] max-w-[90vw] -translate-x-1/2 rounded-xl bg-zinc-100 px-4 py-2 text-center text-sm font-medium text-zinc-900 shadow-xl">
            {toast}
          </div>
        ) : null}
      </div>
    </FormProvider>
  );
}
