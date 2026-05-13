import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Calendar,
  CalendarRange,
  GitCompare,
  LayoutDashboard,
  PieChart,
  QrCode,
  Settings,
  ShoppingBag,
  Sparkles,
  Wallet,
} from "lucide-react";

/** `aria-controls` en burbujas y `id` del panel desplegable. */
export const AREA_SUBMENU_PANEL_ID = "quick-area-submenu-panel";

export type QuickAreaId =
  | "eventos"
  | "ventas"
  | "acceso"
  | "caja"
  | "estadisticas"
  | "config";

export type SubmenuItemConfig = {
  id: string;
  label: string;
  description?: string;
  href: string;
  Icon: LucideIcon;
  /** Badge si hay alertas operativas (p. ej. fila de caja). */
  badgeKey?: "ops";
};

export type QuickAreaConfig = {
  id: QuickAreaId;
  label: string;
  bubbleIcon: LucideIcon;
  bubbleIdleClass: string;
  bubbleExpandedClass: string;
  /** Borde izquierdo del panel desplegable */
  panelBorderClass: string;
  /** Color del hit / iconos en ítems */
  accentTextClass: string;
  /** Hover suave en tarjetas del submenú / footer */
  itemHoverClass: string;
  /**
   * Enlaces secundarios (también en pie del panel móvil).
   * El contenido principal vive en `*Panel.tsx`.
   */
  items: SubmenuItemConfig[];
};

export const QUICK_AREAS: QuickAreaConfig[] = [
  {
    id: "eventos",
    label: "Eventos",
    bubbleIcon: Calendar,
    bubbleIdleClass:
      "border-amber-500/55 bg-amber-500/15 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    bubbleExpandedClass:
      "border-amber-400/90 bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/50",
    panelBorderClass: "border-l-4 border-amber-500",
    accentTextClass: "text-amber-400",
    itemHoverClass: "hover:bg-amber-500/10",
    /** Accesos web desactivados: gestión de eventos desde rutas / menú, no pie del panel móvil. */
    items: [],
  },
  {
    id: "ventas",
    label: "Ventas",
    bubbleIcon: ShoppingBag,
    bubbleIdleClass:
      "border-emerald-500/55 bg-emerald-500/15 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    bubbleExpandedClass:
      "border-emerald-400/90 bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400/45",
    panelBorderClass: "border-l-4 border-emerald-500",
    accentTextClass: "text-emerald-400",
    itemHoverClass: "hover:bg-emerald-500/10",
    /** Accesos web desactivados: el contenido vive en el panel y en el menú ⋮ del header. */
    items: [],
  },
  {
    id: "acceso",
    label: "Control de acceso",
    bubbleIcon: QrCode,
    bubbleIdleClass:
      "border-blue-500/55 bg-blue-500/15 text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    bubbleExpandedClass:
      "border-blue-400/90 bg-blue-500 text-white shadow-[0_8px_24px_rgba(59,130,246,0.4)] ring-2 ring-blue-400/45",
    panelBorderClass: "border-l-4 border-blue-500",
    accentTextClass: "text-blue-400",
    itemHoverClass: "hover:bg-blue-500/10",
    /** Accesos web desactivados: el panel concentra QR + mesas + pagos; histórico/mesas vía menú ⋮. */
    items: [],
  },
  {
    id: "caja",
    label: "Caja",
    bubbleIcon: Wallet,
    bubbleIdleClass:
      "border-purple-500/55 bg-purple-500/15 text-purple-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    bubbleExpandedClass:
      "border-fuchsia-400/80 bg-purple-500 text-white shadow-[0_8px_24px_rgba(168,85,247,0.4)] ring-2 ring-purple-400/45",
    panelBorderClass: "border-l-4 border-purple-500",
    accentTextClass: "text-purple-400",
    itemHoverClass: "hover:bg-purple-500/10",
    /** Accesos web desactivados: el panel ya enlaza a la vista completa de caja. */
    items: [],
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    bubbleIcon: BarChart3,
    bubbleIdleClass:
      "border-pink-500/55 bg-pink-500/15 text-pink-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    bubbleExpandedClass:
      "border-pink-400/90 bg-pink-500 text-white shadow-[0_8px_24px_rgba(236,72,153,0.4)] ring-2 ring-pink-400/45",
    panelBorderClass: "border-l-4 border-pink-500",
    accentTextClass: "text-pink-400",
    itemHoverClass: "hover:bg-pink-500/10",
    items: [
      { id: "s_res", label: "Resumen del local", href: "/dashboard/estadisticas", Icon: LayoutDashboard },
      { id: "s_kpi", label: "KPIs y tendencias", href: "/dashboard/estadisticas", Icon: Sparkles },
      { id: "s_ev", label: "Estadísticas por evento", href: "/dashboard/estadisticas", Icon: PieChart },
      { id: "s_cmp", label: "Comparativa entre eventos", href: "/dashboard/estadisticas", Icon: GitCompare },
      { id: "s_time", label: "Tendencias por tiempo", href: "/dashboard/estadisticas", Icon: CalendarRange },
    ],
  },
  {
    id: "config",
    label: "Ajustes",
    bubbleIcon: Settings,
    bubbleIdleClass:
      "border-orange-600/55 bg-orange-600/18 text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    bubbleExpandedClass:
      "border-orange-500/90 bg-orange-600 text-white shadow-[0_8px_24px_rgba(234,88,12,0.4)] ring-2 ring-orange-500/45",
    panelBorderClass: "border-l-4 border-orange-600",
    accentTextClass: "text-orange-400",
    itemHoverClass: "hover:bg-orange-600/10",
    /** Accesos web en pie desactivados: enlaces solo en el cuerpo de `SettingsPanel`. */
    items: [],
  },
];

export function getQuickAreaById(id: string | null | undefined): QuickAreaConfig | null {
  if (!id) return null;
  return QUICK_AREAS.find((a) => a.id === id) ?? null;
}
