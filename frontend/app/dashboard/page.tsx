"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardDesktopDashboard } from "@/components/dashboard/DashboardDesktopDashboard";
import { MobileDashboard } from "@/components/dashboard/MobileDashboard";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  fetchDashboardAnalytics,
  fetchDashboardEvents,
  fetchDashboardReservations,
  fetchDashboardStats,
} from "@/lib/dashboardApi";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";

export default function DashboardHomePage() {
  const { venueId, venue } = useDashboard();
  const [stats, setStats] = useState<MobileStats | null>(null);
  const [analytics, setAnalytics] = useState<MobileAnalytics | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingEventModel[]>([]);
  const [allVenueEvents, setAllVenueEvents] = useState<UpcomingEventModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const [s, a, evts, allEvts] = await Promise.all([
        fetchDashboardStats(venueId).catch(() => null),
        fetchDashboardAnalytics({ range: "30d" }, venueId).catch(() => null),
        fetchDashboardEvents("upcoming", venueId).catch(() => ({ data: [] })),
        fetchDashboardEvents("all", venueId).catch(() => ({ data: [] })),
        fetchDashboardReservations({ status: "pending" }, venueId).catch(() => ({ data: [] })),
      ]);

      if (s) setStats(s as MobileStats);
      if (a) setAnalytics(a as MobileAnalytics);
      setUpcoming(((evts as { data?: UpcomingEventModel[] })?.data ?? []) as UpcomingEventModel[]);
      setAllVenueEvents(((allEvts as { data?: UpcomingEventModel[] })?.data ?? []) as UpcomingEventModel[]);
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    void load();
    const dataTick = window.setInterval(() => void load(), 30_000);
    const clockTick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearInterval(dataTick);
      window.clearInterval(clockTick);
    };
  }, [load]);

  if (!venueId) {
    return <div className="py-16 text-center text-slate-500">Selecciona un local para ver el panel.</div>;
  }

  const panelProps = {
    upcomingEvents: upcoming,
    allVenueEvents,
    stats,
    analytics,
    loading,
    nowMs: now,
    venueId,
    venueCity: venue?.city,
    venueName: venue?.name,
    venueAddress: venue?.address ?? null,
    onRefreshData: load,
  };

  return (
    <>
      <div className="md:hidden">
        <MobileDashboard {...panelProps} />
      </div>
      <div className="hidden md:block">
        <DashboardDesktopDashboard {...panelProps} />
      </div>
    </>
  );
}
