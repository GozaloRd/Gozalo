"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { getToken } from "@/lib/api";
import { purchaseTickets, type PurchasedTicket } from "@/lib/customerApi";
import { EventTicketPassCard } from "@/components/site/EventTicketPassCard";
import { getEventCoverImageUrl } from "@/lib/eventCoverImage";
import { getPublicImageAbsoluteUrl } from "@/lib/publicImageUrl";
import { PurchaseFlowEmbeddedCard } from "@/components/public-event/PurchaseFlowTransition";
import { fetchPublicEventById, type PublicEventDetail } from "@/lib/publicApi";
import { formatDate, formatMoney } from "@/lib/format";
import { canPurchaseType, orderedTypes, type TicketTypeInput } from "@/lib/ticketQueueLogic";
import {
  siteBodyMutedClass,
  siteBodyTextClass,
  siteCheckoutFiguresSansClass,
  siteCheckoutSummaryAmountCellClass,
  siteCheckoutSummaryGridClass,
  siteCheckoutSummaryRowsClass,
  siteCheckoutSummaryTotalCellClass,
  siteQtyNumberClass,
  siteSectionTitleClass,
} from "@/lib/siteTypography";

/** Misma capa que `/e/[eventId]`: flyer difuminado + overlay oscuro */
const CHECKOUT_BLUR_OVERLAY: CSSProperties = {
  background: `linear-gradient(
    180deg,
    rgba(0,0,0,0.15) 0%,
    rgba(0,0,0,0.20) 40%,
    rgba(0,0,0,0.75) 70%,
    rgba(0,0,0,0.95) 100%
  )`,
};

/** Misma altura que el spacer del `Navbar` en (site): el fondo sube bajo la barra transparente. */
const SITE_NAV_BLEED =
  "-mt-[4.25rem] pt-[4.25rem] md:-mt-[4.5rem] md:pt-[4.5rem]";

/** Paneles principales: vidrio + blur (misma línea que `/e/...`) */
const checkoutGlassCard =
  "border border-white/[0.13] bg-gradient-to-b from-white/[0.1] to-white/[0.04] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.72)] backdrop-blur-[28px]";
const checkoutGlassInset =
  "border border-white/[0.12] bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl";

/** Cabecera con foto: misma línea que reserva de mesa (`reservaHeaderPanel`). */
const checkoutHeaderPanel =
  "rounded-[28px] border border-white/[0.09] bg-white/[0.05] p-5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.55)] backdrop-blur-[22px]";

/** Cantidad / resumen → Pago → Confirmación (la elección del tipo es solo en `/e/...`) */
type Step = 1 | 2 | 3;

type CheckoutClientProps = {
  eventId: string;
  /** Cover para fondo (SSR + cliente); misma URL que la página pública del evento */
  initialCoverForTheme?: string | null;
};

export function CheckoutClient({
  eventId,
  initialCoverForTheme = null,
}: CheckoutClientProps) {
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<{ orderId: string; tickets: PurchasedTicket[] } | null>(null);
  /** Invitado: datos para crear/enlazar usuario en el servidor al pagar. */
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerFullName, setBuyerFullName] = useState("");
  /** `ticket` = enlace desde página del evento `/e/...`; `ticketTypeId` = alias explícito */
  const ticketFromUrl =
    searchParams?.get("ticketTypeId") ?? searchParams?.get("ticket") ?? "";
  const [prefDone, setPrefDone] = useState(() => !ticketFromUrl);

  useEffect(() => {
    setPrefDone(!ticketFromUrl);
  }, [ticketFromUrl]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const data = await fetchPublicEventById(eventId);
        if (!active) return;
        if (!data) {
          setError("No se pudo cargar el evento.");
          setPrefDone(true);
          return;
        }
        setEvent(data);
      } catch {
        if (!active) return;
        setError("Error al cargar el checkout.");
        setPrefDone(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  const ticketTypesOrdered = useMemo((): TicketTypeInput[] => {
    const raw = event?.ticketTypes ?? [];
    const mapped = raw.map((t, idx) => ({
      id: String(t.id ?? t.name),
      name: t.name,
      price: t.price,
      quantityTotal: t.quantityTotal ?? null,
      soldCount: t.soldCount ?? 0,
      active: t.active,
      sortOrder: t.sortOrder ?? idx,
    }));
    return orderedTypes(mapped);
  }, [event]);

  const selectedType = useMemo(
    () => ticketTypesOrdered.find((t) => t.id === selectedTypeId) ?? null,
    [ticketTypesOrdered, selectedTypeId]
  );

  useEffect(() => {
    if (!event) return;
    if (ticketTypesOrdered.length === 0) {
      setPrefDone(true);
      return;
    }

    const tid = ticketFromUrl || null;
    const isCurrentValid =
      selectedTypeId != null && ticketTypesOrdered.some((t) => t.id === selectedTypeId);

    if (isCurrentValid) {
      setPrefDone(true);
      return;
    }

    if (!tid) {
      setPrefDone(true);
      return;
    }

    const matched = ticketTypesOrdered.find((t) => t.id === tid);
    if (!matched || !canPurchaseType(event.ticketSaleMode, matched, ticketTypesOrdered)) {
      setPrefDone(true);
      return;
    }

    setSelectedTypeId(tid);
    setStep(1);
    setPrefDone(true);
  }, [event, event?.ticketSaleMode, ticketFromUrl, selectedTypeId, ticketTypesOrdered]);

  const unitPrice = selectedType ? Number(selectedType.price) : 0;
  const subtotal = unitPrice * qty;
  const total = Number(subtotal.toFixed(2));
  const remainingForSelected =
    selectedType?.quantityTotal != null && selectedType.quantityTotal > 0
      ? Math.max(0, Number(selectedType.quantityTotal) - (selectedType.soldCount ?? 0))
      : null;
  const rawSelectedType = useMemo(
    () => (event?.ticketTypes ?? []).find((x) => String(x.id ?? x.name) === selectedType?.id),
    [event?.ticketTypes, selectedType?.id]
  );
  const showQuantityToPublic = rawSelectedType?.showQuantityPublic !== false;

  const coverForTheme = useMemo(
    () => (event ? getEventCoverImageUrl(event) : initialCoverForTheme),
    [event, initialCoverForTheme]
  );

  const eventHeaderCoverSrc = useMemo(() => {
    if (!event) return null;
    const raw = getEventCoverImageUrl(event);
    return raw ? getPublicImageAbsoluteUrl(raw) : null;
  }, [event]);

  async function doPay() {
    if (!event || !selectedType) return;
    if (remainingForSelected != null && qty > remainingForSelected) {
      setError(`Solo hay ${remainingForSelected} ticket(s) disponible(s) para este tipo.`);
      return;
    }

    const token = getToken();
    if (!token) {
      const email = buyerEmail.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Indica un correo válido para recibir tus entradas.");
        return;
      }
      const name = buyerFullName.trim();
      if (name.length < 2) {
        setError("Indica tu nombre (mínimo 2 caracteres) para el titular de la compra.");
        return;
      }
    }

    setError(null);
    setPaying(true);
    try {
      const data = await purchaseTickets({
        eventId: event.id,
        items: [{ ticketType: selectedType.name, quantity: qty, unitPrice }],
        ...(token
          ? {}
          : {
              buyerEmail: buyerEmail.trim().toLowerCase(),
              buyerFullName: buyerFullName.trim(),
            }),
      });
      setResult({ orderId: data.order.id, tickets: data.tickets });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el pago.");
    } finally {
      setPaying(false);
    }
  }

  const checkoutBackdrop = (
    <>
      {coverForTheme ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverForTheme}
            alt=""
            className="absolute inset-0 h-full w-full"
            style={{
              objectFit: "cover",
              objectPosition: "center top",
              filter: "blur(40px) brightness(0.35) saturate(1.4)",
              transform: "scale(1.1)",
            }}
          />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 z-0 min-h-full bg-black" aria-hidden />
      )}
      <div
        className="pointer-events-none absolute inset-0 z-[1] min-h-full w-full"
        style={CHECKOUT_BLUR_OVERLAY}
        aria-hidden
      />
    </>
  );

  if (loading || !prefDone) {
    return (
      <div className={`relative min-h-[100dvh] w-full bg-black ${SITE_NAV_BLEED}`}>
        {checkoutBackdrop}
        <div className="relative z-10 min-h-[85dvh]">
          <PurchaseFlowEmbeddedCard
            title="Preparando checkout…"
            subtitle="Cargando pago seguro"
            icon="ticket"
          />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`relative min-h-[100dvh] w-full bg-black ${SITE_NAV_BLEED}`}>
        {checkoutBackdrop}
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-20">
          <div className={`rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100 ${siteBodyTextClass}`}>
            {error ?? "Evento no disponible."}
          </div>
        </div>
      </div>
    );
  }

  if (ticketTypesOrdered.length === 0) {
    return (
      <div className={`relative min-h-[100dvh] w-full bg-black ${SITE_NAV_BLEED}`}>
        {checkoutBackdrop}
        <div className="relative z-10 mx-auto max-w-lg px-4 py-20 text-center">
          <p className={siteBodyTextClass}>Este evento no tiene entradas a la venta por ahora.</p>
          <Link
            href={`/e/${event.slug}`}
            className={`btn-primary mt-6 inline-flex min-h-[44px] items-center justify-center px-6 ${siteBodyTextClass}`}
          >
            Volver al evento
          </Link>
        </div>
      </div>
    );
  }

  if (!selectedType) {
    return (
      <div className={`relative min-h-[100dvh] w-full bg-black ${SITE_NAV_BLEED}`}>
        {checkoutBackdrop}
        <div className="relative z-10 mx-auto max-w-lg px-4 py-20 text-center">
          <p className={`${siteBodyTextClass} text-white/90`}>
            Para comprar, elige primero un tipo de entrada en la página del evento y pulsa{" "}
            <span className="font-semibold text-white">Seleccionar</span>.
          </p>
          <Link
            href={`/e/${event.slug}`}
            className={`btn-primary mt-6 inline-flex min-h-[44px] items-center justify-center px-6 ${siteBodyTextClass}`}
          >
            Ir al evento
          </Link>
        </div>
      </div>
    );
  }

  /** Misma anchura en móvil para barra de progreso y tarjetas */
  const checkoutStepColumn = "mx-auto w-full max-w-md sm:max-w-2xl";

  return (
    <div className={`relative min-h-[100dvh] w-full bg-black ${SITE_NAV_BLEED}`}>
      {checkoutBackdrop}
      <div
        className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 md:px-6"
      >
      <header className={`mb-6 w-full min-w-0 md:mb-8 ${checkoutHeaderPanel}`}>
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
          <div className="min-w-0 flex-1 pt-0.5 text-left">
            <p className="text-xs font-normal uppercase tracking-[0.18em] text-white/55">Checkout</p>
            <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
              {event.title}
            </h1>
            <p className="mt-2 text-sm text-white/55">
              {[formatDate(event.startAt), event.venue?.name].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <div className={`mt-6 h-2 min-w-0 overflow-hidden rounded-full bg-night-800 ${checkoutStepColumn}`}>
          <div
            className="h-full bg-gradient-to-r from-gozalo-blue to-gozalo-accent transition-all"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </header>

      {error && (
        <div className={`mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-100 ${siteBodyTextClass}`}>
          {error}
        </div>
      )}

      {step === 1 && selectedType && (
        <div
          className={`mt-8 grid w-full grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:items-stretch ${checkoutStepColumn}`}
        >
          <div className={`flex h-full min-h-0 flex-col rounded-2xl p-5 text-center sm:p-6 md:text-left ${checkoutGlassCard}`}>
            <span className="mx-auto inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white/75 md:mx-0">
              Paso 1 de 3
            </span>
            <h2 className={`mt-3 ${siteSectionTitleClass}`}>Selecciona la cantidad</h2>
            <p className={`mt-2 ${siteBodyTextClass}`}>{selectedType.name}</p>
            {showQuantityToPublic && remainingForSelected != null && (
              <p className={`mt-1 ${siteBodyMutedClass}`}>
                Disponibles:{" "}
                <span className={`${siteCheckoutFiguresSansClass} font-semibold text-white/[0.78]`}>
                  {remainingForSelected}
                </span>
              </p>
            )}

            <div className="mx-auto mt-8 w-full max-w-[19.5rem] flex-1 pb-4 sm:max-w-[21rem] md:mt-12">
              <div
                className={`grid min-h-[6.75rem] w-full grid-cols-3 items-center justify-items-center gap-x-2 sm:min-h-[7.25rem] sm:gap-x-4 md:gap-x-5 ${siteCheckoutFiguresSansClass}`}
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex size-[3rem] shrink-0 items-center justify-center justify-self-center rounded-full border border-white/14 bg-white/[0.06] font-light text-[1.85rem] leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.1] active:scale-[0.96] sm:size-[3.35rem] sm:text-[2rem]"
                  aria-label="Quitar un ticket"
                >
                  −
                </button>
                <span
                  className={`justify-self-center text-center ${siteQtyNumberClass}`}
                  aria-live="polite"
                  style={{
                    fontSize: "clamp(3.85rem, 15vmin, 6rem)",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <span className="sr-only">
                    Cantidad seleccionada: {qty === 1 ? "1 ticket" : `${qty} tickets`}.
                  </span>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQty((q) =>
                      remainingForSelected != null ? Math.min(remainingForSelected, q + 1) : q + 1
                    )
                  }
                  className="flex size-[3rem] shrink-0 items-center justify-center justify-self-center rounded-full border border-white/14 bg-white/[0.06] font-light text-[1.85rem] leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.1] active:scale-[0.96] sm:size-[3.35rem] sm:text-[2rem]"
                  aria-label="Añadir un ticket"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            className={`flex h-full min-h-0 flex-col rounded-2xl p-5 sm:p-6 ${checkoutGlassCard} ${siteCheckoutFiguresSansClass}`}
          >
            <div className="flex items-end justify-between gap-3 md:block">
              <h3 className={`md:text-left !font-medium ${siteSectionTitleClass}`}>Resumen</h3>
              <p className={`font-sans md:mt-0.5 md:text-left ${siteCheckoutSummaryRowsClass} tabular-nums text-white/50`}>
                {qty === 1 ? "1 ticket" : `${qty} tickets`}
              </p>
            </div>
            <div
              className={`mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl font-normal text-white/75 ${checkoutGlassInset} ${siteCheckoutSummaryRowsClass}`}
            >
              <div className="border-b border-white/[0.07] px-3.5 py-2.5 font-sans text-[10px] font-normal uppercase tracking-[0.16em] text-white/42">
                Desglose
              </div>
              <div className="divide-y divide-white/[0.06]">
                <div className="flex items-start gap-4 px-3.5 py-3">
                  <div className="min-w-0 flex-1 leading-snug">
                    <span className="font-medium text-white/90">{selectedType.name}</span>
                    <p className={`mt-1 text-white/50 ${siteCheckoutSummaryRowsClass}`}>
                      <span className="tabular-nums">{formatMoney(unitPrice)}</span>
                      {" c/u · ×"}
                      <span className="tabular-nums">{qty}</span>
                    </p>
                  </div>
                  <span className={`shrink-0 tabular-nums font-medium leading-snug text-white/92`}>
                    {formatMoney(subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6 px-3.5 py-2.5 text-white/70">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-white/88">{formatMoney(subtotal)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-6 border-t border-white/[0.1] bg-white/[0.04] px-3.5 py-3 font-sans text-[13px] text-white sm:text-[14px] md:text-[15px]">
                <span className="font-medium tracking-wide">Total</span>
                <span className="tabular-nums font-semibold tracking-wide">{formatMoney(total)}</span>
              </div>
            </div>
            <div className="mx-auto mt-5 grid w-full max-w-sm grid-cols-2 gap-2.5 sm:gap-3 md:mx-0 md:mt-auto md:max-w-none">
              <Link
                href={`/e/${event.slug}`}
                className={`inline-flex min-h-[38px] w-full items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-center font-sans text-[13px] font-normal text-white ring-1 ring-inset ring-white/[0.05] transition hover:border-white/18 hover:bg-white/[0.07] sm:text-sm`}
              >
                Volver al evento
              </Link>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`btn-primary inline-flex min-h-[38px] w-full items-center justify-center rounded-lg !px-3 !py-2 text-center font-sans text-[13px] !font-normal sm:text-sm`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedType && (
        <div
          className={`mt-8 rounded-2xl p-5 sm:p-6 ${checkoutGlassCard} ${checkoutStepColumn}`}
        >
          <div className="mx-auto flex max-w-lg flex-col items-center text-center sm:max-w-none sm:items-stretch sm:text-left">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white/75">
              Paso 2 de 3
            </span>
            <h2 className={`mt-3 sm:mt-2 ${siteSectionTitleClass}`}>Pago</h2>
            <p className={`mt-2 max-w-sm sm:max-w-none ${siteBodyMutedClass}`}>
              Confirma tu compra para generar tus QR al instante.
            </p>
          </div>
          {!getToken() ? (
            <div className={`mt-5 w-full max-w-md space-y-3 text-left sm:mx-auto ${siteBodyTextClass}`}>
              <p className={`text-[13px] ${siteBodyMutedClass}`}>
                Sin iniciar sesión usamos tu correo para enviarte los QR y asociar la compra a una cuenta cliente.
              </p>
              <div>
                <label htmlFor="checkout-buyer-email" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Correo electrónico
                </label>
                <input
                  id="checkout-buyer-email"
                  type="email"
                  autoComplete="email"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div>
                <label htmlFor="checkout-buyer-name" className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Nombre completo
                </label>
                <input
                  id="checkout-buyer-name"
                  type="text"
                  autoComplete="name"
                  value={buyerFullName}
                  onChange={(e) => setBuyerFullName(e.target.value)}
                  placeholder="Como figura en la entrada"
                  className="w-full rounded-xl border border-white/12 bg-black/40 px-3.5 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            </div>
          ) : null}
          <div
            className={`mt-4 grid gap-y-2 rounded-xl p-4 font-medium text-white/70 sm:p-5 ${checkoutGlassInset} ${siteCheckoutFiguresSansClass} ${siteCheckoutSummaryRowsClass}`}
          >
            <div className={siteCheckoutSummaryGridClass}>
              <span className="min-w-0 text-left leading-snug text-white opacity-95">
                {selectedType.name}
              </span>
              <span className={siteCheckoutSummaryAmountCellClass}>{formatMoney(subtotal)}</span>
            </div>
            <p className="text-left text-white/58">
              <span className="tabular-nums">{qty}</span>
              {" × "}
              <span className="tabular-nums">{formatMoney(unitPrice)}</span>
            </p>
            <div
              className={`${siteCheckoutSummaryGridClass} border-t border-white/10 pt-2 text-[13px] tracking-wide text-white sm:text-[14px] md:text-[15px]`}
            >
              <span className="font-medium">Total</span>
              <span className={siteCheckoutSummaryTotalCellClass}>{formatMoney(total)}</span>
            </div>
          </div>
          <div className="mt-6 grid w-full min-w-0 grid-cols-2 gap-3 sm:gap-3.5">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`inline-flex min-h-[50px] min-w-0 w-full max-w-full items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] px-1.5 py-2.5 text-center font-normal text-white ring-1 ring-inset ring-white/[0.06] transition hover:border-white/15 hover:bg-white/[0.06] sm:px-3 ${siteBodyTextClass}`}
            >
              Atrás
            </button>
            <button
              type="button"
              disabled={paying}
              onClick={() => void doPay()}
              className={`btn-primary min-h-[50px] min-w-0 w-full max-w-full justify-center text-center !font-normal leading-tight [text-wrap:balance] ${siteBodyTextClass}`}
            >
              {paying ? "Procesando..." : `Pagar ${formatMoney(total)}`}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className={`mt-8 space-y-6 ${checkoutStepColumn}`}>
          <div className={`rounded-2xl p-5 text-center sm:p-6 ${checkoutGlassCard}`}>
            <p className="text-[10px] font-normal uppercase tracking-[0.2em] text-emerald-400/90">Compra completada</p>
            <h2 className={`mt-2 ${siteSectionTitleClass}`}>Gracias por tu compra</h2>
            <p className="mt-1 font-mono text-[13px] text-white/50">Orden {result.orderId}</p>
            <p className={`mt-1.5 ${siteBodyMutedClass}`}>Tus códigos QR se muestran abajo; también te los enviamos por email.</p>
          </div>

          <div className="flex w-full flex-col items-center gap-8">
            {result.tickets.map((t) => (
              <EventTicketPassCard
                key={t.id}
                eventTitle={event.title}
                startAt={event.startAt}
                venueName={event.venue?.name}
                city={event.venue?.city ?? event.city}
                coverImageUrl={getEventCoverImageUrl(event)}
                ticketType={t.ticketType}
                priceLabel={formatMoney(t.unitPrice)}
                qrImageUrl={t.qrImage}
                qrPayload={t.qrPayload}
                eventHref={undefined}
              />
            ))}
          </div>

          <div className="mx-auto grid w-full min-w-0 max-w-md grid-cols-1 gap-3 sm:grid-cols-2 sm:px-0">
            <Link
              href="/mis-entradas"
              className={`btn-primary inline-flex min-h-[50px] w-full min-w-0 items-center justify-center text-center !font-normal ${siteBodyTextClass}`}
            >
              Ver en mis entradas
            </Link>
            <Link
              href={`/e/${event.slug}`}
              className={`inline-flex min-h-[50px] w-full min-w-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-center font-normal text-white ring-1 ring-inset ring-white/[0.06] transition hover:border-white/15 hover:bg-white/[0.06] ${siteBodyTextClass}`}
            >
              Volver al evento
            </Link>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
