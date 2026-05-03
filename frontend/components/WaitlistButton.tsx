"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMyWaitlistEntry,
  joinWaitlist,
  leaveWaitlist,
  type WaitlistEntry,
} from "@/lib/waitlistApi";
import { getToken } from "@/lib/api";

type Props = {
  eventId: string;
  /** Si sabes que el evento está agotado pásalo a true para que el botón sea más prominente. */
  soldOut?: boolean;
  className?: string;
};

export function WaitlistButton({ eventId, soldOut = false, className = "" }: Props) {
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const t = getToken();
      if (!t) {
        setEntry(null);
        setPosition(null);
        return;
      }
      const res = await getMyWaitlistEntry(eventId);
      if (res?.entry) {
        setEntry(res.entry);
        setPosition(res.position ?? null);
      } else {
        setEntry(null);
        setPosition(null);
      }
    } finally {
      setHydrated(true);
    }
  }, [eventId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const join = useCallback(async () => {
    const t = getToken();
    if (!t) {
      if (typeof window !== "undefined") {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      return;
    }
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await joinWaitlist(eventId, { partySize: 1 });
      setEntry(res.entry);
      setPosition(res.position);
      setMsg("Estás en la lista — te avisaremos en cuanto libere cupo.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No pudimos añadirte a la lista");
    } finally {
      setBusy(false);
    }
  }, [busy, eventId]);

  const leave = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await leaveWaitlist(eventId);
      setEntry(null);
      setPosition(null);
      setMsg("Saliste de la lista.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No pudimos sacarte de la lista");
    } finally {
      setBusy(false);
    }
  }, [busy, eventId]);

  if (!hydrated) return null;

  const isIn = !!entry && entry.status !== "cancelled" && entry.status !== "expired";
  const isOffered = entry?.status === "offered";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {isOffered ? (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <p className="font-bold">Cupo liberado para ti</p>
          <p className="mt-0.5 text-xs text-emerald-100/80">
            Ve a comprar ya antes de que pase al siguiente en la cola.
          </p>
        </div>
      ) : null}

      {isIn ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C77DFF]/35 bg-[#C77DFF]/10 px-3 py-1.5 text-xs font-bold text-[#E0AAFF]">
            <span className="h-2 w-2 rounded-full bg-[#C77DFF] shadow-[0_0_8px_rgba(199,125,255,0.8)]" />
            En lista de espera
            {position ? ` · #${position}` : null}
          </span>
          <button
            type="button"
            onClick={leave}
            disabled={busy}
            className="text-xs font-semibold text-white/60 underline-offset-2 transition-colors hover:text-white hover:underline disabled:opacity-50"
          >
            Salir de la lista
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={join}
          disabled={busy}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition-all disabled:opacity-60 ${
            soldOut
              ? "border-[#C77DFF]/50 bg-gradient-to-br from-[#5D2E8C]/60 to-[#9B7FCA]/30 text-white shadow-[0_0_16px_rgba(199,125,255,0.25)] hover:border-[#E0AAFF]/80"
              : "border-white/15 bg-white/5 text-white hover:border-[#C77DFF]/40 hover:bg-[#C77DFF]/10 hover:text-[#E0AAFF]"
          }`}
        >
          <IconBell />
          {soldOut ? "Agotado — avísame si libera cupo" : "Avísame si libera cupo"}
        </button>
      )}

      {msg ? <p className="text-xs text-white/55">{msg}</p> : null}
    </div>
  );
}

function IconBell() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
