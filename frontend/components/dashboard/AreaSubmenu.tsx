"use client";

import type { ComponentProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect } from "react";
import {
  AREA_SUBMENU_PANEL_ID,
  getQuickAreaById,
  type QuickAreaConfig,
} from "@/components/dashboard/quickActions.config";
import { AccessControlPanel } from "@/components/dashboard/panels/AccessControlPanel";
import { CashRegisterPanel } from "@/components/dashboard/panels/CashRegisterPanel";
import { EventsPanel } from "@/components/dashboard/panels/EventsPanel";
import { SalesPanel } from "@/components/dashboard/panels/SalesPanel";
import { SettingsPanel } from "@/components/dashboard/panels/SettingsPanel";
import { StatsPanel } from "@/components/dashboard/panels/StatsPanel";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";
import type { QuickAreaId } from "@/components/dashboard/quickActions.config";
import { MOBILE_AREA_BORDER_L } from "@/components/dashboard/mobile/shared/mobileAreaTokens";

const panelVariants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
};

export type AreaSubmenuPanelProps = {
  upcomingEvents: UpcomingEventModel[];
  stats: ComponentProps<typeof EventsPanel>["stats"];
  analytics: ComponentProps<typeof EventsPanel>["analytics"];
  loading: boolean;
  nowMs: number;
  venueId: string;
  venueCity?: string;
  onRefreshData?: () => void;
};

export function AreaSubmenu({
  activeAreaId,
  onClose,
  opsAlertCount,
  upcomingEvents,
  stats,
  analytics,
  loading,
  nowMs,
  venueId,
  venueCity,
  onRefreshData,
}: {
  activeAreaId: string | null;
  onClose: () => void;
  opsAlertCount: number;
} & AreaSubmenuPanelProps) {
  const cfg = getQuickAreaById(activeAreaId);
  const BubbleIcon = cfg?.bubbleIcon;

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!activeAreaId) return;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeAreaId, onKeyDown]);

  function panelBody(area: QuickAreaConfig) {
    switch (area.id) {
      case "eventos":
        return (
          <EventsPanel
            area={area}
            venueId={venueId}
            venueCity={venueCity}
            upcomingEvents={upcomingEvents}
            stats={stats}
            analytics={analytics}
            loading={loading}
            nowMs={nowMs}
            opsAlertCount={opsAlertCount}
            onRefresh={onRefreshData}
          />
        );
      case "ventas":
        return <SalesPanel area={area} stats={stats} analytics={analytics} opsAlertCount={opsAlertCount} />;
      case "acceso":
        return <AccessControlPanel area={area} stats={stats} opsAlertCount={opsAlertCount} />;
      case "caja":
        return <CashRegisterPanel area={area} opsAlertCount={opsAlertCount} />;
      case "estadisticas":
        return <StatsPanel stats={stats} analytics={analytics} />;
      case "config":
        return <SettingsPanel area={area} opsAlertCount={opsAlertCount} />;
      default:
        return null;
    }
  }

  return (
    <AnimatePresence mode="wait">
      {cfg && BubbleIcon ? (
        <motion.div
          key={cfg.id}
          id={AREA_SUBMENU_PANEL_ID}
          role="region"
          aria-label={`Acciones de ${cfg.label}`}
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/90 p-4 shadow-lg backdrop-blur-sm ${MOBILE_AREA_BORDER_L[cfg.id as QuickAreaId]}`}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full bg-current opacity-90"
                style={{
                  color:
                    cfg.id === "eventos"
                      ? "#F59E0B"
                      : cfg.id === "ventas"
                        ? "#10B981"
                        : cfg.id === "acceso"
                          ? "#3B82F6"
                          : cfg.id === "caja"
                            ? "#A855F7"
                            : cfg.id === "estadisticas"
                              ? "#EC4899"
                              : "#EA580C",
                }}
                aria-hidden
              />
              <BubbleIcon className={`h-5 w-5 shrink-0 ${cfg.accentTextClass}`} aria-hidden />
              <span className="truncate text-sm font-semibold text-white">{cfg.label}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2979FF]/50"
              aria-label="Cerrar panel de acciones"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-w-0">{panelBody(cfg)}</div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
