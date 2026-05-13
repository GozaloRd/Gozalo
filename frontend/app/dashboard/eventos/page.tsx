"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EventWizard } from "@/components/dashboard/EventWizard";
import { CreateEventWizard } from "@/components/dashboard/wizard/CreateEventWizard";
import { useIsMobile } from "@/hooks/useMediaQuery";
import RecurrenceModal from "@/components/dashboard/RecurrenceModal";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  cancelDashboardEvent,
  updateDashboardEvent,
  fetchDashboardEvents,
} from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

const BG = "#0A0A0F";
const CARD = "#111118";
const GOLD = "#9B7FCA";
const TEXT = "#F9FAFB";
const BORDER = "rgba(255,255,255,0.08)";

type EventRow = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  city?: string;
  startAt: string;
  endAt: string;
  status: string;
  coverImageUrl?: string;
  /** Plano mesas (wizard) */
  tableLayoutImageUrl?: string | null;
  images?: string[] | null;
  basePrice?: number | string | null;
  maxCapacity?: number | string | null;
  featured?: boolean;
  requiresCoverForTable?: boolean;
  destacado?: boolean;
  publicado?: boolean;
  ticketSaleMode?: string;
  metricas?: {
    ticketsVendidos?: number;
    reservasHechas?: number;
    ingresosEstimadosRD?: number;
  };
  ticketTypes?: {
    id: string;
    name: string;
    price: string | number;
    quantityTotal?: number | null;
    showQuantityPublic?: boolean;
    description?: string | null;
  }[];
};

type FilterTab = "all" | "published" | "draft" | "past";

const TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "published", label: "Publicados" },
  { id: "draft", label: "Borradores" },
  { id: "past", label: "Pasados" },
];

function StatusBadgeRow({ ev }: { ev: EventRow }) {
  const st = ev.status;
  const items: { key: string; label: string; className: string }[] = [];

  if (st === "published") {
    items.push({
      key: "pub",
      label: "Publicado",
      className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-400",
    });
  } else if (st === "draft") {
    items.push({
      key: "draft",
      label: "Borrador",
      className: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400",
    });
  } else if (st === "cancelled") {
    items.push({
      key: "canc",
      label: "Cancelado",
      className: "border-red-500/35 bg-red-500/10 text-red-400",
    });
  }

  if ((ev.destacado ?? ev.featured) && (ev.publicado ?? st === "published")) {
    items.push({
      key: "feat",
      label: "Destacado",
      className: "border-[#9B7FCA]/50 bg-[#9B7FCA]/10 text-[#9B7FCA]",
    });
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {items.map((b) => (
        <span
          key={b.key}
          className={`rounded-md border px-2.5 py-1 text-[11px] font-medium ${b.className}`}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}

function formatEventWhen(startAt: string, endAt: string) {
  const d1: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  const d2: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  };
  return `${new Date(startAt).toLocaleString("es-DO", d1)} — ${new Date(endAt).toLocaleString("es-DO", d2)}`;
}

export default function DashboardEventosPage() {
  const { venue, venueId } = useDashboard();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const ownerBlocked =
    venue?.status === "pending" || venue?.status === "rejected";
  const [list, setList] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<FilterTab>("all");
  const [searchQ, setSearchQ] = useState("");
  const [recurrenceFor, setRecurrenceFor] = useState<EventRow | null>(null);
  const LIVE_SYNC_MS = 5_000;

  useEffect(() => {
    const t = searchParams?.get("tab");
    if (t === "all" || t === "published" || t === "draft" || t === "past") {
      setTab(t);
    }
    setSearchQ(searchParams?.get("q") ?? "");
  }, [searchParams]);

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const res = await fetchDashboardEvents("all", venueId);
      const rows = (res as { data?: EventRow[] })?.data ?? [];
      // UX: no mostrar eventos cancelados en la lista del local.
      setList(rows.filter((ev) => ev.status !== "cancelled"));
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
    const id = window.setInterval(() => {
      void load();
    }, LIVE_SYNC_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const filtered = useMemo(() => {
    const ql = searchQ.trim().toLowerCase();
    return list.filter((ev) => {
      if (ev.status === "cancelled") return false;
      if (
        ql &&
        !ev.title.toLowerCase().includes(ql) &&
        !(ev.description?.toLowerCase().includes(ql) ?? false) &&
        !(ev.city?.toLowerCase().includes(ql) ?? false)
      ) {
        return false;
      }
      const isPublished = ev.publicado ?? ev.status === "published";
      const isPast = new Date(ev.endAt) < new Date();
      if (tab === "all") return true;
      if (tab === "published") return isPublished;
      if (tab === "draft") return ev.status === "draft";
      if (tab === "past") return isPast;
      return true;
    });
  }, [list, tab, searchQ]);

  async function patchEvent(id: string, body: Record<string, unknown>) {
    if (!venueId) return;
    setBusyId(id);
    try {
      const res = (await updateDashboardEvent(id, body, venueId)) as {
        evento?: EventRow;
      };
      const next = res.evento;
      if (next) {
        setList((prev) => prev.map((e) => (e.id === id ? { ...e, ...next } : e)));
      } else {
        await load();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(ev: EventRow) {
    if (!venueId) return;
    const hasPurchases =
      Number(ev.metricas?.ticketsVendidos ?? 0) > 0 ||
      Number(ev.metricas?.ingresosEstimadosRD ?? 0) > 0;
    if (hasPurchases) {
      alert(
        "Este evento ya tiene compras. No se puede eliminar, pero sí puedes editarlo para ajustar mesas, boletas u otros datos."
      );
      return;
    }
    if (!confirm("¿Eliminar este evento? Se removerá de tu lista de eventos.")) return;
    setBusyId(ev.id);
    const previous = list;
    setList((prev) => prev.filter((e) => e.id !== ev.id));
    try {
      await cancelDashboardEvent(ev.id, venueId);
    } catch (err) {
      setList(previous);
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" style={{ background: BG }}>
        <div className="h-10 animate-pulse rounded-md bg-white/[0.06]" style={{ maxWidth: 360 }} />
        <div className="h-24 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-24 animate-pulse rounded-lg bg-white/[0.06]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ background: BG, color: TEXT }}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="inline-flex max-w-full flex-wrap rounded-md p-0.5"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
            role="tablist"
            aria-label="Filtrar eventos"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className="rounded px-3 py-2 text-sm font-medium transition duration-150"
                style={{
                  background: tab === t.id ? "rgba(255,255,255,0.06)" : "transparent",
                  color: tab === t.id ? TEXT : "#9CA3AF",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={ownerBlocked}
            title={
              ownerBlocked
                ? "Tu local debe estar aprobado para crear eventos"
                : undefined
            }
            onClick={() => {
              setEditing(null);
              setWizard("create");
            }}
            className="w-full shrink-0 rounded-md px-4 py-2.5 text-sm font-semibold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
            style={{ background: GOLD, color: "#0A0A0F" }}
          >
            Nuevo Evento
          </button>
        </div>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Buscar por nombre, ciudad…"
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#9B7FCA]/35"
          style={{
            background: "#111118",
            borderColor: BORDER,
            color: TEXT,
          }}
          aria-label="Buscar eventos"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div
            className="rounded-lg px-8 py-14 text-center text-sm"
            style={{ background: CARD, border: `1px solid ${BORDER}`, color: "#9CA3AF" }}
          >
            No hay eventos en esta vista.
          </div>
        )}

        {filtered.map((ev) => {
          const busy = busyId === ev.id;
          const isPub = ev.publicado ?? ev.status === "published";
          const isDraft = ev.status === "draft";
          const isCancelled = ev.status === "cancelled";
          const isHighlighted = ev.destacado ?? ev.featured;
          const hasPurchases =
            Number(ev.metricas?.ticketsVendidos ?? 0) > 0 ||
            Number(ev.metricas?.ingresosEstimadosRD ?? 0) > 0;
          const thumb = ev.coverImageUrl;
          const isPast = new Date(ev.endAt) < new Date();

          return (
            <div
              key={ev.id}
              className="flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-stretch sm:gap-5"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-md sm:h-auto sm:w-28 md:w-32">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="h-full w-full bg-[#0a0a0f] object-contain object-center p-1" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center text-[10px] font-medium"
                    style={{ background: "#0A0A0F", color: "#6B7280" }}
                  >
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-snug" style={{ color: TEXT }}>
                  {ev.title}
                </h2>
                <p className="mt-1 text-sm" style={{ color: "#9CA3AF" }}>
                  {venue?.name ?? "Tu local"}
                </p>
                <p className="mt-2 text-xs tabular-nums" style={{ color: "#9CA3AF" }}>
                  {formatEventWhen(ev.startAt, ev.endAt)}
                </p>
                <p className="mt-1 text-xs" style={{ color: "#6B7280" }}>
                  {ev.city ?? "—"}
                  {ev.category ? ` · ${ev.category}` : ""}
                </p>
                <p className="mt-2 text-xs" style={{ color: "#6B7280" }}>
                  Tickets {ev.metricas?.ticketsVendidos ?? 0} · Reservas{" "}
                  {ev.metricas?.reservasHechas ?? 0} ·{" "}
                  {formatMoney(Number(ev.metricas?.ingresosEstimadosRD ?? 0))}
                </p>
                {ev.slug && isPub && (
                  <Link
                    href={`/e/${ev.slug}`}
                    className="mt-2 inline-block text-xs font-medium hover:underline"
                    style={{ color: GOLD }}
                  >
                    Ver en sitio público →
                  </Link>
                )}
                {isPast && (
                  <Link
                    href={`/dashboard/collage?open=${encodeURIComponent(ev.id)}`}
                    className="mt-2 block text-xs font-medium text-[#D4C2EE] hover:underline"
                  >
                    Subir fotos al collage →
                  </Link>
                )}
              </div>

              <div className="flex flex-col gap-4 sm:min-w-[200px] sm:items-end">
                <StatusBadgeRow ev={ev} />

                <div className="flex flex-wrap justify-end gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2">
                  {(isDraft || ev.status === "paused") && !isCancelled && (
                    <button
                      type="button"
                      disabled={busy || ownerBlocked}
                      onClick={() => void patchEvent(ev.id, { status: "published" })}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-white/[0.04] disabled:opacity-50"
                      style={{ borderColor: BORDER, color: TEXT }}
                    >
                      Publicar
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy || ownerBlocked}
                    onClick={() => {
                      setEditing(ev);
                      setWizard("edit");
                    }}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-white/[0.04] disabled:opacity-50"
                    style={{ borderColor: BORDER, color: TEXT }}
                  >
                    Editar
                  </button>
                  {isPub && (
                    <button
                      type="button"
                      disabled={busy || ownerBlocked}
                      onClick={() => void patchEvent(ev.id, { destacado: !isHighlighted, status: "published" })}
                      className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-white/[0.04] disabled:opacity-50"
                      style={{
                        borderColor: "rgba(155, 127, 202, 0.35)",
                        color: GOLD,
                      }}
                    >
                      {isHighlighted ? "⭐ Quitar destacado" : "⭐ Destacar"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy || ownerBlocked}
                    onClick={() => setRecurrenceFor(ev)}
                    className="rounded-md border border-[#C77DFF]/35 bg-[#C77DFF]/5 px-3 py-1.5 text-xs font-medium text-[#E0AAFF] transition hover:bg-[#C77DFF]/10 disabled:opacity-50"
                    title="Crear copias semanales de este evento"
                  >
                    Repetir semanal
                  </button>
                  {!isCancelled && (
                    <button
                      type="button"
                      disabled={busy || ownerBlocked || hasPurchases}
                      onClick={() => void handleDelete(ev)}
                      className="rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      title={
                        hasPurchases
                          ? "No puedes eliminar un evento con compras. Puedes editarlo."
                          : "Eliminar evento"
                      }
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {wizard && venueId && isMobile && (
        <CreateEventWizard
          venueId={venueId}
          venueCity={venue?.city}
          venueName={venue?.name}
          venueAddress={venue?.address ?? ""}
          initial={
            wizard === "edit" && editing
              ? (editing as unknown as Record<string, unknown>)
              : null
          }
          onClose={() => {
            setWizard(null);
            setEditing(null);
          }}
          onSaved={() => void load()}
        />
      )}

      {wizard && venueId && !isMobile && (
        <EventWizard
          venueId={venueId}
          venueCity={venue?.city}
          initial={wizard === "edit" && editing ? editing : null}
          onClose={() => {
            setWizard(null);
            setEditing(null);
          }}
          onSaved={() => void load()}
        />
      )}

      {recurrenceFor && (
        <RecurrenceModal
          sourceEvent={{
            id: recurrenceFor.id,
            title: recurrenceFor.title,
            startAt: recurrenceFor.startAt,
          }}
          onClose={() => setRecurrenceFor(null)}
          onCreated={() => void load()}
        />
      )}
    </div>
  );
}
