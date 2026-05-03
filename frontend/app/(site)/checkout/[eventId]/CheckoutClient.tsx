"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getToken } from "@/lib/api";
import { purchaseTickets, type PurchasedTicket } from "@/lib/customerApi";
import type { EventImageFooterTheme } from "@/lib/eventFooterTheme";
import { EventTicketPassCard } from "@/components/site/EventTicketPassCard";
import { getEventCoverImageUrl } from "@/lib/eventCoverImage";
import { fetchPublicEventById, type PublicEventDetail } from "@/lib/publicApi";
import { formatDate, formatMoney } from "@/lib/format";
import { useEventImageFooterColor } from "@/hooks/useEventImageFooterColor";
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

type Step = 1 | 2 | 3 | 4;

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" className="text-[#9B7FCA]/90" />
      <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gozalo-blue" />
    </svg>
  );
}

type CheckoutClientProps = {
  eventId: string;
  /** Imagen usada para el color de fondo (misma lógica que el API); puede venir del SSR. */
  initialCoverForTheme?: string | null;
  serverFooterTheme?: EventImageFooterTheme | null;
};

export function CheckoutClient({
  eventId,
  initialCoverForTheme = null,
  serverFooterTheme: serverFooterThemeProp = null,
}: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [event, setEvent] = useState<PublicEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState<{ orderId: string; tickets: PurchasedTicket[] } | null>(null);
  const requestedTicketTypeId = searchParams.get("ticketTypeId");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(`/checkout/${eventId}`)}`);
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
      } catch {
        if (!active) return;
        setError("Error al cargar el checkout.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId, router]);

  const ticketTypes = useMemo(
    () => (event?.ticketTypes ?? []).filter((t) => t.active !== false),
    [event]
  );

  const selectedType = useMemo(
    () => ticketTypes.find((t) => (t.id ?? t.name) === selectedTypeId) ?? null,
    [ticketTypes, selectedTypeId]
  );

  useEffect(() => {
    if (ticketTypes.length === 0) return;
    const isCurrentValid = selectedTypeId
      ? ticketTypes.some((t) => (t.id ?? t.name) === selectedTypeId)
      : false;
    if (isCurrentValid) return;
    if (!requestedTicketTypeId) return;
    const matched = ticketTypes.find((t) => (t.id ?? t.name) === requestedTicketTypeId);
    if (!matched) return;
    setSelectedTypeId(requestedTicketTypeId);
    setStep(2);
  }, [requestedTicketTypeId, selectedTypeId, ticketTypes]);

  const unitPrice = selectedType ? Number(selectedType.price) : 0;
  const subtotal = unitPrice * qty;
  const fee = Number((subtotal * 0.1).toFixed(2));
  const total = Number((subtotal + fee).toFixed(2));
  const available = selectedType?.quantityTotal ?? null;
  const showQuantityToPublic = selectedType?.showQuantityPublic !== false;

  const coverUrl = useMemo(
    () => (event ? getEventCoverImageUrl(event) : null),
    [event]
  );

  const coverForTheme = useMemo(
    () => (event ? getEventCoverImageUrl(event) : initialCoverForTheme),
    [event, initialCoverForTheme]
  );

  const imageTheme = useEventImageFooterColor(
    coverForTheme,
    Boolean(coverForTheme),
    serverFooterThemeProp ?? undefined
  );

  const checkoutPageBackground = useMemo((): CSSProperties => {
    const c = imageTheme.footerBg;
    return {
      background: [
        `radial-gradient(ellipse 100% 75% at 50% -15%, color-mix(in srgb, ${c} 52%, #0a0a12) 0%, transparent 58%)`,
        `linear-gradient(180deg, color-mix(in srgb, ${c} 22%, #060608) 0%, #040406 38%, #020203 100%)`,
      ].join(", "),
    };
  }, [imageTheme.footerBg]);

  async function doPay() {
    if (!event || !selectedType) return;
    if (available != null && qty > available) {
      setError(`Solo hay ${available} entrada(s) disponible(s) para este tipo.`);
      return;
    }

    setError(null);
    setPaying(true);
    try {
      const data = await purchaseTickets({
        eventId: event.id,
        items: [{ ticketType: selectedType.name, quantity: qty, unitPrice }],
      });
      setResult({ orderId: data.order.id, tickets: data.tickets });
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el pago.");
    } finally {
      setPaying(false);
    }
  }

  const checkoutBackdrop = (
    <div
      className="pointer-events-none fixed inset-0 -z-10 min-h-[100dvh] w-full"
      style={checkoutPageBackground}
      aria-hidden
    />
  );

  if (loading) {
    return (
      <>
        {checkoutBackdrop}
        <div className={`relative mx-auto max-w-4xl px-4 py-20 text-center ${siteBodyMutedClass}`}>
          Cargando checkout...
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        {checkoutBackdrop}
        <div className="relative mx-auto max-w-3xl px-4 py-20">
          <div className={`rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100 ${siteBodyTextClass}`}>
            {error ?? "Evento no disponible."}
          </div>
        </div>
      </>
    );
  }

  /** Misma anchura en móvil para barra de progreso y tarjetas (pasos 2–4). */
  const checkoutStepColumn =
    step >= 2 && step <= 4 ? "mx-auto w-full max-w-md sm:max-w-2xl" : "w-full";

  return (
    <>
      {checkoutBackdrop}
      <div
        className="relative mx-auto w-full max-w-5xl px-4 py-12 md:px-6"
      >
      <header className="w-full min-w-0 text-center sm:text-left">
        <p
          className={`text-[11px] font-normal uppercase tracking-[0.18em] text-white/55 ${
            step === 1 ? "max-md:mt-1" : ""
          }`}
        >
          Checkout
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
          {event.title}
        </h1>
        <p
          className={`${siteBodyTextClass} ${
            step === 1 ? "mt-1.5 line-clamp-2" : "mt-2"
          }`}
        >
          {formatDate(event.startAt)} · {event.venue?.name}
        </p>
      </header>

      <div
        className={`h-2 min-w-0 overflow-hidden rounded-full bg-night-800 ${checkoutStepColumn} ${
          step === 1 && coverUrl ? "mt-4 max-md:mt-4 md:mt-6" : "mt-6"
        }`}
      >
        <div
          className="h-full bg-gradient-to-r from-gozalo-blue to-gozalo-accent transition-all"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      {error && (
        <div className={`mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-100 ${siteBodyTextClass}`}>
          {error}
        </div>
      )}

      {step === 1 && (
        <>
          {coverUrl && (
            <div className="mt-5 flex w-full flex-col items-center gap-0 md:hidden sm:mt-6">
              <div className="flex h-[17rem] w-full max-w-[min(100%,24rem)] items-center justify-center sm:h-[19rem] sm:max-w-[26rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={coverUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div
                className="mt-1 h-px w-full max-w-[min(100%,20rem)] bg-gradient-to-r from-transparent via-white/20 to-transparent sm:max-w-xs"
                aria-hidden
              />
            </div>
          )}

          <div
            className={
              coverUrl
                ? "mt-8 max-md:mt-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-night-900/80 p-4 shadow-lg shadow-black/30 max-md:rounded-3xl max-md:ring-1 max-md:ring-inset max-md:ring-white/5 md:mt-8 md:from-night-900/60 md:p-6 md:shadow-inner md:shadow-none"
                : "mt-8 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-night-900/80 p-4 max-md:rounded-3xl max-md:ring-1 max-md:ring-inset max-md:ring-white/5 md:from-night-900/60 md:p-6"
            }
          >
            <div className="mb-3 flex w-full items-center justify-between gap-2 md:mb-1 md:justify-start md:gap-3">
              <span className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white/80 max-md:shadow-sm md:py-1">
                Paso 1 de 4
              </span>
              <span className="text-[10px] font-normal uppercase tracking-[0.2em] text-[#9B7FCA]/90 max-md:opacity-90 md:hidden">
                Entradas
              </span>
            </div>
            <h2 className={`mt-1 max-md:mt-0 md:mt-1 ${siteSectionTitleClass}`}>
              <span className="hidden md:inline">Paso 1 · </span>Selecciona tu entrada
            </h2>
            <p className={`mt-1.5 md:mt-2 ${siteBodyMutedClass}`}>
              <span className="md:hidden">Toca un tipo y te llevamos al checkout.</span>
              <span className="hidden md:inline">Elige un tipo y te llevamos al panel de checkout.</span>
            </p>
            <div className="mt-4 max-md:space-y-2.5 space-y-3">
              {ticketTypes.map((t) => {
                const id = t.id ?? t.name;
                const isSel = selectedTypeId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setSelectedTypeId(id);
                      setStep(2);
                    }}
                    className={[
                      "flex w-full items-center justify-between gap-3 text-left transition",
                      "rounded-xl border px-4 py-3",
                      "max-md:rounded-2xl max-md:px-4 max-md:py-3.5",
                      isSel
                        ? "border-gozalo-blue bg-gozalo-blue/10 max-md:ring-2 max-md:ring-[#9B7FCA]/45 max-md:ring-offset-2 max-md:ring-offset-[#0a0a0a] max-md:shadow-md max-md:shadow-[#7B5EA7]/10"
                        : "border-white/10 bg-night-800/60 hover:border-white/20 max-md:border-white/10 max-md:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`text-white ${siteBodyTextClass}`}>{t.name}</p>
                      {t.description && (
                        <p className={`mt-0.5 line-clamp-2 ${siteBodyMutedClass}`}>{t.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2.5">
                      <p className={`shrink-0 tabular-nums text-gozalo-blue ${siteBodyTextClass}`}>
                        {formatMoney(Number(t.price))}
                      </p>
                      {isSel && <IconCheckCircle className="hidden max-md:block" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {step === 2 && selectedType && (
        <div
          className={`mt-8 grid w-full grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 md:items-stretch ${checkoutStepColumn}`}
        >
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-night-900/65 p-5 text-center ring-1 ring-inset ring-white/[0.06] sm:p-6 md:text-left">
            <span className="mx-auto inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white/75 md:mx-0">
              Paso 2 de 4
            </span>
            <h2 className={`mt-3 ${siteSectionTitleClass}`}>Selecciona la cantidad</h2>
            <p className={`mt-2 ${siteBodyTextClass}`}>{selectedType.name}</p>
            {showQuantityToPublic && available != null && (
              <p className={`mt-1 ${siteBodyMutedClass}`}>
                Disponibles:{" "}
                <span className={`${siteCheckoutFiguresSansClass} font-semibold text-white/[0.78]`}>
                  {available}
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
                  aria-label="Quitar una entrada"
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
                    Cantidad seleccionada: {qty === 1 ? "1 entrada" : `${qty} entradas`}.
                  </span>
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQty((q) => (available != null ? Math.min(available, q + 1) : q + 1))
                  }
                  className="flex size-[3rem] shrink-0 items-center justify-center justify-self-center rounded-full border border-white/14 bg-white/[0.06] font-light text-[1.85rem] leading-none text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-white/[0.1] active:scale-[0.96] sm:size-[3.35rem] sm:text-[2rem]"
                  aria-label="Añadir una entrada"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div
            className={`flex h-full min-h-0 flex-col rounded-2xl border border-white/10 bg-night-900/65 p-5 ring-1 ring-inset ring-white/[0.06] sm:p-6 ${siteCheckoutFiguresSansClass}`}
          >
            <div className="flex items-end justify-between gap-3 md:block">
              <h3 className={`md:text-left !font-medium ${siteSectionTitleClass}`}>Resumen</h3>
              <p className={`font-sans md:mt-0.5 md:text-left ${siteCheckoutSummaryRowsClass} tabular-nums text-white/50`}>
                {qty === 1 ? "1 entrada" : `${qty} entradas`}
              </p>
            </div>
            <div
              className={`mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-[#07070d]/95 font-normal text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${siteCheckoutSummaryRowsClass}`}
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
                <div className="flex items-center justify-between gap-6 px-3.5 py-2.5 text-white/70">
                  <span className="min-w-0 leading-snug">Gastos de gestión (10&nbsp;%)</span>
                  <span className="tabular-nums text-white/88">{formatMoney(fee)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-6 border-t border-white/[0.1] bg-white/[0.04] px-3.5 py-3 font-sans text-[13px] text-white sm:text-[14px] md:text-[15px]">
                <span className="font-medium tracking-wide">Total</span>
                <span className="tabular-nums font-semibold tracking-wide">{formatMoney(total)}</span>
              </div>
            </div>
            <div className="mx-auto mt-5 grid w-full max-w-sm grid-cols-2 gap-2.5 sm:gap-3 md:mx-0 md:mt-auto md:max-w-none">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`inline-flex min-h-[38px] w-full items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] px-3 py-2 text-center font-sans text-[13px] font-normal text-white ring-1 ring-inset ring-white/[0.05] transition hover:border-white/18 hover:bg-white/[0.07] sm:text-sm`}
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className={`btn-primary inline-flex min-h-[38px] w-full items-center justify-center rounded-lg !px-3 !py-2 text-center font-sans text-[13px] !font-normal sm:text-sm`}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && selectedType && (
        <div
          className={`mt-8 rounded-2xl border border-white/10 bg-night-900/60 p-5 ring-1 ring-inset ring-white/[0.06] sm:p-6 ${checkoutStepColumn}`}
        >
          <div className="mx-auto flex max-w-lg flex-col items-center text-center sm:max-w-none sm:items-stretch sm:text-left">
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-[10px] font-normal uppercase tracking-wider text-white/75">
              Paso 3 de 4
            </span>
            <h2 className={`mt-3 sm:mt-2 ${siteSectionTitleClass}`}>Paso 3 · Pago</h2>
            <p className={`mt-2 max-w-sm sm:max-w-none ${siteBodyMutedClass}`}>
              Confirma tu compra para generar tus QR al instante.
            </p>
          </div>
          <div
            className={`mt-4 grid gap-y-2 rounded-xl border border-white/10 bg-night-950/50 p-4 font-medium text-white/70 ring-1 ring-inset ring-white/[0.05] sm:p-5 ${siteCheckoutFiguresSansClass} ${siteCheckoutSummaryRowsClass}`}
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
              {" + comisión 10 %"}
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
              onClick={() => setStep(2)}
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

      {step === 4 && result && (
        <div className={`mt-8 space-y-6 ${checkoutStepColumn}`}>
          <div className="rounded-2xl border border-white/10 bg-night-900/45 p-5 text-center ring-1 ring-inset ring-white/[0.07] sm:p-6">
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
              href={`/eventos/${event.slug}`}
              className={`inline-flex min-h-[50px] w-full min-w-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-center font-normal text-white ring-1 ring-inset ring-white/[0.06] transition hover:border-white/15 hover:bg-white/[0.06] ${siteBodyTextClass}`}
            >
              Volver al evento
            </Link>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
