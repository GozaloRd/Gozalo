"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useMemo } from "react";
import { useEventTablesDetail } from "@/hooks/useEventTablesDetail";
import { reservationMatchesTable } from "@/lib/dashboardEventReservations";
import { formatMoney } from "@/lib/format";
import { paymentInfo } from "@/lib/reservationPayment";
import type { VenueTableRow } from "@/lib/dashboardApi";

type Props = {
  eventId: string;
  venueId: string | null;
  open: boolean;
  onClose: () => void;
};

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

function tableEstado(t: VenueTableRow): string {
  const raw = (t as VenueTableRow & { estadoEnEvento?: string | null }).estadoEnEvento;
  return raw && raw.length > 0 ? raw : "libre";
}

function labelEstado(st: string): { label: string; emoji: string; className: string } {
  if (st === "ocupada")
    return { label: "Bloqueada", emoji: "🔴", className: "text-red-400" };
  if (st === "reservada")
    return { label: "Reservada", emoji: "🟢", className: "text-emerald-400" };
  return { label: "Disponible", emoji: "⚪", className: "text-zinc-500" };
}

export function EventTablesPanel({ eventId, venueId, open, onClose }: Props) {
  const { tables, reservations, loading, error } = useEventTablesDetail(eventId, venueId, open);

  const rows = useMemo(() => {
    return tables.map((t) => {
      const matches = reservations.filter((r) => reservationMatchesTable(r, t));
      const st = tableEstado(t);
      const primary = matches[0];
      const cliente = primary?.cliente?.nombre?.trim() || primary?.cliente?.email || "—";
      const hora =
        primary?.createdAt != null
          ? new Date(primary.createdAt).toLocaleString("es-DO", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : null;
      const ingreso = matches.reduce((acc, r) => acc + paymentInfo(r).total, 0);
      return { table: t, matches, st, cliente, hora, ingreso };
    });
  }, [tables, reservations, eventId]);

  const summary = useMemo(() => {
    const total = rows.length;
    const reservadas = rows.filter(
      (r) => r.st === "reservada" || r.st === "ocupada" || r.matches.length > 0
    ).length;
    const ingresos = rows.reduce((acc, r) => acc + r.ingreso, 0);
    return { total, reservadas, ingresos };
  }, [rows]);

  return (
    <motion.div
      key="mesas-panel"
      id={`event-mesas-panel-${eventId}`}
      role="region"
      aria-label="Mesas del evento"
      variants={panelMotion}
      initial="initial"
      animate="animate"
      exit="exit"
      className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg backdrop-blur-sm"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            <span aria-hidden>🪑</span> Mesas reservadas
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {summary.reservadas} / {summary.total || "—"} reservadas
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Cerrar panel de mesas"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 py-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-white/[0.06]" />
          ))}
        </div>
      ) : error ? (
        <p className="py-4 text-center text-sm text-red-400">{error}</p>
      ) : tables.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">Aún no hay mesas reservadas</p>
      ) : (
        <>
          <ul className="space-y-3">
            {rows.map(({ table: t, matches, st, cliente, hora, ingreso }) => {
              const displaySt =
                matches.length > 0 && st === "libre" ? "reservada" : st;
              const ui = labelEstado(displaySt);
              return (
                <li
                  key={t.id}
                  className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-white">
                      {t.zone} · {t.label}
                    </span>
                    <span className={`shrink-0 text-xs ${ui.className}`}>
                      {ui.emoji} {ui.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{t.capacity} personas</p>
                  {t.minPrice != null && Number(t.minPrice) > 0 ? (
                    <p className="text-xs text-zinc-400">
                      Mínimo / consumo: {formatMoney(Number(t.minPrice))}
                    </p>
                  ) : null}
                  {matches.length > 0 ? (
                    <p className="mt-1 text-xs text-zinc-300">
                      {cliente}
                      {hora ? ` · ${hora}` : ""}
                    </p>
                  ) : null}
                  {ingreso > 0 ? (
                    <p className="mt-1 text-xs text-zinc-500">Registrado: {formatMoney(ingreso)}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="mt-4 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
            <p>
              Total reservadas (aprox.):{" "}
              <span className="font-semibold text-white">{summary.reservadas}</span> / {summary.total}
            </p>
            <p className="mt-1">
              Ingresos por mesas (registrados):{" "}
              <span className="font-semibold text-white">{formatMoney(summary.ingresos)}</span>
            </p>
            <Link
              href="/dashboard/mesas"
              className="mt-3 inline-flex text-sm font-medium text-[#2979FF] hover:underline"
            >
              Ver detalle completo →
            </Link>
          </div>
        </>
      )}
    </motion.div>
  );
}
