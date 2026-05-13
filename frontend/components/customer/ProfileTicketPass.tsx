"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { EventTicketPassCard } from "@/components/site/EventTicketPassCard";
import type { MyTicket } from "@/lib/customerApi";
import { formatMoney } from "@/lib/format";

const STATUS_TICKET_LABEL: Record<string, string> = {
  paid: "Pagado",
  valid: "Válido",
  used: "Canjeado",
  pending: "Pendiente",
  cancelled: "Cancelado",
};

function slugify(s: string) {
  const base = s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 48) || "entrada";
}

type Props = { ticket: MyTicket; history?: boolean };

export function ProfileTicketPass({ ticket, history }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const e = ticket.event;
  const startAt = e?.startAt ?? ticket.createdAt;
  const st = String(ticket.status ?? "").toLowerCase();
  const showQr = st === "paid" || st === "valid" || st === "used";
  const statusLabel = STATUS_TICKET_LABEL[st] ?? ticket.status;
  const priceLabel = ticket.unitPrice != null ? formatMoney(Number(ticket.unitPrice)) : "—";

  const handleDownload = useCallback(async () => {
    const el = captureRef.current;
    if (!el) return;
    setBusy(true);
    setErr(null);
    try {
      if (typeof document !== "undefined" && "fonts" in document) {
        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
      }
      const { default: html2canvas } = await import("html2canvas");
      const cloned = el.cloneNode(true) as HTMLDivElement;
      cloned.style.width = "420px";
      cloned.style.maxWidth = "420px";
      cloned.style.padding = "0";
      cloned.style.margin = "0";
      cloned.style.background = "#0a0a0f";
      cloned.style.borderRadius = "24px";
      cloned.style.overflow = "hidden";
      cloned.style.boxShadow = "none";

      const sandbox = document.createElement("div");
      sandbox.style.position = "fixed";
      sandbox.style.left = "-99999px";
      sandbox.style.top = "0";
      sandbox.style.zIndex = "-1";
      sandbox.style.pointerEvents = "none";
      sandbox.style.background = "#0a0a0f";
      sandbox.appendChild(cloned);
      document.body.appendChild(sandbox);

      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(cloned, {
          useCORS: true,
          allowTaint: false,
          scale: Math.max(2, Math.min(4, window.devicePixelRatio * 2)),
          backgroundColor: "#0a0a0f",
          logging: false,
          width: cloned.scrollWidth,
          height: cloned.scrollHeight,
          windowWidth: cloned.scrollWidth,
          windowHeight: cloned.scrollHeight,
          onclone: (doc) => {
            const poster = doc.querySelector<HTMLElement>("[data-ticket-pass-poster]");
            if (poster) poster.style.maxHeight = "none";
          },
        });
      } finally {
        if (sandbox.parentNode) sandbox.parentNode.removeChild(sandbox);
      }
      const a = document.createElement("a");
      a.download = `gozalo-${slugify(e?.title ?? "entrada")}-${ticket.id.slice(0, 8)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } catch (x) {
      setErr(
        x instanceof Error
          ? x.message
          : "No se pudo generar la imagen (prueba tras cargar la página o comprueba tu conexión)."
      );
    } finally {
      setBusy(false);
    }
  }, [e?.title, ticket.id]);

  const canDownloadPng =
    showQr && (Boolean(ticket.qrPayload) || Boolean(ticket.qrImage && ticket.qrImage.length > 0));

  return (
    <article
      className={`rounded-2xl border border-white/[0.08] p-4 ${
        history ? "bg-[#111118]/80" : "bg-[#111118]"
      }`}
    >
      <div ref={captureRef} className="flex w-full flex-col items-center pb-2">
        <EventTicketPassCard
          eventTitle={e?.title ?? "Evento"}
          startAt={startAt || new Date().toISOString()}
          venueName={e?.venue?.name}
          city={e?.venue?.city}
          coverImageUrl={e?.coverImageUrl}
          ticketType={ticket.ticketType}
          priceLabel={priceLabel}
          qrImageUrl={showQr ? ticket.qrImage : null}
          qrPayload={showQr && !ticket.qrImage ? ticket.qrPayload ?? null : null}
          preferImgElement
          status={st}
          statusLabel={statusLabel}
          className="shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        />
      </div>

      <div className="mt-2 flex flex-col gap-2 border-t border-white/5 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Link
          href={e?.slug ? `/e/${e.slug}` : "/eventos"}
          className="rounded-xl border border-white/20 px-4 py-2 text-center text-xs font-semibold text-white hover:bg-white/5"
        >
          Ver detalle del evento
        </Link>
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={busy || !canDownloadPng}
          className="rounded-xl border border-[#C77DFF]/40 bg-[#C77DFF]/15 px-4 py-2 text-xs font-bold text-[#E0AAFF] transition-colors hover:bg-[#C77DFF]/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Generando imagen…" : "Descargar pase (PNG)"}
        </button>
      </div>
      {err ? <p className="mt-2 text-xs text-rose-300">{err}</p> : null}
      {!canDownloadPng ? (
        <p className="mt-2 text-xs text-slate-500">
          Cuando tu entrada esté pagada o válida, podrás descargar el pase con el código QR.
        </p>
      ) : null}
    </article>
  );
}
