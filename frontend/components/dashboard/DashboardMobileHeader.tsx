"use client";

import Link from "next/link";
import { DashboardLocalLogo } from "@/components/dashboard/DashboardLocalLogo";
import { MobileNotificationButton } from "@/components/dashboard/MobileNotificationButton";
import { useDashboard } from "@/contexts/DashboardContext";
import { useOpsAlertsCount } from "@/hooks/useOpsAlertsCount";

function shortVenueLabel(name: string, max = 14): string {
  const t = name.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, Math.max(3, max - 1)).trim();
  return `${cut}…`;
}

export function DashboardMobileHeader({
  venueName,
  onOpenSidebar,
  className,
}: {
  venueName: string;
  onOpenSidebar: () => void;
  className?: string;
}) {
  const { venueId } = useDashboard();
  const alertCount = useOpsAlertsCount(venueId);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-2 border-b border-white/[0.08] bg-[#0A0A0F]/70 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0A0A0F]/65 md:hidden ${className ?? ""}`}
    >
      <DashboardLocalLogo />

      <Link
        href="/dashboard"
        className="flex min-w-0 flex-1 items-center gap-1 rounded-lg py-1 pl-1 pr-2 transition duration-150 hover:bg-white/[0.04] active:scale-[0.97] motion-safe:active:scale-[0.97]"
      >
        <span className="flex min-w-0 flex-col items-start gap-0 text-left">
          <span className="truncate text-sm font-medium text-white" title={venueName}>
            {shortVenueLabel(venueName)}
          </span>
        </span>
        <span aria-hidden className="shrink-0 self-center text-[#6B7280]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </Link>

      <div className="flex shrink-0 items-center gap-0.5">
        <MobileNotificationButton alertCount={alertCount} />
        <button
          type="button"
          onClick={onOpenSidebar}
          className="relative rounded-lg p-2 text-[#6B7280] transition duration-150 hover:bg-white/[0.05] hover:text-[#9CA3AF] active:scale-[0.97] motion-safe:active:scale-[0.97]"
          aria-label="Abrir menú"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="6" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="18" r="1.6" />
          </svg>
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#9B7FCA]" aria-hidden />
        </button>
      </div>
    </header>
  );
}
