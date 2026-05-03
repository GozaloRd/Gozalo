"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getToken, api } from "@/lib/api";
import type { MyTicket } from "@/lib/customerApi";
import { EventTicketPassCard } from "@/components/site/EventTicketPassCard";
import { TicketSectionsHeader } from "@/components/customer/TicketSectionsHeader";

function fmt(n: number | string) {
  return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

const STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  valid: "Válido",
  used: "Canjeado",
  pending: "Pendiente",
  cancelled: "Cancelado",
};

function statusLabelFor(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function isPastEvent(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function PassRow({ t, archive }: { t: MyTicket; archive: boolean }) {
  const e = t.event;
  const startAt = e?.startAt ?? t.createdAt;
  const st = String(t.status).toLowerCase();
  const showQr = st === "paid" || st === "valid" || st === "used";

  return (
    <li className="flex w-full list-none justify-center">
      <EventTicketPassCard
        eventTitle={e?.title ?? "Evento"}
        startAt={startAt}
        venueName={e?.venue?.name}
        city={e?.venue?.city}
        coverImageUrl={e?.coverImageUrl}
        ticketType={t.ticketType}
        priceLabel={fmt(t.unitPrice ?? 0)}
        qrImageUrl={showQr ? t.qrImage : null}
        qrPayload={showQr && !t.qrImage ? t.qrPayload : null}
        eventHref={archive ? undefined : e?.slug ? `/eventos/${e.slug}` : undefined}
        status={st}
        statusLabel={statusLabelFor(t.status)}
        className={archive ? "!opacity-[0.9] saturate-[0.88]" : ""}
      />
    </li>
  );
}

export default function MisEntradasPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [myTickets, setMyTickets] = useState<MyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    setAuthed(!!t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) return;
      const tickets = await api<MyTicket[]>("/api/tickets/my", { token });
      setMyTickets(tickets);
    } catch {
      setError("Error cargando tus entradas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) void load();
    else if (authed === false) setLoading(false);
  }, [authed, load]);

  if (authed === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-4xl">🎟️</div>
        <p className="text-slate-300">Inicia sesión para ver tus entradas.</p>
        <Link
          href="/login?next=/mis-entradas"
          className="rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] px-5 py-2.5 text-sm font-black text-white"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  const usableTickets = myTickets.filter((t) => {
    if (String(t.status).toLowerCase() === "cancelled") return false;
    return !isPastEvent(t.event?.endAt || t.event?.startAt);
  });
  const pastTickets = myTickets.filter((t) => {
    if (String(t.status).toLowerCase() === "cancelled") return true;
    return isPastEvent(t.event?.endAt || t.event?.startAt);
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-3 py-8 sm:px-4 sm:py-10 md:px-6">
      <div className="mb-9 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Mis entradas
        </h1>
        <p className="mt-2 text-base text-slate-400 sm:text-lg">
          Las que puedes usar y tu historial, ordenadas por sección.
        </p>
        <div className="mx-auto mt-5 flex w-full max-w-[260px] items-center justify-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9B7FCA]/50 to-[#C77DFF]/40" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#C77DFF]/80 shadow-[0_0_10px_rgba(199,125,255,0.7)]" />
          <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#9B7FCA]/50 to-[#C77DFF]/40" />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-14 text-center text-slate-400">Cargando tus entradas…</div>
      ) : myTickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <p className="text-3xl">🎟️</p>
          <p className="mt-3 font-semibold text-white">Sin entradas todavía</p>
          <p className="mt-1 text-sm text-slate-400">Encuentra un evento y compra tu entrada.</p>
          <Link
            href="/eventos"
            className="mt-4 inline-block rounded-xl border border-[#C77DFF]/40 bg-[#C77DFF]/10 px-4 py-2 text-sm font-bold text-[#E0AAFF]"
          >
            Ver eventos
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-14 pt-4">
          <div className="w-full">
            <TicketSectionsHeader
              eyebrow="Activas"
              title="Listas para usar"
              description="Tus próximos eventos y las entradas que aún tienen valor."
              count={usableTickets.length}
            />
            <ul className="mx-auto mt-8 flex w-full max-w-lg flex-col items-center gap-6 sm:gap-8">
              {usableTickets.length === 0 ? (
                <li className="list-none rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center text-sm text-slate-500">
                  No hay entradas utilizables por ahora. Si ya pasó la fecha del evento, verás tus pases aquí debajo.
                </li>
              ) : (
                usableTickets.map((t) => (
                  <PassRow key={t.id} t={t} archive={false} />
                ))
              )}
            </ul>
          </div>

          {pastTickets.length > 0 ? (
            <div className="w-full border-t border-white/[0.08] pt-14">
              <TicketSectionsHeader
                eyebrow="Historial"
                title="Eventos pasados"
                description="Compras y entradas de fechas ya celebradas."
                count={pastTickets.length}
              />
              <ul className="mx-auto mt-8 flex w-full max-w-lg flex-col items-center gap-6 sm:gap-8 opacity-95">
                {pastTickets.map((t) => (
                  <PassRow key={t.id} t={t} archive />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
