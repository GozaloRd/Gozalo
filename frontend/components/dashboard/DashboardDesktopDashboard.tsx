"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LayoutDashboard, MoreVertical } from "lucide-react";
import { DashboardAreaPanel } from "@/components/dashboard/DashboardAreaPanel";
import { SalesPanelDesktop } from "@/components/sales/SalesPanelDesktop";
import { StatsPanelDesktop } from "@/components/stats/StatsPanelDesktop";
import { EventsPanelDesktop } from "@/components/events/EventsPanelDesktop";
import { CashPanelDesktop } from "@/components/cash/CashPanelDesktop";
import { DashboardControlHome } from "@/components/dashboard/DashboardControlHome";
import { DashboardLocalLogo } from "@/components/dashboard/DashboardLocalLogo";
import { DesktopNotificationsDrawer } from "@/components/dashboard/desktop/DesktopNotificationsDrawer";
import { MobileNotificationButton } from "@/components/dashboard/MobileNotificationButton";
import { StarryBackground } from "@/components/dashboard/StarryBackground";
import type { AreaSubmenuPanelProps } from "@/components/dashboard/dashboardAreaTypes";
import { getQuickAreaById, QUICK_AREAS, type QuickAreaId } from "@/components/dashboard/quickActions.config";
import { MOBILE_AREA_BORDER_L } from "@/components/dashboard/mobile/shared/mobileAreaTokens";
import { useDashboard } from "@/contexts/DashboardContext";
import { useOpsAlertsCount } from "@/hooks/useOpsAlertsCount";
import { logoutClient } from "@/lib/authApi";

type DesktopSection = "inicio" | QuickAreaId;

type Props = AreaSubmenuPanelProps;

const SIDEBAR_COLLAPSED = 64;
const SIDEBAR_EXPANDED = 220;

function shortVenueLabel(name: string, max = 22): string {
  const t = name.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(3, max - 1)).trim()}…`;
}

export function DashboardDesktopDashboard({
  upcomingEvents,
  allVenueEvents = [],
  stats,
  analytics,
  loading,
  nowMs,
  venueId,
  venueCity,
  venueName,
  venueAddress,
  onRefreshData,
}: Props) {
  const router = useRouter();
  const { venue, isAdminViewer, clearVenueSelection } = useDashboard();
  const opsAlertCount = useOpsAlertsCount(venueId);
  const [section, setSection] = useState<DesktopSection>("inicio");
  const [venueMenuOpen, setVenueMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const venueMenuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const sidebarW = sidebarExpanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (venueMenuRef.current && !venueMenuRef.current.contains(t)) setVenueMenuOpen(false);
      if (moreRef.current && !moreRef.current.contains(t)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const navItems: { id: DesktopSection; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "inicio", label: "Inicio", icon: LayoutDashboard },
    ...QUICK_AREAS.map((a) => ({ id: a.id as DesktopSection, label: a.label, icon: a.bubbleIcon })),
  ];

  const activeCfg = section === "inicio" ? null : getQuickAreaById(section);
  const workspaceTitle = section === "inicio" ? "Panel de control" : activeCfg?.label ?? "Área";
  const breadcrumb =
    section === "inicio"
      ? "Workspace · Inicio"
      : `Workspace · ${activeCfg?.label ?? "Área"}`;

  async function onLogout() {
    await logoutClient();
    router.push("/");
    router.refresh();
  }

  const userInitial =
    venue?.owner?.fullName?.trim()?.charAt(0)?.toUpperCase() ??
    venue?.owner?.email?.trim()?.charAt(0)?.toUpperCase() ??
    "U";

  function sidebarActiveClasses(id: DesktopSection, active: boolean) {
    const borderActive: Record<DesktopSection, string> = {
      inicio: "border-l-[rgba(255,255,255,0.6)]",
      eventos: "border-l-[#f97316]",
      ventas: "border-l-[#10b981]",
      acceso: "border-l-[#3b82f6]",
      caja: "border-l-[#a855f7]",
      estadisticas: "border-l-[#ec4899]",
      config: "border-l-[#d97706]",
    };
    const iconActive: Record<DesktopSection, string> = {
      inicio: "text-[rgba(255,255,255,0.6)]",
      eventos: "text-[#f97316]",
      ventas: "text-[#10b981]",
      acceso: "text-[#3b82f6]",
      caja: "text-[#a855f7]",
      estadisticas: "text-[#ec4899]",
      config: "text-[#d97706]",
    };
    if (!active) {
      return {
        wrap:
          "border-l-[3px] border-solid border-l-transparent bg-transparent text-zinc-500 transition-colors duration-150 hover:bg-white/[0.03] hover:text-zinc-300",
        icon: "text-zinc-500",
        label: "text-zinc-500",
      };
    }
    return {
      wrap: `border-l-[3px] border-solid ${borderActive[id]} bg-white/5 text-white`,
      icon: iconActive[id],
      label: "text-white",
    };
  }

  return (
    <div className="dashboard-desktop-root relative min-h-screen bg-transparent text-[#F9FAFB]">
      <StarryBackground variant="desktop" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#0A0A0F]/80 px-4 backdrop-blur-md">
          <Link
            href="/"
            className="hidden shrink-0 items-center gap-1.5 font-bold tracking-tight text-white sm:flex"
            aria-label="Gozalo — inicio"
          >
            <span aria-hidden className="text-lg">
              ✦
            </span>
            <span>GOZALO</span>
          </Link>

          <div className="sm:hidden">
            <DashboardLocalLogo />
          </div>

          <div className="relative min-w-0 flex-1" ref={venueMenuRef}>
            <button
              type="button"
              onClick={() => setVenueMenuOpen((o) => !o)}
              className="flex max-w-full items-center gap-1 rounded-xl border border-white/[0.08] bg-zinc-900/60 px-3 py-2 text-left transition hover:bg-zinc-800/80"
              aria-expanded={venueMenuOpen}
              aria-haspopup="menu"
            >
              <span className="truncate text-sm font-medium text-white" title={venueName}>
                {venueName ? shortVenueLabel(venueName) : "Local"}
              </span>
              <span aria-hidden className="shrink-0 text-zinc-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>
            {venueMenuOpen ? (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-white/[0.08] bg-[#15151F] py-1 shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/[0.06]"
                  onClick={() => {
                    setSection("inicio");
                    setVenueMenuOpen(false);
                  }}
                >
                  Ir a Inicio (panel)
                </button>
                <Link
                  href="/"
                  role="menuitem"
                  className="block px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
                  onClick={() => setVenueMenuOpen(false)}
                >
                  Inicio web público
                </Link>
                {isAdminViewer ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.06]"
                    onClick={() => {
                      void clearVenueSelection();
                      setVenueMenuOpen(false);
                    }}
                  >
                    Cambiar local
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <MobileNotificationButton
              alertCount={opsAlertCount}
              onClick={() => setNotificationsOpen(true)}
            />
            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Más opciones"
                aria-expanded={moreOpen}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {moreOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-xl border border-white/[0.08] bg-[#15151F] py-1 shadow-xl">
                  {isAdminViewer ? (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/[0.06]"
                      onClick={() => {
                        void clearVenueSelection();
                        setMoreOpen(false);
                      }}
                    >
                      Cambiar local
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm text-rose-300 hover:bg-white/[0.06]"
                    onClick={() => {
                      setMoreOpen(false);
                      onLogout();
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-zinc-800 text-sm font-bold text-white"
              title={venue?.owner?.fullName ?? venue?.owner?.email ?? "Usuario"}
              aria-hidden
            >
              {userInitial}
            </div>
          </div>
        </header>

        <DesktopNotificationsDrawer
          open={notificationsOpen}
          onClose={() => setNotificationsOpen(false)}
          venueId={venueId}
        />

        <div className="flex min-h-0 flex-1">
          <aside
            className="flex shrink-0 flex-col border-r border-white/[0.08] bg-[#0D0D14]/95 py-3 backdrop-blur-sm transition-[width] duration-300 ease-out"
            style={{ width: sidebarW }}
            aria-label="Áreas del panel"
          >
            <div className="flex flex-1 flex-col gap-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                const sa = sidebarActiveClasses(item.id, active);
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    onClick={() => setSection(item.id)}
                    className={`flex h-12 items-center gap-3 rounded-xl border border-transparent transition-colors duration-150 ${
                      sidebarExpanded ? "w-full px-3" : "w-12 justify-center px-0"
                    } ${sa.wrap}`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${sa.icon}`} aria-hidden />
                    {sidebarExpanded ? (
                      <span className={`truncate text-left text-sm font-medium ${sa.label}`}>{item.label}</span>
                    ) : (
                      <span className="sr-only">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-auto border-t border-white/[0.06] px-2 pt-2">
              <button
                type="button"
                onClick={() => setSidebarExpanded((e) => !e)}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
                aria-expanded={sidebarExpanded}
                aria-label={sidebarExpanded ? "Contraer menú lateral" : "Expandir menú lateral"}
              >
                {sidebarExpanded ? (
                  <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0" aria-hidden />
                )}
                {sidebarExpanded ? <span className="text-xs font-medium">Contraer</span> : null}
              </button>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0A0A0F]/40 transition-[padding] duration-300">
            {section !== "ventas" && section !== "estadisticas" && section !== "eventos" && section !== "caja" ? (
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 md:px-7">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                    {breadcrumb}
                  </p>
                  {section !== "inicio" ? (
                    <h2 className="truncate text-lg font-semibold text-white">{workspaceTitle}</h2>
                  ) : null}
                </div>
                {section !== "inicio" && activeCfg ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="hidden sm:inline">Área activa</span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-medium text-white ${activeCfg.bubbleIdleClass}`}
                    >
                      {activeCfg.label}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div
              className={`min-h-0 flex-1 overflow-y-auto px-5 md:px-7 ${
                section === "inicio" ? "py-6 pb-4 md:py-6 md:pb-4" : "py-6 md:py-7"
              }`}
            >
              {section === "inicio" ? (
                <DashboardControlHome
                  nowMs={nowMs}
                  venueId={venueId}
                  venueName={venueName}
                  upcomingEvents={upcomingEvents}
                  stats={stats}
                  analytics={analytics}
                  loading={loading}
                  onOpenArea={(id) => setSection(id)}
                />
              ) : activeCfg?.id === "eventos" ? (
                <div className="mx-auto w-full max-w-[1600px]">
                  <EventsPanelDesktop allVenueEvents={allVenueEvents} />
                </div>
              ) : activeCfg?.id === "ventas" ? (
                <div className="mx-auto w-full max-w-[1600px]">
                  <SalesPanelDesktop />
                </div>
              ) : activeCfg?.id === "caja" ? (
                <div className="mx-auto w-full max-w-[1600px]">
                  <CashPanelDesktop venueId={venueId} />
                </div>
              ) : activeCfg?.id === "estadisticas" ? (
                <div className="mx-auto w-full max-w-[1600px]">
                  <StatsPanelDesktop
                    allVenueEvents={allVenueEvents}
                    statsEventsLoading={loading}
                    venueId={venueId}
                    stats={stats}
                    analytics={analytics}
                  />
                </div>
              ) : activeCfg ? (
                <div
                  className={`mx-auto max-w-[1400px] rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg backdrop-blur-sm ${MOBILE_AREA_BORDER_L[activeCfg.id as QuickAreaId]}`}
                >
                  <DashboardAreaPanel
                    area={activeCfg}
                    opsAlertCount={opsAlertCount}
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
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
