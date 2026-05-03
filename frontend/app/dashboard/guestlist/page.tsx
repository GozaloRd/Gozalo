"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchDashboardEvents } from "@/lib/dashboardApi";
import {
  createGuestEntry,
  deleteGuestEntry,
  fetchEventGuestList,
  updateGuestEntry,
  type GuestListEntry,
  type GuestListStatus,
  type GuestListSummary,
} from "@/lib/guestlistApi";

type EventRow = { id: string; title: string; startAt: string; status?: string };

const CATEGORIES = ["VIP", "Prensa", "Artista", "Staff", "Cortesía dueño", "Promotor", "Familia"];

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DashboardGuestListPage() {
  const { venueId } = useDashboard();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [rows, setRows] = useState<GuestListEntry[]>([]);
  const [summary, setSummary] = useState<GuestListSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);
  const [qrOpenFor, setQrOpenFor] = useState<GuestListEntry | null>(null);

  const loadEvents = useCallback(async () => {
    if (!venueId) return;
    try {
      const res = await fetchDashboardEvents("upcoming", venueId);
      const data = ((res as { data?: EventRow[] })?.data || []) as EventRow[];
      setEvents(data);
      if (data.length && !eventId) setEventId(data[0].id);
    } catch {
      setEvents([]);
    }
  }, [venueId, eventId]);

  const loadList = useCallback(async () => {
    if (!venueId || !eventId) {
      setRows([]);
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetchEventGuestList(eventId, venueId);
      setRows(res?.data || []);
      setSummary(res?.summary || null);
    } catch {
      setRows([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [venueId, eventId]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);
  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function handleCreate(form: {
    fullName: string;
    phone?: string;
    email?: string;
    partySize?: number;
    category?: string;
    notes?: string;
  }) {
    if (!venueId || !eventId) return;
    try {
      await createGuestEntry(eventId, form, venueId);
      setShowForm(false);
      setFlash({ ok: true, msg: "Invitado añadido." });
      await loadList();
    } catch (e) {
      setFlash({ ok: false, msg: e instanceof Error ? e.message : "Error al crear" });
    }
  }

  async function handleStatus(id: string, status: GuestListStatus) {
    if (!venueId || !eventId) return;
    try {
      await updateGuestEntry(eventId, id, { status }, venueId);
      await loadList();
    } catch (e) {
      setFlash({ ok: false, msg: e instanceof Error ? e.message : "Error" });
    }
  }

  async function handleDelete(id: string) {
    if (!venueId || !eventId) return;
    if (!confirm("¿Eliminar invitado de la lista?")) return;
    try {
      await deleteGuestEntry(eventId, id, venueId);
      setFlash({ ok: true, msg: "Invitado eliminado." });
      await loadList();
    } catch (e) {
      setFlash({ ok: false, msg: e instanceof Error ? e.message : "Error" });
    }
  }

  const categorized = useMemo(() => {
    const map = new Map<string, GuestListEntry[]>();
    for (const r of rows) {
      const key = r.category || "Otros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [rows]);

  if (!venueId) {
    return <div className="py-16 text-center text-slate-500">Selecciona un local para ver la guestlist.</div>;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#C77DFF]/80">Guestlist VIP · Cortesías</p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">Invitados del evento</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Añade prensa, artistas, staff y cortesías del dueño. Reciben un QR único que escanean en puerta pero{" "}
            <strong className="text-[#E0AAFF]">no consume aforo pagable</strong> — se contabiliza aparte para tu planificación.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex min-w-[260px] rounded-xl border border-white/10 bg-[#111118] p-1">
            <select
              value={eventId || ""}
              onChange={(e) => setEventId(e.target.value || null)}
              className="w-full rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-white outline-none"
            >
              {events.length === 0 && <option value="">Sin eventos</option>}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="bg-[#111118]">
                  {ev.title} · {fmt(ev.startAt)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={!eventId}
            className="inline-flex items-center gap-2 rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C]/40 to-[#9B7FCA]/15 px-4 py-2.5 text-sm font-extrabold text-white transition-all hover:border-[#E0AAFF]/70 disabled:opacity-50"
          >
            <IconPlus /> Añadir invitado
          </button>
        </div>
      </header>

      {flash && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            flash.ok
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200"
          }`}
        >
          {flash.msg}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Entradas activas" value={summary?.totalEntries ?? 0} />
        <Stat label="Total de personas" value={summary?.totalGuests ?? 0} accent />
        <Stat label="Ya dentro" value={summary?.checkedIn ?? 0} tone="emerald" />
      </div>

      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-white/[0.06] bg-[#111118]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#111118] px-6 py-16 text-center">
          <p className="text-lg font-bold text-white">No hay invitados en esta lista</p>
          <p className="mt-1 text-sm text-slate-400">
            Añade el primero para generar su QR de entrada VIP.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {categorized.map(([cat, list]) => (
            <div key={cat} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111118]">
              <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E0AAFF]">
                  {cat} · {list.length}
                </p>
                <p className="text-xs text-slate-500">
                  {list.reduce((a, g) => a + g.partySize, 0)} personas
                </p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {list.map((g) => (
                  <div key={g.id} className="grid grid-cols-12 items-center gap-3 px-5 py-3.5 text-sm">
                    <div className="col-span-4 min-w-0">
                      <p className="truncate font-semibold text-white">{g.fullName}</p>
                      <p className="truncate text-xs text-slate-400">
                        {g.email || g.phone || g.notes || "—"}
                      </p>
                    </div>
                    <div className="col-span-1 text-center text-sm font-bold tabular-nums text-white">
                      +{g.partySize}
                    </div>
                    <div className="col-span-3">
                      <StatusPill status={g.status} />
                    </div>
                    <div className="col-span-4 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQrOpenFor(g)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-[#C77DFF]/40 hover:bg-[#C77DFF]/10 hover:text-[#E0AAFF]"
                      >
                        Ver QR
                      </button>
                      {g.status !== "checked_in" && (
                        <button
                          type="button"
                          onClick={() => handleStatus(g.id, "checked_in")}
                          className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/60"
                        >
                          Check-in
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white/60 transition hover:border-rose-400/40 hover:text-rose-200"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && eventId && (
        <GuestFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}

      {qrOpenFor && (
        <QrModal entry={qrOpenFor} onClose={() => setQrOpenFor(null)} />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
  tone?: "emerald";
}) {
  const theme =
    tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-500/5"
      : accent
      ? "border-[#C77DFF]/30 bg-gradient-to-br from-[#1a1326] via-[#111118] to-[#111118]"
      : "border-white/10 bg-[#111118]";
  return (
    <div className={`rounded-2xl border p-4 ${theme}`}>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: GuestListStatus }) {
  const cfg: Record<GuestListStatus, { label: string; cls: string }> = {
    pending: { label: "Pendiente", cls: "border-white/15 bg-white/5 text-slate-300" },
    checked_in: { label: "Ya entró", cls: "border-emerald-400/35 bg-emerald-500/10 text-emerald-300" },
    no_show: { label: "No vino", cls: "border-amber-400/30 bg-amber-500/10 text-amber-200" },
    cancelled: { label: "Cancelado", cls: "border-white/10 bg-white/5 text-slate-500" },
  };
  const c = cfg[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider ${c.cls}`}>
      {c.label}
    </span>
  );
}

function GuestFormModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (f: {
    fullName: string;
    phone?: string;
    email?: string;
    partySize?: number;
    category?: string;
    notes?: string;
  }) => Promise<void>;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [category, setCategory] = useState("VIP");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || busy) return;
    setBusy(true);
    await onSubmit({
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      partySize,
      category,
      notes: notes.trim() || undefined,
    });
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111118] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
      >
        <h2 className="text-xl font-bold text-white">Añadir invitado VIP</h2>
        <p className="mt-1 text-xs text-slate-400">
          Genera un QR único. No consume aforo pagable del evento.
        </p>

        <div className="mt-5 grid gap-3">
          <Field label="Nombre completo *">
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#C77DFF]/50"
              placeholder="Ej: Carolina Méndez"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Teléfono">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#C77DFF]/50"
                placeholder="+1 809 555 1234"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#C77DFF]/50"
                placeholder="nombre@correo.com"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Personas (incluye titular)">
              <input
                type="number"
                min={1}
                max={50}
                value={partySize}
                onChange={(e) => setPartySize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#C77DFF]/50"
              />
            </Field>
            <Field label="Categoría">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#C77DFF]/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Notas (solo para el staff)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#C77DFF]/50"
              placeholder="Ej: viene con el dueño a las 22h"
            />
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || !fullName.trim()}
            className="rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C]/60 to-[#9B7FCA]/30 px-5 py-2 text-sm font-extrabold text-white disabled:opacity-50"
          >
            {busy ? "Creando…" : "Añadir"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function QrModal({ entry, onClose }: { entry: GuestListEntry; onClose: () => void }) {
  // Usamos quickchart.io como generador de QR para no meter libs nuevas — SVG crisp.
  const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(entry.qrPayload)}&size=380&margin=2&dark=111118&light=ffffff`;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111118] p-6 text-center"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[#C77DFF]/80">Pase VIP</p>
        <h2 className="mt-2 text-xl font-bold text-white">{entry.fullName}</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          {entry.category} · {entry.partySize} persona{entry.partySize === 1 ? "" : "s"}
        </p>
        <div className="mx-auto my-5 flex h-[320px] w-[320px] items-center justify-center overflow-hidden rounded-xl bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR" className="h-full w-full object-contain" />
        </div>
        <p className="break-all rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[10px] font-mono text-slate-400">
          {entry.qrPayload}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(entry.qrPayload);
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Copiar código
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C]/60 to-[#9B7FCA]/30 px-5 py-2 text-sm font-bold text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
