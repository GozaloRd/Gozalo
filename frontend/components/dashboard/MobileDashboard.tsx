"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AreaSubmenu } from "@/components/dashboard/AreaSubmenu";
import { HeaderDivider } from "@/components/dashboard/HeaderDivider";
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
  /** Opcional (desktop estadísticas); móvil no lo usa. */
  allVenueEvents?: UpcomingEventModel[];
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
      const t = e.target;
      if (t instanceof Element && t.closest("[data-prevent-dashboard-collapse]")) {
        return;
      }
      const el = quickActionsRef.current;
      if (el && !el.contains(t as Node)) {
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
        <section className="mx-auto w-full max-w-md px-4 pb-6 pt-0" aria-label="Panel móvil">
          <div className="sticky top-14 z-[43] -mx-4 mb-4 border-b border-white/[0.06] bg-[#0A0A0F]/70 px-4 pb-4 pt-3 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0A0A0F]/60">
            <HeaderDivider className="mb-4" />
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
                venueName={venue?.name}
                venueAddress={venue?.address}
                onRefreshData={onRefreshData}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
