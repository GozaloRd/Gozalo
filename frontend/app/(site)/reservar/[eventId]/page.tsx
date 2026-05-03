"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getToken } from "@/lib/api";
import { createReservation, type ReservationBreakdown } from "@/lib/customerApi";
import { formatMoney } from "@/lib/format";
import { useTableLayoutBackdrop } from "@/hooks/useTableLayoutBackdrop";
import { getReservationTableLayoutUrl } from "@/lib/reservationEventImage";
import { fetchPublicEventById, type PublicEventDetail } from "@/lib/publicApi";
import {
  siteBodyMutedClass,
  siteBodyTextClass,
  siteCheckoutFiguresSansClass,
  siteCheckoutSummaryAmountCellClass,
  siteCheckoutSummaryRowsClass,
} from "@/lib/siteTypography";

type Table = {
  id: string;
  zone: string;
  label: string;
  capacity: number;
  posX: number;
  posY: number;
  minPrice?: string | number | null;
  initialPaymentPercent?: number | null;
  isAvailable?: boolean;
  estado?: string;
};

function tableAdvancePct(t: { initialPaymentPercent?: number | null }): number {
  const n = Number(t.initialPaymentPercent);
  if (Number.isFinite(n) && n >= 1 && n <= 100) return Math.round(n);
  return 50;
}

function zoneAdvanceLabel(zoneTables: Table[]): string {
  if (zoneTables.length === 0) return "Adelanto —";
  const advs = zoneTables.map((x) => tableAdvancePct(x));
  const mn = Math.min(...advs);
  const mx = Math.max(...advs);
  if (mn === mx) return mn >= 100 ? "Pago completo" : `Adelanto ${mn}%`;
  if (mn >= 100 && mx >= 100) return "Pago completo";
  return `Adelanto ${mn}%–${mx}%`;
}

const ZONE_DOT_COLORS = ["#9B7FCA", "#E879A9", "#22D3EE", "#A78BFA", "#34D399"] as const;

function zoneAccentClass(zone: string): string {
  let h = 0;
  for (let i = 0; i < zone.length; i++) h = (h + zone.charCodeAt(i) * 17) % 2147483647;
  return ZONE_DOT_COLORS[Math.abs(h) % ZONE_DOT_COLORS.length]!;
}

function minPriceInZone(ts: Table[]): number {
  if (ts.length === 0) return 500;
  const nums = ts.map((t) => (t.minPrice != null && t.minPrice !== "" ? Number(t.minPrice) : 500));
  return Math.min(...nums);
}

function IconUsersTiny({ className }: { className?: string }) {
  return (
    <svg className={className} width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevronAccordion({ className }: { className?: string }) {
  return (
    <svg className={className} width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function tableRowTitle(t: Table): string {
  const raw = String(t.label ?? "").trim();
  if (/^mesa\b/i.test(raw)) return raw;
  return raw ? `Mesa ${raw}` : "Mesa";
}

export default function ReservarPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const presetTableId = searchParams.get("tableId");

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [selected, setSelected] = useState<Table | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedCoverId, setSelectedCoverId] = useState<string | null>(null);
  const [paymentOption, setPaymentOption] = useState<"total" | "partial">("total");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<ReservationBreakdown | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);
  /** Paso 1 móvil: zonas desplegables — qué bloques están abiertos */
  const [mobileZoneOpen, setMobileZoneOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(`/reservar/${eventId}`)}`);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const data = await fetchPublicEventById(eventId);
        if (!active) return;
        if (!data) {
          setError("No se pudo cargar el evento.");
          return;
        }
        setEvent(data);
        const loadedTables = (data.tables ?? []) as Table[];
        setTables(loadedTables);
        if (presetTableId) {
          const t = loadedTables.find((x) => x.id === presetTableId);
          if (t && t.isAvailable !== false && t.estado !== "reservada") setSelected(t);
        }
      } catch {
        if (active) setError("Error al cargar el flujo de reserva.");
      } finally {
        if (active) setLoadingEvent(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [eventId, presetTableId, router]);

  const ticketTypes = useMemo(
    () => (event?.ticketTypes ?? []).filter((t) => t.active !== false),
    [event]
  );
  const selectedCover = useMemo(
    () => ticketTypes.find((t) => (t.id ?? t.name) === selectedCoverId) ?? null,
    [ticketTypes, selectedCoverId]
  );
  /** Sin selector de personas: se usa la capacidad de la mesa reservada (mismas reglas de API). */
  const partySize = selected ? Math.max(1, selected.capacity) : 2;
  const selectedTableAmount = selected?.minPrice != null ? Number(selected.minPrice) : 500;
  const needsCover = !!event?.requiresCoverForTable;
  const coverAmount = selectedCover ? Number(selectedCover.price) * partySize : 0;

  const tablesByZone = useMemo(() => {
    const m = new Map<string, Table[]>();
    for (const t of tables) {
      const z = (t.zone ?? "").trim() || "General";
      if (!m.has(z)) m.set(z, []);
      m.get(z)!.push(t);
    }
    m.forEach((arr) => {
      arr.sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true }));
    });
    return m;
  }, [tables]);

  const zoneOrder = useMemo(() => Array.from(tablesByZone.keys()).sort((a, b) => a.localeCompare(b, "es")), [tablesByZone]);
  const tableDepositPct = selected ? tableAdvancePct(selected) : 50;

  useEffect(() => {
    if (!selected) return;
    const p = tableAdvancePct(selected);
    if (p >= 100) setPaymentOption("total");
    else setPaymentOption("partial");
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const z = (selected.zone ?? "").trim() || "General";
    setMobileZoneOpen((prev) => (prev[z] ? prev : { ...prev, [z]: true }));
  }, [selected?.id]);

  const subtotal = selectedTableAmount + coverAmount;
  const fee = Number((subtotal * 0.1).toFixed(2));
  const total = Number((subtotal + fee).toFixed(2));
  const payNow =
    paymentOption === "partial"
      ? Number(((total * tableDepositPct) / 100).toFixed(2))
      : total;
  const pending = Number((total - payNow).toFixed(2));

  async function handlePay() {
    setError(null);
    if (!selected) return;
    if (needsCover && !selectedCover) {
      setError("Selecciona el tipo de entrada cover.");
      return;
    }
    setLoading(true);
    try {
      const res = await createReservation({
        eventId,
        tableId: selected.id,
        partySize,
        notes,
        paymentOption,
        upfrontPercent: paymentOption === "partial" ? tableDepositPct : undefined,
        cover: selectedCover
          ? {
              ticketType: selectedCover.name,
              quantity: partySize,
              unitPrice: Number(selectedCover.price),
            }
          : undefined,
      });
      if (res.qrImage) setQrImage(res.qrImage);
      setBreakdown(res.breakdown);
      setReservationId(res.reservation.id);
      setDone(true);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al reservar");
    } finally {
      setLoading(false);
    }
  }

  function onContinueFromStep1() {
    if (!selected) return;
    if (needsCover) setStep(2);
    else setStep(3);
  }

  const tableLayoutUrl = useMemo(
    () => (event ? getReservationTableLayoutUrl(event) : null),
    [event]
  );
  const layoutBackdropBg = useTableLayoutBackdrop(tableLayoutUrl);

  if (loadingEvent) {
    return <div className="mx-auto max-w-4xl px-4 py-20 text-center text-slate-400">Cargando reserva...</div>;
  }

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          {error ?? "Evento no disponible."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-12">
      {/* En móvil: plano solo en paso 1 (bloque siguiente); aquí el encabezado completo (título, barra…) solo en md+ */}
      <div className="hidden md:block">
        {tableLayoutUrl && (
          <div className="mb-8 md:mb-10">
            <div
              className="overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-black/40"
              style={{ background: layoutBackdropBg }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tableLayoutUrl}
                alt={`Plano del local y mesas · ${event.title}`}
                className="mx-auto max-h-[min(70vh,560px)] w-full object-contain"
              />
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">Plano del local — mismo archivo que en el panel (Mesas)</p>
          </div>
        )}
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Reserva de mesa</p>
        <h1 className="mt-2 text-3xl font-bold text-white">{event.title}</h1>
        <p className="mt-2 text-sm text-slate-400">
          {event.venue?.name} · {new Date(event.startAt).toLocaleString("es-DO")}
        </p>
        {event.venue?.id && (
          <p className="mt-2">
            <Link
              href={`/collage?venueId=${encodeURIComponent(event.venue.id)}`}
              className="text-sm font-medium text-[#9B7FCA] hover:underline"
            >
              Ver recuerdos de eventos pasados en {event.venue.name} →
            </Link>
          </p>
        )}

        <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-night-800">
          <div
            className="h-full bg-gradient-to-r from-gozalo-blue to-gozalo-accent transition-all"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mt-0 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100 max-md:mb-4 md:mt-5">
          {error}
        </div>
      )}

      {/* Móvil: plano completo (object-contain); fondo pergamino en letterboxing para que no se vean franjas negras */}
      {!done && step === 1 && tableLayoutUrl && (
        <div className="mb-4 md:hidden">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-night-950 p-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/[0.08]">
            <div
              className="flex min-h-[min(52vh,520px)] w-full items-center justify-center overflow-hidden rounded-[0.65rem] ring-1 ring-stone-700/20"
              style={{ background: layoutBackdropBg }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tableLayoutUrl}
                alt={`Plano del local y mesas · ${event.title}`}
                className="mx-auto h-auto max-h-[min(52vh,520px)] w-auto max-w-full object-contain object-center"
              />
            </div>
          </div>
        </div>
      )}

      {!done && step === 1 && (
        <>
          {/* Móvil: tarjetas por zona + lista de mesas (referencia tipo club; sin contador de personas) */}
          <div className="mt-0 space-y-4 md:mt-8 md:hidden">
            {tables.length === 0 ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                Aún no hay mesas publicadas para este evento. Vuelve más tarde o contacta al local.
              </div>
            ) : (
              <div className="space-y-3">
                {zoneOrder.map((zone) => {
                  const zoneTables = tablesByZone.get(zone) ?? [];
                  const minZ = minPriceInZone(zoneTables);
                  const maxCap = Math.max(...zoneTables.map((t) => t.capacity), 1);
                  const dot = zoneAccentClass(zone);
                  const freeCount = zoneTables.filter(
                    (x) => x.isAvailable !== false && x.estado !== "reservada"
                  ).length;
                  return (
                    <details
                      key={zone}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-night-900/90 shadow-lg shadow-black/30 open:border-white/15"
                      open={mobileZoneOpen[zone] ?? false}
                      onToggle={(e) => {
                        const el =
                          (e.target as HTMLDetailsElement | null) ??
                          (e.currentTarget as HTMLDetailsElement | null);
                        if (!el) return;
                        setMobileZoneOpen((prev) => ({
                          ...prev,
                          [zone]: el.open,
                        }));
                      }}
                    >
                      <summary className="flex cursor-pointer list-none items-start gap-3 p-4 marker:content-none [&::-webkit-details-marker]:hidden">
                        <span
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-white/20"
                          style={{ background: dot }}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Zona</p>
                          <h3 className="text-lg font-bold uppercase tracking-wide text-white">{zone}</h3>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                            <span className="font-semibold text-white">{formatMoney(minZ)}</span>
                            <span className="text-slate-600">·</span>
                            <span className="inline-flex items-center gap-1">
                              hasta {maxCap} <IconUsersTiny className="text-slate-400" />
                            </span>
                            <span className="inline-flex max-w-full items-center rounded-full border border-gozalo-blue/45 bg-gozalo-blue/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gozalo-blue">
                              {zoneAdvanceLabel(zoneTables)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-500">
                            {zoneTables.length} mesa{zoneTables.length !== 1 ? "s" : ""}
                            {freeCount > 0 ? (
                              <span className="text-emerald-400/90"> · {freeCount} disponible{freeCount !== 1 ? "s" : ""}</span>
                            ) : null}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-start pt-1">
                          <IconChevronAccordion className="text-slate-400 transition duration-200 group-open:rotate-180" />
                        </div>
                      </summary>
                      <div className="space-y-2 border-t border-white/10 p-3 pt-2">
                        {zoneTables.map((t) => {
                          const avail = t.isAvailable !== false && t.estado !== "reservada";
                          const isSel = selected?.id === t.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              disabled={!avail}
                              onClick={() => avail && setSelected(t)}
                              className={[
                                "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-3.5 text-left text-sm font-semibold transition",
                                !avail
                                  ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-500 opacity-60"
                                  : isSel
                                    ? "border-gozalo-blue/70 bg-gozalo-blue/15 text-white ring-1 ring-gozalo-blue/30"
                                    : "border-white/10 bg-white/[0.04] text-white active:scale-[0.99] hover:border-white/20",
                              ].join(" ")}
                            >
                              <span>{tableRowTitle(t)}</span>
                              <span
                                className={
                                  !avail
                                    ? "text-xs font-medium text-red-400/90"
                                    : isSel
                                      ? "text-xs font-bold text-gozalo-blue"
                                      : "text-xs font-medium text-emerald-400/90"
                                }
                              >
                                {!avail ? "Ocupada" : isSel ? "Seleccionada" : "Disponible"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
            {selected && (
              <div className="rounded-2xl border border-white/10 bg-night-800/70 p-4 text-sm text-slate-300 ring-1 ring-inset ring-white/[0.06]">
                <p className="font-semibold text-white">
                  {selected.zone} · Mesa {selected.label}
                </p>
                <p className="mt-0.5 text-slate-400">Capacidad de la mesa: {selected.capacity} personas</p>
                <p className="mt-0.5 text-white/90">Consumo mínimo: {formatMoney(selectedTableAmount)}</p>
              </div>
            )}
            <button
              type="button"
              disabled={!selected}
              onClick={onContinueFromStep1}
              className={[
                "w-full min-h-[50px] rounded-xl text-base font-semibold transition disabled:opacity-100",
                selected ? "btn-primary shadow-md shadow-gozalo-blue/25" : "cursor-not-allowed border border-white/10 bg-white/[0.04] text-slate-500 ring-1 ring-inset ring-white/[0.05]",
              ].join(" ")}
            >
              Continuar
            </button>
          </div>

          {/* Escritorio: mapa con posiciones */}
          <div className="mt-8 hidden md:block">
            <div className="rounded-2xl border border-white/10 bg-night-900/60 p-6 ring-1 ring-inset ring-white/[0.06]">
              <h2 className="text-xl font-semibold text-white">Paso 1 · Selección de mesa</h2>
              <p className="mt-1 text-sm text-slate-500">Elige una mesa disponible en el plano.</p>
              {tables.length === 0 ? (
                <p className="mt-4 text-sm text-amber-200/90">No hay mesas publicadas aún.</p>
              ) : (
                <div className="relative mt-6 aspect-[4/3] rounded-xl border border-white/10 bg-night-950">
                  {tables.map((t) => {
                    const avail = t.isAvailable !== false && t.estado !== "reservada";
                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={!avail}
                        onClick={() => avail && setSelected(t)}
                        className={`absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                          !avail
                            ? "cursor-not-allowed border-red-500/60 bg-red-950/50 text-red-200 opacity-80"
                            : selected?.id === t.id
                              ? "border-gozalo-blue bg-gozalo-blue/20 text-gozalo-blue shadow-neonBlue"
                              : "border-emerald-500/50 bg-emerald-950/40 text-emerald-300"
                        }`}
                        style={{ left: `${t.posX}%`, top: `${t.posY}%` }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
              {selected && (
                <div className="mt-4 rounded-xl border border-white/10 bg-night-800/60 p-4 text-sm text-slate-300">
                  <p className="font-semibold text-white">
                    Mesa {selected.zone} - {selected.label}
                  </p>
                  <p>Capacidad: {selected.capacity} personas</p>
                  <p>Consumo mínimo: {formatMoney(selectedTableAmount)}</p>
                </div>
              )}
              <button
                type="button"
                disabled={!selected}
                onClick={onContinueFromStep1}
                className="btn-primary mt-6 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          </div>
        </>
      )}

      {!done && step === 2 && (
        <div className="mt-8 max-md:mt-4 rounded-2xl border border-white/10 bg-night-900/60 p-6 ring-1 ring-inset ring-white/[0.06]">
          <h2 className="text-lg font-semibold leading-tight text-white md:text-xl">Paso 2 · Cover</h2>
          <p className="mt-1 text-sm text-slate-500">
            Este evento requiere cover para reservar mesa. Selecciona tipo de entrada.
          </p>
          <div className="mt-4 space-y-3">
            {ticketTypes.map((t) => {
              const id = t.id ?? t.name;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedCoverId(id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left ${
                    selectedCoverId === id
                      ? "border-gozalo-blue bg-gozalo-blue/10"
                      : "border-white/10 bg-night-800/60 hover:border-white/20"
                  }`}
                >
                  <span className="text-white">{t.name}</span>
                  <span className="font-semibold text-gozalo-blue">{formatMoney(Number(t.price))}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-2 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/[0.06] transition hover:border-white/15 hover:bg-white/[0.06] sm:px-4"
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!selectedCover}
              className="btn-primary min-h-[48px] w-full text-sm font-semibold disabled:opacity-40"
            >
              Continuar al pago
            </button>
          </div>
        </div>
      )}

      {!done && step === 3 && (
        <div
          className={`mt-8 max-md:mt-4 rounded-2xl border border-white/10 bg-night-900/60 p-5 ring-1 ring-inset ring-white/[0.06] sm:p-6 ${siteCheckoutFiguresSansClass}`}
        >
          <div className="mx-auto flex max-w-lg flex-col items-center text-center sm:max-w-none sm:items-stretch sm:text-left">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white/75">
              Paso 3 de 4
            </span>
            <div className="mt-1.5 max-w-sm font-sans text-xs leading-relaxed text-white/55 sm:max-w-none sm:text-[13px] md:text-[14px] md:leading-snug">
              {tableDepositPct >= 100 ? (
                <p>
                  Esta mesa está configurada para{" "}
                  <strong className="font-semibold text-white/85">cobrar el 100% del total</strong> al reservar.
                </p>
              ) : (
                <p>
                  El local definió un{" "}
                  <strong className="font-semibold text-white/85">adelanto del {tableDepositPct}%</strong> del total si eliges pagar
                  solo la parte inicial; también puedes pagar el monto completo ahora.
                </p>
              )}
            </div>
          </div>

          <div
            className={`mt-4 grid grid-cols-1 gap-2.5 ${tableDepositPct >= 100 ? "" : "sm:grid-cols-2 sm:gap-3"}`}
          >
            <button
              type="button"
              onClick={() => setPaymentOption("total")}
              className={[
                "flex min-h-[48px] w-full items-center justify-center rounded-xl border px-4 py-3 text-center transition",
                paymentOption === "total"
                  ? "border-gozalo-blue bg-gozalo-blue/10 text-gozalo-blue ring-1 ring-inset ring-gozalo-blue/20"
                  : "border-white/10 bg-night-800/60 text-white hover:border-white/20",
                siteBodyTextClass,
              ].join(" ")}
            >
              Pagar total ({formatMoney(total)})
            </button>
            {tableDepositPct < 100 && (
              <button
                type="button"
                onClick={() => setPaymentOption("partial")}
                className={[
                  "flex min-h-[48px] w-full items-center justify-center rounded-xl border px-4 py-3 text-center transition",
                  paymentOption === "partial"
                    ? "border-gozalo-blue bg-gozalo-blue/10 text-gozalo-blue ring-1 ring-inset ring-gozalo-blue/20"
                    : "border-white/10 bg-night-800/60 text-white hover:border-white/20",
                  siteBodyTextClass,
                ].join(" ")}
              >
                Adelanto {tableDepositPct}% ({formatMoney(Number(((total * tableDepositPct) / 100).toFixed(2)))})
              </button>
            )}
          </div>

          {paymentOption === "partial" && tableDepositPct < 100 && (
            <p
              className={`mt-4 rounded-xl border border-white/[0.07] bg-[#07070d]/80 px-3.5 py-3 ring-1 ring-inset ring-white/[0.04] ${siteBodyMutedClass}`}
            >
              Pagas ahora el <strong className="font-semibold text-white/90">{tableDepositPct}%</strong> fijado por el local; el resto lo
              liquidas en el evento.
            </p>
          )}

          <div
            className={`mt-5 flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#07070d]/95 font-normal text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${siteCheckoutSummaryRowsClass}`}
          >
            <div className="border-b border-white/[0.07] px-3.5 py-2.5 font-sans text-[10px] font-normal uppercase tracking-[0.16em] text-white/42">
              Desglose
            </div>
            <div className="divide-y divide-white/[0.06]">
              <div className="flex items-start gap-4 px-3.5 py-3">
                <div className="min-w-0 flex-1 leading-snug">
                  <span className="font-medium text-white/90">
                    {selected?.zone} · Mesa {selected?.label}
                  </span>
                  <p className={`mt-1 text-white/50 ${siteCheckoutSummaryRowsClass}`}>Consumo mínimo</p>
                </div>
                <span className="shrink-0 tabular-nums font-medium leading-snug text-white/92">
                  {formatMoney(selectedTableAmount)}
                </span>
              </div>

              {selectedCover && (
                <div className="flex items-start gap-4 px-3.5 py-3">
                  <div className="min-w-0 flex-1 leading-snug">
                    <span className="font-medium text-white/90">{selectedCover.name}</span>
                    <p className={`mt-1 text-white/50 ${siteCheckoutSummaryRowsClass}`}>
                      <span className="tabular-nums">{formatMoney(Number(selectedCover.price))}</span>
                      {" c/u · ×"}
                      <span className="tabular-nums">{partySize}</span>
                    </p>
                  </div>
                  <span className="shrink-0 tabular-nums font-medium leading-snug text-white/92">
                    {formatMoney(coverAmount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-6 px-3.5 py-2.5 text-white/70">
                <span>Subtotal</span>
                <span className="tabular-nums text-white/88">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-6 px-3.5 py-2.5 text-white/70">
                <span className="min-w-0 leading-snug">Gastos de gestión (10&nbsp;%)</span>
                <span className="tabular-nums text-white/88">{formatMoney(fee)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 border-t border-white/[0.1] bg-white/[0.04] px-3.5 py-3 font-sans text-[13px] text-white sm:text-[14px] md:text-[15px]">
              <span className="font-medium tracking-wide">Total</span>
              <span className="tabular-nums font-semibold tracking-wide">{formatMoney(total)}</span>
            </div>

            <div className="border-t border-white/[0.07]">
              <div className="flex items-center justify-between gap-6 px-3.5 py-2.5 text-white/70">
                <span>Pago ahora</span>
                <span className={siteCheckoutSummaryAmountCellClass}>{formatMoney(payNow)}</span>
              </div>
              {pending > 0 && (
                <div className="flex items-center justify-between gap-6 border-t border-white/[0.06] px-3.5 py-2.5 text-[#D4C2EE]/90">
                  <span>Pendiente en local</span>
                  <span className="tabular-nums font-medium">{formatMoney(pending)}</span>
                </div>
              )}
            </div>
          </div>

          <textarea
            placeholder="Notas adicionales (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`mt-5 w-full rounded-xl border border-white/10 bg-night-900 px-3.5 py-3 ring-1 ring-inset ring-white/[0.06] placeholder:text-white/40 ${siteBodyTextClass}`}
          />

          <div className="mt-6 grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-3.5">
            <button
              type="button"
              onClick={() => setStep(needsCover ? 2 : 1)}
              className={`inline-flex min-h-[50px] min-w-0 w-full max-w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-1.5 py-2.5 text-center font-normal text-white ring-1 ring-inset ring-white/[0.06] transition hover:border-white/15 hover:bg-white/[0.06] sm:px-3 ${siteBodyTextClass}`}
            >
              Atrás
            </button>
            <button
              type="button"
              onClick={handlePay}
              disabled={loading}
              className={`btn-primary min-h-[50px] min-w-0 w-full max-w-full justify-center text-center !font-normal leading-tight [text-wrap:balance] ${siteBodyTextClass}`}
            >
              {loading ? "Procesando..." : "Confirmar y pagar"}
            </button>
          </div>
        </div>
      )}

      {done && step === 4 && (
        <div className="mt-8 max-md:mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <h2 className="text-2xl font-semibold text-emerald-200">Reserva confirmada</h2>
          <p className="mt-2 text-sm text-emerald-100">
            Tu reserva fue creada exitosamente. El QR fue enviado por email.
          </p>
          {qrImage && (
            <div className="mt-4">
              <Image src={qrImage} alt="QR reserva" width={180} height={180} className="rounded-md bg-white p-2" unoptimized />
            </div>
          )}
          <div className="mt-5 space-y-1 text-sm text-emerald-100">
            <p>
              Evento: <span className="text-white">{event.title}</span>
            </p>
            <p>Fecha/hora: {new Date(event.startAt).toLocaleString("es-DO")}</p>
            <p>
              Mesa: {selected?.zone} - {selected?.label}
            </p>
            <p>Personas: {partySize}</p>
            <p>Monto pagado: {formatMoney(breakdown?.payNow ?? payNow)}</p>
            <p>Pendiente: {formatMoney(breakdown?.pendingAtVenue ?? pending)}</p>
            {reservationId && <p>ID reserva: {reservationId}</p>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/mis-mesas" className="btn-primary">
              Ver mis mesas
            </Link>
            <Link
              href={`/eventos/${event.slug}`}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/[0.06] transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              Volver al evento
            </Link>
          </div>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        <Link href="/eventos" className="text-gozalo-blue hover:underline">
          Volver a eventos
        </Link>
      </p>
    </div>
  );
}
