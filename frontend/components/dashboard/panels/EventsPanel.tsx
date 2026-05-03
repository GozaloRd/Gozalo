"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarClock, History, LayoutTemplate, Plus } from "lucide-react";
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import { MobileButton } from "@/components/dashboard/mobile/shared/MobileButton";
import { CreateEventForm } from "@/components/dashboard/panels/CreateEventForm";
import { PanelFooterLinks } from "@/components/dashboard/panels/PanelFooterLinks";
import { UpcomingEventsList } from "@/components/dashboard/upcoming/UpcomingEventsList";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";

type TabKey = "activos" | "pasados" | "plantillas";

type ListStats = Parameters<typeof UpcomingEventsList>[0]["stats"];
type ListAnalytics = Parameters<typeof UpcomingEventsList>[0]["analytics"];

export function EventsPanel({
  area,
  venueId,
  venueCity,
  upcomingEvents,
  stats,
  analytics,
  loading,
  nowMs,
  opsAlertCount,
  onRefresh,
}: {
  area: QuickAreaConfig;
  venueId: string;
  venueCity?: string;
  upcomingEvents: UpcomingEventModel[];
  stats: ListStats;
  analytics: ListAnalytics;
  loading: boolean;
  nowMs: number;
  opsAlertCount: number;
  onRefresh?: () => void;
}) {
  const [tab, setTab] = useState<TabKey>("activos");
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <MobileButton
        type="button"
        variant="primary"
        area="eventos"
        disabled={!venueId}
        onClick={() => setCreateOpen(true)}
        className="min-h-[52px] font-bold"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Crear evento
      </MobileButton>

      <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-black/25 p-1">
        {(
          [
            ["activos", "Activos", CalendarClock],
            ["pasados", "Pasados", History],
            ["plantillas", "Plantillas", LayoutTemplate],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold transition ${
              tab === id ? "bg-white/[0.1] text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {tab === "activos" ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-400">Eventos activos / próximos</p>
          <UpcomingEventsList
            events={upcomingEvents}
            loading={loading}
            stats={stats}
            analytics={analytics}
            nowMs={nowMs}
            onEventUpdated={onRefresh}
          />
        </div>
      ) : null}

      {tab === "pasados" ? (
        <div className="rounded-xl border border-white/[0.08] bg-zinc-950/50 p-4 text-center">
          <History className="mx-auto h-10 w-10 text-slate-600" aria-hidden />
          <p className="mt-2 text-sm text-slate-300">Historial de eventos finalizados</p>
          <Link
            href="/dashboard/eventos?tab=past"
            className="mt-4 inline-flex rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/12"
          >
            Ver eventos pasados
          </Link>
        </div>
      ) : null}

      {tab === "plantillas" ? (
        <div className="rounded-xl border border-white/[0.08] bg-zinc-950/50 p-4 text-center">
          <LayoutTemplate className="mx-auto h-10 w-10 text-slate-600" aria-hidden />
          <p className="mt-2 text-sm text-slate-300">
            Duplica bases y configuraciones para lanzar eventos recurrentes más rápido.
          </p>
          <Link
            href="/dashboard/eventos"
            className="mt-4 inline-flex rounded-xl bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/12"
          >
            Ir a eventos
          </Link>
        </div>
      ) : null}

      <PanelFooterLinks area={area} items={area.items} opsAlertCount={opsAlertCount} />

      <CreateEventForm
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        venueId={venueId}
        venueCity={venueCity}
        onEventSaved={() => onRefresh?.()}
      />
    </div>
  );
}
