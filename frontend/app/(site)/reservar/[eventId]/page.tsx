"use client";

import Image from "next/image";
import { Suspense, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PurchaseFlowEmbeddedCard } from "@/components/public-event/PurchaseFlowTransition";
import { getToken } from "@/lib/api";
import { createReservation, type ReservationBreakdown } from "@/lib/customerApi";
import { getEventCoverImageUrl } from "@/lib/eventCoverImage";
import { formatMoney } from "@/lib/format";
import { getPublicImageAbsoluteUrl } from "@/lib/publicImageUrl";
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

/** Misma altura que el spacer del `Navbar` en (site): el fondo sube y se ve bajo la barra transparente. */
const SITE_NAV_BLEED =
  "-mt-[4.25rem] pt-[4.25rem] md:-mt-[4.5rem] md:pt-[4.5rem]";

/** Misma capa que `/e/[...]` y checkout: flyer difuminado + overlay oscuro */
const RESERVA_BLUR_OVERLAY: CSSProperties = {
  background: `linear-gradient(
    180deg,
    rgba(0,0,0,0.15) 0%,
    rgba(0,0,0,0.20) 40%,
    rgba(0,0,0,0.75) 70%,
    rgba(0,0,0,0.95) 100%
  )`,
};

/** Vidrio alineado con `CheckoutClient` / `EventPageMobile` */
const reservaGlassPanel =
  "rounded-[28px] border border-white/[0.13] bg-gradient-to-b from-white/[0.1] to-white/[0.04] p-5 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.72)] backdrop-blur-[28px]";
const reservaGlassCard =
  "rounded-2xl border border-white/[0.13] bg-gradient-to-b from-white/[0.1] to-white/[0.04] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.72)] backdrop-blur-[28px]";
const reservaGlassInset =
  "border border-white/[0.12] bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl";

/** Cabecera checkout: misma estructura que antes, más transparente (sin bloque opaco). */
const reservaHeaderPanel =
  "rounded-[28px] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.55)] backdrop-blur-[22px]";

function ReservaEventBackdrop({ event, children }: { event: PublicEventDetail; children: ReactNode }) {
  const raw = getEventCoverImageUrl(event);
  const src = raw ? getPublicImageAbsoluteUrl(raw) : null;
  return (
    <div className={`relative min-h-screen w-full bg-black ${SITE_NAV_BLEED}`}>
      {src ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              filter: "blur(40px) brightness(0.35) saturate(1.4)",
              transform: "scale(1.1)",
            }}
          />
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 z-[1]" style={RESERVA_BLUR_OVERLAY} />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ReservarPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = params.eventId as string;
  const presetTableId =
    searchParams?.get("tableId") ?? searchParams?.get("table") ?? null;

  /** Sin paso de plano/mesas: solo cover (opc.) → pago → éxito */
  const [step, setStep] = useState<2 | 3 | 4 | null>(null);
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
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerFullName, setBuyerFullName] = useState("");

  useEffect(() => {
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
  }, [eventId, presetTableId]);

  const needsCover = !!event?.requiresCoverForTable;

  /** Tras cargar evento + mesa desde la URL de `/e/...`, ir directo a cover o al checkout de pago */
  useEffect(() => {
    if (loadingEvent || !event || done) return;
    if (!presetTableId || !selected) return;
    setStep((s) => (s === null ? (needsCover ? 2 : 3) : s));
  }, [loadingEvent, event?.id, presetTableId, selected?.id, needsCover, done]);

  const ticketTypes = useMemo(
    () => (event?.ticketTypes ?? []).filter((t) => t.active !== false),
    [event]
  );
  const eventHeaderCoverSrc = useMemo(() => {
    if (!event) return null;
    const raw = getEventCoverImageUrl(event);
    return raw ? getPublicImageAbsoluteUrl(raw) : null;
  }, [event]);
  const selectedCover = useMemo(
    () => ticketTypes.find((t) => (t.id ?? t.name) === selectedCoverId) ?? null,
    [ticketTypes, selectedCoverId]
  );
  /** Sin selector de personas: se usa la capacidad de la mesa reservada (mismas reglas de API). */
  const partySize = selected ? Math.max(1, selected.capacity) : 2;
  const selectedTableAmount = selected?.minPrice != null ? Number(selected.minPrice) : 500;
  const coverAmount = selectedCover ? Number(selectedCover.price) * partySize : 0;

  const tableDepositPct = selected ? tableAdvancePct(selected) : 50;

  useEffect(() => {
    if (!selected) return;
    const p = tableAdvancePct(selected);
    if (p >= 100) setPaymentOption("total");
    else setPaymentOption("partial");
  }, [selected?.id]);

  const subtotal = selectedTableAmount + coverAmount;
  const totalCustomerContract = Number(subtotal.toFixed(2));
  const localPayNowBase =
    paymentOption === "partial"
      ? Number(((subtotal * tableDepositPct) / 100).toFixed(2))
      : subtotal;
  const payNowCustomer = localPayNowBase;
  const pendingLocalBase = Number((subtotal - localPayNowBase).toFixed(2));
  const partialDepositCustomerPreview = Number(((subtotal * tableDepositPct) / 100).toFixed(2));

  async function handlePay() {
    setError(null);
    if (!selected) return;
    if (needsCover && !selectedCover) {
      setError("Selecciona el tipo de entrada cover.");
      return;
    }
    const token = getToken();
    if (!token) {
      const email = buyerEmail.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Indica un correo válido para tu reserva.");
        return;
      }
      const name = buyerFullName.trim();
      if (name.length < 2) {
        setError("Indica tu nombre (mínimo 2 caracteres) para el titular de la reserva.");
        return;
      }
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
        ...(token
          ? {}
          : {
              buyerEmail: buyerEmail.trim().toLowerCase(),
              buyerFullName: buyerFullName.trim(),
            }),
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

  if (loadingEvent) {
    return (
      <div className={`relative min-h-[100dvh] w-full bg-black ${SITE_NAV_BLEED}`}>
        <div className="absolute inset-0 z-0 bg-black" aria-hidden />
        <div className="relative z-10 min-h-[85dvh]">
          <PurchaseFlowEmbeddedCard title="Preparando tu reserva…" subtitle="Cargando evento y mesa" icon="table" />
        </div>
      </div>
    );
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

  if (tables.length === 0) {
    return (
      <ReservaEventBackdrop event={event}>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className={reservaGlassPanel}>
            <p className="text-lg font-semibold text-white">Sin mesas publicadas</p>
            <p className="mt-2 text-sm text-white/55">Este evento aún no tiene mesas para reservar.</p>
            <Link
              href={`/e/${event.slug}`}
              className="btn-primary mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold"
            >
              Volver al evento
            </Link>
          </div>
        </div>
      </ReservaEventBackdrop>
    );
  }

  if (!presetTableId) {
    return (
      <ReservaEventBackdrop event={event}>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className={reservaGlassPanel}>
            <p className="text-lg font-semibold text-white">Elige tu mesa en la página del evento</p>
            <p className="mt-2 text-sm text-white/55">
              Abre el evento, selecciona zona y mesa; desde ahí entrarás directamente al pago de la reserva.
            </p>
            <Link
              href={`/e/${event.slug}`}
              className="btn-primary mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold"
            >
              Ir al evento
            </Link>
          </div>
        </div>
      </ReservaEventBackdrop>
    );
  }

  if (!selected) {
    return (
      <ReservaEventBackdrop event={event}>
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className={reservaGlassPanel}>
            <p className="text-lg font-semibold text-white">Mesa no disponible</p>
            <p className="mt-2 text-sm text-white/55">
              Esta mesa ya no está disponible o el enlace no es válido.
            </p>
            <Link
              href={`/e/${event.slug}`}
              className="btn-primary mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold"
            >
              Elegir otra mesa
            </Link>
          </div>
        </div>
      </ReservaEventBackdrop>
    );
  }

  if (step === null && !done) {
    return (
      <ReservaEventBackdrop event={event}>
        <div className="mx-auto flex min-h-[70dvh] max-w-4xl justify-center px-4 py-12">
          <PurchaseFlowEmbeddedCard title="Preparando tu reserva…" subtitle="Un momento" icon="table" />
        </div>
      </ReservaEventBackdrop>
    );
  }

  const progressPct =
    step === 4 ? 100 : step === 3 ? (needsCover ? 75 : 58) : step === 2 ? 33 : 0;

  return (
    <ReservaEventBackdrop event={event}>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-12">
        <div className={`mb-6 md:mb-8 ${reservaHeaderPanel}`}>
          <div className="flex items-start gap-3 sm:gap-4">
            {eventHeaderCoverSrc ? (
              <div className="relative h-[4.25rem] w-[4.25rem] shrink-0 overflow-hidden rounded-xl border border-white/12 bg-black/35 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] sm:h-[4.75rem] sm:w-[4.75rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={eventHeaderCoverSrc}
                  alt=""
                  className="h-full w-full object-cover object-center"
                />
              </div>
            ) : (
              <div className="flex h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white/35 sm:h-[4.75rem] sm:w-[4.75rem]">
                G
              </div>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/55">Reserva de mesa</p>
              <h1 className="mt-1.5 text-2xl font-bold leading-tight text-white md:text-3xl">{event.title}</h1>
              <p className="mt-2 text-sm text-white/55">
                {event.venue?.name} · {new Date(event.startAt).toLocaleString("es-DO")}
              </p>
              {event.venue?.id ? (
                <p className="mt-2 hidden md:block">
                  <Link
                    href={`/collage?venueId=${encodeURIComponent(event.venue.id)}`}
                    className="text-sm font-medium text-amber-200/95 hover:underline"
                  >
                    Ver recuerdos de eventos pasados en {event.venue.name} →
                  </Link>
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full bg-gradient-to-r from-white/25 via-white/50 to-white/30 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mt-0 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-100 backdrop-blur-md max-md:mb-4 md:mt-5">
            {error}
          </div>
        )}

        {!done && step === 2 && (
          <div className={`mt-8 max-md:mt-4 p-6 ${reservaGlassCard}`}>
            <h2 className="text-lg font-semibold leading-tight text-white md:text-xl">Cover obligatorio</h2>
            <p className="mt-1 text-sm text-white/50">
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
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      selectedCoverId === id
                        ? "border-[#C77DFF] bg-[#C77DFF]/12 ring-1 ring-inset ring-[#C77DFF]/25"
                        : "border-white/[0.12] bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]"
                    }`}
                  >
                  <span className="text-white">{t.name}</span>
                  <span className="font-semibold text-[#E9D5FF]">{formatMoney(Number(t.price))}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push(`/e/${event.slug}`)}
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
          <div className={`mt-8 max-md:mt-4 p-5 sm:p-6 ${reservaGlassCard} ${siteCheckoutFiguresSansClass}`}>
          <div className="mx-auto flex max-w-lg flex-col items-center text-center sm:max-w-none sm:items-stretch sm:text-left">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white/75">
              {needsCover ? "Paso 2 · Pago" : "Checkout"}
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
                "flex min-h-[44px] w-full items-center justify-center rounded-xl border px-3 py-2.5 text-center font-sans transition",
                "text-[13px] font-medium leading-snug tracking-tight text-white/90 sm:text-sm",
                paymentOption === "total"
                  ? "border-[#C77DFF] bg-[#C77DFF]/12 text-[#F3E8FF] ring-1 ring-inset ring-[#C77DFF]/30"
                  : "border-white/[0.12] bg-white/[0.06] hover:border-white/22 hover:bg-white/[0.09]",
              ].join(" ")}
            >
              <span className="tabular-nums">
                Pagar total ({formatMoney(totalCustomerContract)})
              </span>
            </button>
            {tableDepositPct < 100 && (
              <button
                type="button"
                onClick={() => setPaymentOption("partial")}
                className={[
                  "flex min-h-[44px] w-full items-center justify-center rounded-xl border px-3 py-2.5 text-center font-sans transition",
                  "text-[13px] font-medium leading-snug tracking-tight text-white/90 sm:text-sm",
                  paymentOption === "partial"
                    ? "border-[#C77DFF] bg-[#C77DFF]/12 text-[#F3E8FF] ring-1 ring-inset ring-[#C77DFF]/30"
                    : "border-white/[0.12] bg-white/[0.06] hover:border-white/22 hover:bg-white/[0.09]",
                ].join(" ")}
              >
                <span className="tabular-nums">
                  Adelanto {tableDepositPct}% ({formatMoney(partialDepositCustomerPreview)})
                </span>
              </button>
            )}
          </div>

          {paymentOption === "partial" && tableDepositPct < 100 && (
            <p
              className={`mt-4 rounded-xl px-3 py-2.5 font-sans text-[12px] font-normal leading-snug text-white/55 sm:text-[13px] ${reservaGlassInset}`}
            >
              Pagas ahora el <strong className="font-semibold text-white/82">{tableDepositPct}%</strong> fijado por el local; el resto lo
              liquidas en el evento.
            </p>
          )}

          <div
            className={`mt-5 flex min-h-0 flex-col overflow-hidden rounded-xl font-normal text-white/75 ${reservaGlassInset} ${siteCheckoutSummaryRowsClass}`}
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
            </div>

            <div className="flex items-center justify-between gap-6 border-t border-white/[0.1] bg-white/[0.04] px-3.5 py-3 font-sans text-[13px] text-white sm:text-[14px] md:text-[15px]">
              <span className="font-medium tracking-wide">Total</span>
              <span className="tabular-nums font-semibold tracking-wide">{formatMoney(totalCustomerContract)}</span>
            </div>

            <div className="border-t border-white/[0.07]">
              <div className="flex items-center justify-between gap-6 px-3.5 py-2.5 text-white/70">
                <span>Pago ahora</span>
                <span className={siteCheckoutSummaryAmountCellClass}>{formatMoney(payNowCustomer)}</span>
              </div>
              {pendingLocalBase > 0 && (
                <div className="flex items-center justify-between gap-6 border-t border-white/[0.06] px-3.5 py-2.5 text-[#D4C2EE]/90">
                  <span>Pendiente en el local</span>
                  <span className="tabular-nums font-medium">{formatMoney(pendingLocalBase)}</span>
                </div>
              )}
            </div>
          </div>

          {!getToken() ? (
            <div className={`mt-5 w-full max-w-md space-y-3 text-left sm:mx-auto ${siteBodyTextClass}`}>
              <p className={`text-[13px] ${siteBodyMutedClass}`}>
                Sin iniciar sesión usamos tu correo para la confirmación y asociamos la reserva a una cuenta cliente.
              </p>
              <div>
                <label htmlFor="reserva-buyer-email" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Correo electrónico
                </label>
                <input
                  id="reserva-buyer-email"
                  type="email"
                  autoComplete="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full rounded-xl border border-white/[0.12] bg-black/40 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div>
                <label htmlFor="reserva-buyer-name" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Nombre completo
                </label>
                <input
                  id="reserva-buyer-name"
                  type="text"
                  autoComplete="name"
                  value={buyerFullName}
                  onChange={(e) => setBuyerFullName(e.target.value)}
                  placeholder="Titular de la reserva"
                  className="w-full rounded-xl border border-white/[0.12] bg-black/40 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>
          ) : null}

          <textarea
            placeholder="Notas adicionales (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={`mt-5 w-full rounded-xl border border-white/[0.12] bg-black/30 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md placeholder:text-white/40 ${siteBodyTextClass}`}
          />

          <div className="mt-6 grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-3.5">
            <button
              type="button"
              onClick={() => (needsCover ? setStep(2) : router.push(`/e/${event.slug}`))}
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
          <div className={`mt-8 max-md:mt-4 border-emerald-400/35 p-6 ${reservaGlassCard} shadow-[inset_0_0_0_1px_rgba(52,211,153,0.2)]`}>
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
            <p>Monto pagado (tarjeta): {formatMoney(breakdown?.payNowCustomer ?? breakdown?.payNow ?? payNowCustomer)}</p>
            <p>Pendiente en el local: {formatMoney(breakdown?.pendingLocalBase ?? breakdown?.pendingAtVenue ?? pendingLocalBase)}</p>
            {reservationId && <p>ID reserva: {reservationId}</p>}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/mis-mesas" className="btn-primary">
              Ver mis mesas
            </Link>
            <Link
              href={`/e/${event.slug}`}
              className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/[0.06] transition hover:border-white/15 hover:bg-white/[0.06]"
            >
              Volver al evento
            </Link>
          </div>
        </div>
      )}

        <p className="mt-8 text-center text-sm text-white/50">
          <Link href="/eventos" className="text-amber-200/85 underline-offset-2 hover:text-amber-100 hover:underline">
            Volver a eventos
          </Link>
        </p>
      </div>
    </ReservaEventBackdrop>
  );
}

export default function ReservarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-4">
          <div className="h-10 w-10 animate-pulse rounded-2xl bg-white/10" />
          <p className="mt-4 text-sm text-white/45">Cargando reserva…</p>
        </div>
      }
    >
      <ReservarPageInner />
    </Suspense>
  );
}
