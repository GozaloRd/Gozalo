"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { AREA_SUBMENU_PANEL_ID, getQuickAreaById } from "@/components/dashboard/quickActions.config";
import { DashboardAreaPanel } from "@/components/dashboard/DashboardAreaPanel";
import type { AreaSubmenuPanelProps } from "@/components/dashboard/dashboardAreaTypes";
import { SalesMenuDropdown } from "@/components/dashboard/panels/SalesMenuDropdown";
import type { QuickAreaId } from "@/components/dashboard/quickActions.config";
import { MOBILE_AREA_BORDER_L } from "@/components/dashboard/mobile/shared/mobileAreaTokens";

export type { AreaSubmenuPanelProps };

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
  venueName,
  venueAddress,
  onRefreshData,
}: {
  activeAreaId: string | null;
  onClose: () => void;
  opsAlertCount: number;
} & AreaSubmenuPanelProps) {
  const ventasCloseGuardRef = useRef<(() => boolean) | null>(null);
  const accessCloseGuardRef = useRef<(() => boolean) | null>(null);
  const statsCloseGuardRef = useRef<(() => boolean) | null>(null);
  const cajaCloseGuardRef = useRef<(() => boolean) | null>(null);
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
            <div className="flex shrink-0 items-center gap-0.5">
              {cfg.id === "ventas" ? (
                <SalesMenuDropdown onRefresh={onRefreshData} />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (cfg.id === "ventas") {
                    const guard = ventasCloseGuardRef.current;
                    if (guard?.()) return;
                  }
                  if (cfg.id === "acceso") {
                    const guard = accessCloseGuardRef.current;
                    if (guard?.()) return;
                  }
                  if (cfg.id === "estadisticas") {
                    const guard = statsCloseGuardRef.current;
                    if (guard?.()) return;
                  }
                  if (cfg.id === "caja") {
                    const guard = cajaCloseGuardRef.current;
                    if (guard?.()) return;
                  }
                  onClose();
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2979FF]/50"
                aria-label="Cerrar panel de acciones"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <DashboardAreaPanel
              area={cfg}
              opsAlertCount={opsAlertCount}
              onRegisterVentasCloseGuard={(fn) => {
                ventasCloseGuardRef.current = fn;
              }}
              onRegisterAccessCloseGuard={(fn) => {
                accessCloseGuardRef.current = fn;
              }}
              onRegisterStatsCloseGuard={(fn) => {
                statsCloseGuardRef.current = fn;
              }}
              onRegisterCajaCloseGuard={(fn) => {
                cajaCloseGuardRef.current = fn;
              }}
              upcomingEvents={upcomingEvents}
              stats={stats}
              analytics={analytics}
              loading={loading}
              nowMs={nowMs}
              venueId={venueId}
              venueCity={venueCity}
              venueName={venueName}
              venueAddress={venueAddress}
              onRefreshData={onRefreshData}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
