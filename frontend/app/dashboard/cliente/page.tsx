"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ReservationCard } from "@/components/customer/ReservationCard";
import { TicketCard } from "@/components/customer/TicketCard";
import {
  deleteMyReservation,
  fetchMyReservations,
  fetchMyTickets,
  type MyReservation,
  type MyTicket,
} from "@/lib/customerApi";
import { fetchAuthMe, updateAuthProfile, type AuthUser } from "@/lib/authApi";
import { formatMoney } from "@/lib/format";

type Tab = "tickets" | "reservas" | "perfil" | "guardados";

function isPastEvent(iso?: string) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export default function ClienteDashboardPage() {
  const [tab, setTab] = useState<Tab>("tickets");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tickets, setTickets] = useState<MyTicket[]>([]);
  const [reservas, setReservas] = useState<MyReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, t, r] = await Promise.all([
        fetchAuthMe(),
        fetchMyTickets().catch(() => []),
        fetchMyReservations().catch(() => []),
      ]);
      setUser(u);
      setTickets(t);
      setReservas(r);
      if (u) {
        setFullName(u.fullName);
        setPhone(u.phone ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { activeTickets, pastTickets } = useMemo(() => {
    const active: MyTicket[] = [];
    const past: MyTicket[] = [];
    for (const t of tickets) {
      const end = t.event?.endAt || t.event?.startAt;
      if (isPastEvent(end || t.event?.startAt)) past.push(t);
      else active.push(t);
    }
    return { activeTickets: active, pastTickets: past };
  }, [tickets]);

  const { activeRes, pastRes } = useMemo(() => {
    const active: MyReservation[] = [];
    const past: MyReservation[] = [];
    for (const r of reservas) {
      const evEnd = r.event?.startAt;
      if (r.status === "cancelled" || isPastEvent(evEnd)) past.push(r);
      else active.push(r);
    }
    return { activeRes: active, pastRes: past };
  }, [reservas]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const u = await updateAuthProfile({ fullName, phone: phone || null });
      setUser(u);
    } finally {
      setSaving(false);
    }
  }

  async function cancelReservation(id: string) {
    if (!confirm("¿Cancelar esta reserva?")) return;
    await deleteMyReservation(id);
    await load();
  }

  const attended = pastTickets.length;
  const points = user?.points ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-white/[0.08] pb-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#9B7FCA]/20 text-xl font-bold text-[#9B7FCA]">
            {user?.fullName?.charAt(0)?.toUpperCase() ?? "?"}
          </span>
          <div>
            <p className="text-lg font-semibold text-[#F9FAFB]">
              Hola, {user?.fullName?.split(" ")[0] ?? "invitado"}! 👋
            </p>
            <p className="text-sm text-[#6B7280]">
              ⭐ {points} puntos · <span className="text-[#B39CD8]">Cliente Frecuente 🥈</span>
            </p>
          </div>
        </div>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-3">
        {[
          { label: "Eventos asistidos", value: attended },
          { label: "Tickets comprados", value: tickets.length },
          { label: "Reservas", value: reservas.length },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-white/[0.08] bg-[#111118] px-3 py-4 text-center"
          >
            <p className="text-2xl font-bold text-[#F9FAFB]">{c.value}</p>
            <p className="text-[10px] uppercase tracking-wide text-[#6B7280]">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b border-white/[0.08] pb-2">
        {(
          [
            ["tickets", "🎟️ Mis Tickets"],
            ["reservas", "📋 Mis Reservas"],
            ["perfil", "👤 Mi Perfil"],
            ["guardados", "❤️ Guardados"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "bg-[#9B7FCA] text-white"
                : "text-[#9CA3AF] hover:bg-white/[0.05] hover:text-[#F9FAFB]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#6B7280]">Cargando…</p>
      ) : (
        <>
          {tab === "tickets" && (
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Entradas próximas</h2>
                {activeTickets.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">No tienes entradas próximas.</p>
                ) : (
                  <div className="grid gap-4">
                    {activeTickets.map((t) => {
                      return <TicketCard key={t.id} ticket={t} />;
                    })}
                  </div>
                )}
              </section>
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[#6B7280]">Entradas pasadas</h2>
                <div className="grid gap-4">
                  {pastTickets.map((t) => {
                    return <TicketCard key={t.id} ticket={t} history />;
                  })}
                </div>
              </section>
            </div>
          )}

          {tab === "reservas" && (
            <div className="space-y-8">
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase text-[#6B7280]">Reservas próximas</h2>
                {activeRes.length === 0 ? (
                  <p className="text-sm text-[#6B7280]">Sin reservas activas.</p>
                ) : (
                  <div className="grid gap-4">
                    {activeRes.map((r) => {
                      return <ReservationCard key={r.id} reservation={r} onCancel={(id) => void cancelReservation(id)} />;
                    })}
                  </div>
                )}
              </section>
              <section>
                <h2 className="mb-4 text-sm font-semibold uppercase text-[#6B7280]">Reservas pasadas</h2>
                <div className="grid gap-4">
                  {pastRes.map((r) => {
                    return <ReservationCard key={r.id} reservation={r} history />;
                  })}
                </div>
              </section>
            </div>
          )}

          {tab === "perfil" && (
            <form onSubmit={saveProfile} className="max-w-md space-y-4 rounded-2xl border border-white/[0.08] bg-[#111118] p-6">
              <div>
                <label className="text-xs uppercase text-[#6B7280]">Nombre completo</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0A0A0F] px-4 py-2 text-[#F9FAFB]"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#6B7280]">Email</label>
                <input
                  value={user?.email ?? ""}
                  readOnly
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2 text-[#6B7280]"
                />
              </div>
              <div>
                <label className="text-xs uppercase text-[#6B7280]">Teléfono</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/[0.08] bg-[#0A0A0F] px-4 py-2 text-[#F9FAFB]"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-[#9B7FCA] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
              <p className="text-xs text-[#6B7280]">Cambiar contraseña: próximamente desde recuperación de cuenta.</p>
            </form>
          )}

          {tab === "guardados" && (
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#111118]/40 px-6 py-12 text-center">
              <p className="text-[#9CA3AF]">No tienes eventos guardados</p>
              <Link href="/eventos" className="mt-4 inline-block text-[#9B7FCA] hover:underline">
                Explora eventos →
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
