"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AreaSubmenu } from "@/components/dashboard/AreaSubmenu";
import { QuickActionBubbles } from "@/components/dashboard/QuickActionBubbles";
import type { QuickAreaId } from "@/components/dashboard/quickActions.config";
import { StarryBackground } from "@/components/dashboard/StarryBackground";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { useDashboard } from "@/contexts/DashboardContext";
import { useOpsAlertsCount } from "@/hooks/useOpsAlertsCount";

type Stats = {
  occupancy: {
    activeEvent: { id: string; title: string } | null;
    currentAttendees: number;
    maxCapacity: number;
    ratio: number;
  };
  reservations?: { today: number; week: number; month: number };
  revenue?: { totalRD: { today: number; week: number; month: number } };
};

type Analytics = {
  summary: {
    revenue: { total: number; today?: number };
    tickets?: { today: number; total: number };
    reservations?: { today: number; total: number };
    occupancyCurrent?: {
      currentAttendees: number;
      maxCapacity: number;
      ratio: number;
      percentage: number;
    };
  };
  charts?: {
    salesByDay?: { day: string; total: number }[];
    revenueByEvent?: { eventId: string; eventTitle: string; total: number }[];
    entriesVsTables?: { eventId: string; eventTitle: string; tickets: number; tables: number }[];
  };
};

type Props = {
  upcomingEvents: UpcomingEventModel[];
  stats: Stats | null;
  analytics: Analytics | null;
  loading: boolean;
  /** Reloj sincronizado con la página (para EN VIVO / countdown). */
  nowMs: number;
  onRefreshData?: () => void;
};

export function MobileDashboard({
  upcomingEvents,
  stats,
  analytics,
  loading,
  nowMs,
  onRefreshData,
}: Props) {
  const { venueId, venue } = useDashboard();
  const opsAlertCount = useOpsAlertsCount(venueId);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const [activeQuickArea, setActiveQuickArea] = useState<QuickAreaId | null>("eventos");

  const toggleQuickArea = useCallback((id: QuickAreaId) => {
    setActiveQuickArea((cur) => (cur === id ? null : id));
  }, []);

  useEffect(() => {
    if (!activeQuickArea) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = quickActionsRef.current;
      if (el && !el.contains(e.target as Node)) {
        setActiveQuickArea(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [activeQuickArea]);

  return (
    <div className="relative min-h-screen bg-black md:min-h-0 md:bg-transparent">
      <StarryBackground />
      <div className="relative z-10">
        <section
          className="mx-auto w-full max-w-md space-y-5 px-4 pb-6 pt-0"
          aria-label="Panel móvil"
        >
          <Link
            href="/dashboard/configuracion"
            className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl border border-white/[0.1] bg-zinc-900/90 px-4 py-3 text-sm shadow-lg backdrop-blur-sm transition hover:bg-zinc-800/95 motion-safe:duration-150 active:scale-[0.99]"
            aria-label="Configura tu organización (progreso 0 de 5)"
          >
            <span className="min-w-0 flex-1 font-medium text-white/90">Configura tu organización</span>
            <span className="shrink-0 rounded-md bg-white/[0.06] px-2 py-1 text-xs font-bold tabular-nums text-amber-500">
              0/5
            </span>
            <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
          </Link>

          <div ref={quickActionsRef}>
            <QuickActionBubbles activeAreaId={activeQuickArea} onToggleArea={toggleQuickArea} />
            <AreaSubmenu
              activeAreaId={activeQuickArea}
              onClose={() => setActiveQuickArea(null)}
              opsAlertCount={opsAlertCount}
              upcomingEvents={upcomingEvents}
              stats={stats}
              analytics={analytics}
              loading={loading}
              nowMs={nowMs}
              venueId={venueId ?? ""}
              venueCity={venue?.city}
              onRefreshData={onRefreshData}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
