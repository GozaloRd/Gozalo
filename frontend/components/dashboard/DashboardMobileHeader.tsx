"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { DashboardLocalLogo } from "@/components/dashboard/DashboardLocalLogo";
import { useDashboard } from "@/contexts/DashboardContext";
import { useOpsAlertsCount } from "@/hooks/useOpsAlertsCount";

const PAGE_TITLE: Record<string, string> = {
  "/dashboard/estadisticas": "Estadísticas",
  "/dashboard/eventos": "Eventos",
  "/dashboard/reservas": "Reservas",
  "/dashboard/tickets": "Tickets",
  "/dashboard/mesas": "Mesas",
  "/dashboard/caja": "Caja",
  "/dashboard/configuracion": "Configuración",
  "/dashboard/acceso": "Control de acceso",
  "/dashboard/collage": "Collage",
  "/dashboard/guestlist": "Lista",
};

function supportWhatsAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER;
  if (!raw) return null;
  const n = String(raw).replace(/\D/g, "");
  if (!n) return null;
  const text = encodeURIComponent("Hola, necesito ayuda con mi panel de local en Gozalo.");
  return `https://wa.me/${n}?text=${text}`;
}

function shortVenueLabel(name: string, max = 14): string {
  const t = name.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, Math.max(3, max - 1)).trim();
  return `${cut}…`;
}

export function DashboardMobileHeader({
  venueName,
  onOpenSidebar,
}: {
  venueName: string;
  onOpenSidebar: () => void;
}) {
  const { venueId } = useDashboard();
  const alertCount = useOpsAlertsCount(venueId);
  const path = usePathname();
  const wa = useMemo(() => supportWhatsAppUrl(), []);
  const pageCrumb = useMemo(() => {
    if (!path || path === "/dashboard") return null;
    if (PAGE_TITLE[path]) return PAGE_TITLE[path];
    for (const [prefix, label] of Object.entries(PAGE_TITLE)) {
      if (path.startsWith(`${prefix}/`)) return label;
    }
    return null;
  }, [path]);

  return (
    <header className="fixed inset-x-0 top-0 z-[45] flex h-14 items-center gap-2 border-b border-white/[0.08] bg-[#0A0A0F]/95 px-3 backdrop-blur-md lg:hidden">
      <DashboardLocalLogo />

      <Link
        href="/dashboard/configuracion"
        className="flex min-w-0 flex-1 items-center gap-1 rounded-lg py-1 pl-1 pr-2 transition hover:bg-white/[0.04] active:scale-[0.98] motion-safe:duration-150"
      >
        <span className="flex min-w-0 flex-col items-start gap-0.5 text-left">
          <span className="truncate text-sm font-semibold text-white md:hidden" title={venueName}>
            {shortVenueLabel(venueName)}
          </span>
          <span className="hidden truncate text-sm font-semibold text-white md:block" title={venueName}>
            {venueName}
          </span>
          {pageCrumb ? (
            <span className="max-w-[11rem] truncate text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">
              {pageCrumb}
            </span>
          ) : null}
        </span>
        <span aria-hidden className="shrink-0 self-start text-[#6B7280] pt-0.5">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-0.5">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-[#6B7280] transition hover:bg-white/[0.05] hover:text-[#9CA3AF]"
            aria-label="Soporte por WhatsApp"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </a>
        )}
        <button
          type="button"
          className="relative rounded-lg p-2 text-[#6B7280] transition hover:bg-white/[0.05] hover:text-[#9CA3AF]"
          aria-label={alertCount > 0 ? `Alertas operativas (${alertCount})` : "Notificaciones"}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {alertCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EF4444]/90 ring-2 ring-[#0A0A0F]" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={onOpenSidebar}
          className="relative rounded-lg p-2 text-[#6B7280] transition hover:bg-white/[0.05] hover:text-[#9CA3AF]"
          aria-label="Abrir menú"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="18" r="1.6" />
          </svg>
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#9B7FCA]" />
        </button>
      </div>
    </header>
  );
}
