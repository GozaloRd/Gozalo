"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CalendarClock, History, LayoutTemplate, Plus } from "lucide-react";
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import { DesktopEventDrawer } from "@/components/dashboard/desktop/DesktopEventDrawer";
import { DesktopEventsGrid } from "@/components/dashboard/desktop/DesktopEventsGrid";
import { MobileButton } from "@/components/dashboard/mobile/shared/MobileButton";
import { CreateEventForm } from "@/components/dashboard/panels/CreateEventForm";
import { PanelFooterLinks } from "@/components/dashboard/panels/PanelFooterLinks";
import { UpcomingEventsList } from "@/components/dashboard/upcoming/UpcomingEventsList";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import { fetchDashboardEvents } from "@/lib/dashboardApi";

type TabKey = "activos" | "pasados" | "plantillas";

type ListStats = Parameters<typeof UpcomingEventsList>[0]["stats"];

export function EventsPanel({
  area,
  venueId,
  venueCity,
  venueName,
  venueAddress,
  upcomingEvents,
  stats,
  loading,
  nowMs,
  opsAlertCount,
  onRefresh,
}: {
  area: QuickAreaConfig;
  venueId: string;
  venueCity?: string;
  venueName?: string;
  venueAddress?: string;
  upcomingEvents: UpcomingEventModel[];
  stats: ListStats;
  loading: boolean;
  nowMs: number;
  opsAlertCount: number;
  onRefresh?: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("activos");
  const [createOpen, setCreateOpen] = useState(false);
  const [pastEvents, setPastEvents] = useState<UpcomingEventModel[]>([]);
  const [pastLoading, setPastLoading] = useState(false);
  const [desktopEvent, setDesktopEvent] = useState<UpcomingEventModel | null>(null);
  const [desktopDrawerOpen, setDesktopDrawerOpen] = useState(false);

  const loadPastEvents = useCallback(async () => {
    if (!venueId) return;
    setPastLoading(true);
    try {
      const res = (await fetchDashboardEvents("past", venueId)) as { data?: UpcomingEventModel[] };
      setPastEvents(res.data ?? []);
    } catch {
      setPastEvents([]);
    } finally {
      setPastLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    if (tab !== "pasados" || !venueId) return;
    void loadPastEvents();
  }, [tab, venueId, loadPastEvents]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <MobileButton
          type="button"
          variant="primary"
          area="eventos"
          disabled={!venueId}
          onClick={() => setCreateOpen(true)}
          className="min-h-[52px] font-bold md:min-h-0 md:w-auto md:px-6 md:py-3"
        >
          <Plus className="h-5 w-5" aria-hidden />
          Crear evento
        </MobileButton>
      </div>

      <div className="relative flex w-full gap-2 border-b border-white/[0.06] pb-px" role="tablist" aria-label="Vista de eventos">
        {(
          [
            ["activos", "Activos", CalendarClock],
            ["pasados", "Pasados", History],
            ["plantillas", "Plantillas", LayoutTemplate],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`relative flex min-h-[44px] flex-1 items-center justify-center gap-1 px-1 pb-2.5 pt-1 text-xs transition-all duration-300 ${
                active ? "font-semibold text-white" : "font-normal text-zinc-500 hover:text-zinc-400"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${active ? "text-white" : "text-zinc-500"}`}
                aria-hidden
              />
              {label}
              {active ? (
                <motion.span
                  layoutId="events-tab-underline"
                  className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full bg-orange-500 shadow-[0_2px_8px_rgba(249,115,22,0.4)]"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "activos" ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400">Eventos activos / próximos</p>
          <div className="md:hidden">
            <UpcomingEventsList
              events={upcomingEvents}
              loading={loading}
              stats={stats}
              nowMs={nowMs}
              onEventUpdated={onRefresh}
            />
          </div>
          <div className="hidden md:block">
            {loading && upcomingEvents.length === 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4" aria-busy>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[260px] animate-pulse rounded-2xl border border-white/[0.08] bg-zinc-900/60"
                  />
                ))}
              </div>
            ) : (
              <DesktopEventsGrid
                events={upcomingEvents}
                nowMs={nowMs}
                variant="upcoming"
                onSelect={(e) => {
                  setDesktopEvent(e);
                  setDesktopDrawerOpen(true);
                }}
              />
            )}
          </div>
        </div>
      ) : null}

      {tab === "pasados" ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400">Historial de eventos finalizados</p>
          <div className="md:hidden">
            <UpcomingEventsList
              events={pastEvents}
              loading={pastLoading}
              stats={stats}
              nowMs={nowMs}
              variant="past"
              onEventUpdated={() => {
                void loadPastEvents();
                onRefresh?.();
              }}
            />
          </div>
          <div className="hidden md:block">
            {pastLoading && pastEvents.length === 0 ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4" aria-busy>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-[260px] animate-pulse rounded-2xl border border-white/[0.08] bg-zinc-900/60"
                  />
                ))}
              </div>
            ) : (
              <DesktopEventsGrid
                events={pastEvents}
                nowMs={nowMs}
                variant="past"
                onSelect={(e) => {
                  setDesktopEvent(e);
                  setDesktopDrawerOpen(true);
                }}
              />
            )}
          </div>
        </div>
      ) : null}

      {tab === "plantillas" ? (
        <div className="rounded-xl border border-white/[0.08] bg-zinc-950/50 p-4 text-center">
          <LayoutTemplate className="mx-auto h-10 w-10 text-slate-600" aria-hidden />
          <p className="mt-2 text-sm text-slate-300">
            Duplica bases y configuraciones para lanzar eventos recurrentes más rápido.
          </p>
        </div>
      ) : null}

      <PanelFooterLinks area={area} items={area.items} opsAlertCount={opsAlertCount} />

      <CreateEventForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        venueId={venueId}
        venueCity={venueCity}
        venueName={venueName}
        venueAddress={venueAddress}
        onEventSaved={() => onRefresh?.()}
      />

      <DesktopEventDrawer
        open={desktopDrawerOpen}
        event={desktopEvent}
        nowMs={nowMs}
        stats={stats}
        variant={tab === "pasados" ? "past" : "upcoming"}
        onClose={() => setDesktopDrawerOpen(false)}
        onAfterClose={() => setDesktopEvent(null)}
        onEventUpdated={() => {
          onRefresh?.();
          if (tab === "pasados") void loadPastEvents();
        }}
      />
    </div>
  );
}
