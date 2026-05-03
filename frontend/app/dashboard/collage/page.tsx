"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ImageUploader from "@/components/ui/ImageUploader";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  fetchDashboardEvents,
  updateDashboardEvent,
  updateEventCollage,
} from "@/lib/dashboardApi";

const BG = "#0A0A0F";
const CARD = "#111118";
const PURPLE = "#9B7FCA";
const TEXT = "#F9FAFB";
const BORDER = "rgba(255,255,255,0.08)";

type EventRow = {
  id: string;
  slug?: string;
  title: string;
  city?: string;
  startAt: string;
  endAt: string;
  coverImageUrl?: string | null;
  collagePhotos?: string[] | null;
  includeInCollage?: boolean;
  collageAuthorized?: boolean;
};

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-DO", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function daysAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / 86400000);
  if (d < 1) return "hoy";
  if (d === 1) return "hace 1 día";
  if (d < 30) return `hace ${d} días`;
  const m = Math.floor(d / 30);
  if (m === 1) return "hace 1 mes";
  if (m < 12) return `hace ${m} meses`;
  const y = Math.floor(d / 365);
  return y === 1 ? "hace 1 año" : `hace ${y} años`;
}

export default function DashboardCollagePage() {
  const { venue, venueId } = useDashboard();
  const [list, setList] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftByEvent, setDraftByEvent] = useState<Record<string, string[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [authorizingId, setAuthorizingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    id: string;
    ok: boolean;
    msg: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const res = await fetchDashboardEvents("past", venueId);
      const data = (res as { data?: EventRow[] })?.data ?? [];
      setList(data);
      setDraftByEvent((prev) => {
        const next: Record<string, string[]> = { ...prev };
        data.forEach((ev) => {
          if (!(ev.id in next)) {
            next[ev.id] = Array.isArray(ev.collagePhotos)
              ? ev.collagePhotos
              : [];
          }
        });
        return next;
      });
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || !list.length) return;
    const o = new URLSearchParams(window.location.search).get("open");
    if (!o || !list.some((e) => e.id === o)) return;
    setOpenId(o);
    const next = new URL(window.location.href);
    next.searchParams.delete("open");
    const path = next.pathname + (next.search && next.search !== "?" ? next.search : "");
    window.history.replaceState(null, "", path);
  }, [list]);

  const stats = useMemo(() => {
    const total = list.length;
    const withPhotos = list.filter(
      (e) => (e.collagePhotos?.length ?? 0) > 0,
    ).length;
    const totalPhotos = list.reduce(
      (acc, e) => acc + (e.collagePhotos?.length ?? 0),
      0,
    );
    return { total, withPhotos, totalPhotos };
  }, [list]);

  function setDraftFor(evId: string, urls: string[]) {
    setDraftByEvent((prev) => ({ ...prev, [evId]: urls }));
  }

  async function handleAuthorize(ev: EventRow) {
    if (!venueId) return;
    setAuthorizingId(ev.id);
    setFeedback(null);
    try {
      await updateDashboardEvent(ev.id, { collageAuthorized: true }, venueId);
      setList((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, collageAuthorized: true } : e)),
      );
      setFeedback({
        id: ev.id,
        ok: true,
        msg: "Autorizado. Ya puedes subir y guardar fotos del collage.",
      });
    } catch (err) {
      setFeedback({
        id: ev.id,
        ok: false,
        msg: err instanceof Error ? err.message : "No se pudo autorizar",
      });
    } finally {
      setAuthorizingId(null);
    }
  }

  async function handleSave(ev: EventRow) {
    if (!venueId) return;
    if (ev.includeInCollage === false || ev.collageAuthorized !== true) {
      setFeedback({
        id: ev.id,
        ok: false,
        msg: "Autoriza la publicación en Collage o activa «Añadir al collage» en el evento.",
      });
      return;
    }
    setSavingId(ev.id);
    setFeedback(null);
    const photos = draftByEvent[ev.id] ?? [];
    try {
      const res = await updateEventCollage(ev.id, photos, venueId);
      const saved = res?.collagePhotos ?? photos;
      setList((prev) =>
        prev.map((e) =>
          e.id === ev.id ? { ...e, collagePhotos: saved } : e,
        ),
      );
      setDraftByEvent((prev) => ({ ...prev, [ev.id]: saved }));
      setFeedback({
        id: ev.id,
        ok: true,
        msg: `Guardado · ${saved.length} foto${saved.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      setFeedback({
        id: ev.id,
        ok: false,
        msg: err instanceof Error ? err.message : "Error al guardar",
      });
    } finally {
      setSavingId(null);
    }
  }

  function hasChanges(ev: EventRow) {
    const draft = draftByEvent[ev.id] ?? [];
    const saved = ev.collagePhotos ?? [];
    if (draft.length !== saved.length) return true;
    return draft.some((u, i) => u !== saved[i]);
  }

  if (loading) {
    return (
      <div className="space-y-4" style={{ background: BG }}>
        <div
          className="h-10 animate-pulse rounded-md bg-white/[0.06]"
          style={{ maxWidth: 360 }}
        />
        <div className="h-28 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-28 animate-pulse rounded-lg bg-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: BG, color: TEXT }}>
      {/* Header */}
      <div
        className="rounded-2xl p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(155,127,202,0.12) 0%, rgba(155,127,202,0.04) 100%)",
          border: `1px solid rgba(155,127,202,0.2)`,
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#D4C2EE]">
              ✨ Recuerdos del local
            </div>
            <h1 className="mt-3 text-2xl font-bold text-white md:text-[28px]">
              Collage de eventos pasados
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm text-white/55">
              Las fotos solo se publican en /collage y en el recap del evento
              si activaste <strong>«Añadir al collage»</strong> al crear/editar
              el evento y, una vez finalizado, das{" "}
              <strong>autorización en esta página</strong> para publicar. Después
              de eso puedes subir y guardar las imágenes del recap.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center sm:min-w-[260px]">
            <Stat label="Eventos" value={stats.total} />
            <Stat label="Con fotos" value={stats.withPhotos} />
            <Stat label="Fotos" value={stats.totalPhotos} />
          </div>
        </div>
      </div>

      {/* Lista de eventos pasados */}
      {list.length === 0 ? (
        <div
          className="rounded-lg px-8 py-14 text-center text-sm"
          style={{
            background: CARD,
            border: `1px solid ${BORDER}`,
            color: "#9CA3AF",
          }}
        >
          Todavía no tienes eventos finalizados en{" "}
          <span className="text-white">{venue?.name ?? "tu local"}</span>.
          Cuando un evento termine aparecerá aquí para que puedas añadir
          recuerdos.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((ev) => {
            const isOpen = openId === ev.id;
            const draft = draftByEvent[ev.id] ?? [];
            const saved = ev.collagePhotos ?? [];
            const changed = hasChanges(ev);
            const showFeedback = feedback?.id === ev.id;
            const collageOff = ev.includeInCollage === false;
            const canPublishCollage =
              !collageOff && ev.collageAuthorized === true;
            const needsAuth = !collageOff && ev.collageAuthorized !== true;

            return (
              <div
                key={ev.id}
                className="rounded-lg"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                {/* Fila principal (click para expandir) */}
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : ev.id)}
                  className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[0.02]"
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-24">
                    {ev.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ev.coverImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center text-[10px]"
                        style={{ background: "#0A0A0F", color: "#6B7280" }}
                      >
                        Sin imagen
                      </div>
                    )}
                    {saved.length > 0 && (
                      <span className="absolute left-1 top-1 rounded-md bg-[#9B7FCA] px-1.5 py-0.5 text-[10px] font-bold text-[#0A0A0F]">
                        {saved.length}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-white">
                        {ev.title}
                      </h2>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/55">
                        {daysAgo(ev.endAt)}
                      </span>
                      {collageOff && (
                        <span
                          className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200"
                          title="No aparece en /collage ni se muestran recuerdos al público"
                        >
                          Collage desactivado en el evento
                        </span>
                      )}
                      {needsAuth && (
                        <span
                          className="rounded-full border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-2 py-0.5 text-[10px] font-medium text-[#D4C2EE]"
                          title="Confirma la publicación en collage para habilitar la subida de fotos"
                        >
                          Pendiente de autorizar
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      {formatWhen(ev.startAt)}
                      {ev.city ? ` · ${ev.city}` : ""}
                    </p>
                    <p className="mt-1.5 text-xs text-white/40">
                      {collageOff
                        ? "Activa el collage al editar el evento (Eventos) para poder publicar"
                        : needsAuth
                          ? "Abre y confirma «Autorizar» para publicar y subir fotos"
                          : saved.length === 0
                            ? "Sin fotos aún — abre y sube el recap"
                            : `${saved.length} foto${saved.length === 1 ? "" : "s"} guardada${saved.length === 1 ? "" : "s"} (público)`}
                    </p>
                  </div>

                  <div className="shrink-0 text-xs font-medium text-[#9B7FCA]">
                    {isOpen ? "Cerrar ▲" : "Abrir ▼"}
                  </div>
                </button>

                {/* Panel expandido con uploader */}
                {isOpen && (
                  <div
                    className="border-t px-4 pb-4 pt-4 sm:px-6 sm:pb-6"
                    style={{ borderColor: BORDER }}
                  >
                    {collageOff && (
                      <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-100">
                        Tienes desactivado <strong>«Añadir al collage público»</strong> en la edición de este
                        evento. <strong>No podrás publicar recuerdos</strong> hasta que lo actives en{" "}
                        <a href="/dashboard/eventos" className="font-semibold text-white underline">
                          Eventos
                        </a>{" "}
                        → Editar.
                      </div>
                    )}

                    {needsAuth && (
                      <div className="mb-3 rounded-lg border border-[#9B7FCA]/25 bg-[#9B7FCA]/10 px-3 py-2.5 text-xs text-white/80">
                        <p>
                          <strong>Publicación en el collage</strong> — el evento quedará en /collage y se
                          mostrará el recap en la página pública <strong>solo</strong> después de
                          confirmar. Hasta entonces <strong>no se pueden subir fotos</strong> (el sistema lo
                          bloquea en backend).
                        </p>
                        <button
                          type="button"
                          disabled={authorizingId === ev.id}
                          onClick={() => void handleAuthorize(ev)}
                          className="mt-2.5 rounded-md px-3 py-1.5 text-xs font-semibold text-[#0A0A0F] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ background: PURPLE }}
                        >
                          {authorizingId === ev.id ? "Autorizando…" : "Autorizar y habilitar subida de fotos"}
                        </button>
                      </div>
                    )}

                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/40">
                        Fotos del recap
                      </p>
                      {showFeedback && (
                        <span
                          className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            background: feedback!.ok
                              ? "rgba(34,197,94,0.1)"
                              : "rgba(239,68,68,0.1)",
                            color: feedback!.ok ? "#4ade80" : "#f87171",
                            border: `1px solid ${
                              feedback!.ok
                                ? "rgba(34,197,94,0.35)"
                                : "rgba(239,68,68,0.35)"
                            }`,
                          }}
                        >
                          {feedback!.msg}
                        </span>
                      )}
                    </div>

                    {canPublishCollage && (
                      <>
                        <div className="rounded-xl border border-white/[0.06] bg-[#0D0D14] p-3">
                          <ImageUploader
                            key={ev.id}
                            multiple
                            label="Arrastra o selecciona fotos (JPG, PNG, WebP)"
                            initialGallery={draft}
                            onUploadMultiple={(urls) => setDraftFor(ev.id, urls)}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={!changed || savingId === ev.id}
                            onClick={() => {
                              setDraftByEvent((prev) => ({
                                ...prev,
                                [ev.id]: saved,
                              }));
                              setFeedback(null);
                            }}
                            className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-white/[0.04] disabled:opacity-40"
                            style={{ borderColor: BORDER, color: "#D1D5DB" }}
                          >
                            Descartar cambios
                          </button>
                          <button
                            type="button"
                            disabled={!changed || savingId === ev.id}
                            onClick={() => void handleSave(ev)}
                            className="rounded-md px-4 py-1.5 text-xs font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                            style={{ background: PURPLE, color: "#0A0A0F" }}
                          >
                            {savingId === ev.id
                              ? "Guardando…"
                              : changed
                                ? "Guardar collage"
                                : "Sin cambios"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <p className="text-[11px] uppercase tracking-wider text-white/40">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-black text-white">{value}</p>
    </div>
  );
}
