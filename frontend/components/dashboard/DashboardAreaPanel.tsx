"use client";

import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import type { AreaSubmenuPanelProps } from "@/components/dashboard/dashboardAreaTypes";
import { AccessControlPanel } from "@/components/dashboard/panels/AccessControlPanel";
import { CashRegisterPanel } from "@/components/dashboard/panels/CashRegisterPanel";
import { EventsPanel } from "@/components/dashboard/panels/EventsPanel";
import { SalesPanel } from "@/components/dashboard/panels/SalesPanel";
import { SettingsPanel } from "@/components/dashboard/panels/SettingsPanel";
import { StatsPanel } from "@/components/dashboard/panels/StatsPanel";

export type DashboardAreaPanelProps = AreaSubmenuPanelProps & {
  area: QuickAreaConfig;
  opsAlertCount: number;
  onRegisterVentasCloseGuard?: (fn: (() => boolean) | null) => void;
  onRegisterAccessCloseGuard?: (fn: (() => boolean) | null) => void;
  onRegisterStatsCloseGuard?: (fn: (() => boolean) | null) => void;
  onRegisterCajaCloseGuard?: (fn: (() => boolean) | null) => void;
};

/**
 * Contenido de un área (Eventos, Ventas, …) reutilizable en móvil (`AreaSubmenu`) y escritorio.
 */
export function DashboardAreaPanel({
  area,
  opsAlertCount,
  onRegisterVentasCloseGuard,
  onRegisterAccessCloseGuard,
  onRegisterStatsCloseGuard,
  onRegisterCajaCloseGuard,
  upcomingEvents,
  stats,
  analytics,
  loading,
  nowMs,
  venueId,
  venueCity,
  venueName,
  venueAddress,
  onRefreshData,
}: DashboardAreaPanelProps) {
  switch (area.id) {
    case "eventos":
      return (
        <EventsPanel
          area={area}
          venueId={venueId}
          venueCity={venueCity}
          venueName={venueName}
          venueAddress={venueAddress ?? undefined}
          upcomingEvents={upcomingEvents}
          stats={stats}
          loading={loading}
          nowMs={nowMs}
          opsAlertCount={opsAlertCount}
          onRefresh={onRefreshData}
        />
      );
    case "ventas":
      return (
        <SalesPanel
          area={area}
          stats={stats}
          analytics={analytics}
          opsAlertCount={opsAlertCount}
          venueId={venueId}
          nowMs={nowMs}
          onRegisterVentasCloseGuard={onRegisterVentasCloseGuard}
        />
      );
    case "acceso":
      return (
        <AccessControlPanel
          area={area}
          stats={stats}
          opsAlertCount={opsAlertCount}
          venueId={venueId}
          upcomingEvents={upcomingEvents}
          onRefreshData={onRefreshData}
          onRegisterAccessCloseGuard={onRegisterAccessCloseGuard}
        />
      );
    case "caja":
      return <CashRegisterPanel onRegisterCajaCloseGuard={onRegisterCajaCloseGuard} />;
    case "estadisticas":
      return (
        <StatsPanel
          stats={stats}
          analytics={analytics}
          venueId={venueId}
          nowMs={nowMs}
          onRegisterStatsCloseGuard={onRegisterStatsCloseGuard}
        />
      );
    case "config":
      return <SettingsPanel />;
    default:
      return null;
  }
}
