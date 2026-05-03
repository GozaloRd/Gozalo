import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  Calculator,
  Calendar,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DoorOpen,
  FileBarChart,
  GitCompare,
  History,
  LayoutDashboard,
  LayoutTemplate,
  ListOrdered,
  Package,
  PieChart,
  Plug,
  Plus,
  QrCode,
  Receipt,
  Settings,
  ShoppingBag,
  Sliders,
  Sparkles,
  Store,
  Ticket,
  TrendingUp,
  Trophy,
  Undo2,
  UserCog,
  Users,
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
    items: [
      { id: "e_crear", label: "Crear evento", description: "Asistente completo", href: "/dashboard/eventos", Icon: Plus },
      { id: "e_activos", label: "Eventos activos", description: "En curso y publicados", href: "/dashboard/eventos?tab=published", Icon: Calendar },
      { id: "e_pasados", label: "Eventos pasados", description: "Historial", href: "/dashboard/eventos?tab=past", Icon: History },
      { id: "e_plantillas", label: "Plantillas de evento", description: "Bases reutilizables", href: "/dashboard/eventos", Icon: LayoutTemplate },
      { id: "e_tickets", label: "Tipos de ticket", href: "/dashboard/tickets", Icon: Ticket },
      { id: "e_mesas", label: "Mapa de mesas", href: "/dashboard/mesas", Icon: Store },
    ],
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
    items: [
      { id: "v_resumen", label: "Resumen por período", description: "Hoy / semana / mes", href: "/dashboard/reportes", Icon: TrendingUp },
      { id: "v_evento", label: "Ventas por evento", href: "/dashboard/reportes", Icon: CalendarRange },
      { id: "v_tipo", label: "Por tipo (entradas, mesas, consumo)", href: "/dashboard/reportes", Icon: Package },
      { id: "v_reservas", label: "Reservas activas", href: "/dashboard/reservas", Icon: BookOpen },
      { id: "v_ordenes", label: "Órdenes recientes", href: "/dashboard/reportes", Icon: Receipt },
      { id: "v_reemb", label: "Reembolsos y cancelaciones", href: "/dashboard/reportes", Icon: Undo2 },
      { id: "v_top", label: "Productos y tickets top", href: "/dashboard/reportes", Icon: Trophy },
      { id: "v_export", label: "Exportar PDF / Excel", href: "/dashboard/reportes", Icon: FileBarChart },
    ],
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
    items: [
      { id: "a_scan", label: "Validador QR", href: "/dashboard/acceso", Icon: QrCode },
      { id: "a_count", label: "QR validados (histórico)", href: "/dashboard/acceso", Icon: CheckCircle2 },
      { id: "a_aforo", label: "Aforo en vivo", href: "/dashboard/acceso", Icon: Users },
      { id: "a_guest", label: "Lista de invitados", href: "/dashboard/guestlist", Icon: ClipboardList },
      { id: "a_manual", label: "Validación manual", href: "/dashboard/acceso", Icon: ListOrdered },
      { id: "a_mesas", label: "Acceso por mesas", href: "/dashboard/acceso", Icon: Store },
      { id: "a_hist", label: "Histórico de validaciones", href: "/dashboard/acceso", Icon: History },
      { id: "a_puntos", label: "Puntos de acceso", href: "/dashboard/configuracion", Icon: DoorOpen },
    ],
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
    items: [
      { id: "c_res", label: "Caja centralizada", href: "/dashboard/caja", Icon: Banknote },
      { id: "c_report", label: "Nuevo reporte por origen", href: "/dashboard/caja", Icon: Receipt },
      { id: "c_hist", label: "Historial de reportes", href: "/dashboard/caja", Icon: Archive },
      { id: "c_cierre", label: "Cierre de turno / arqueo", href: "/dashboard/caja", Icon: Calculator },
      { id: "c_mov", label: "Movimientos del turno", href: "/dashboard/caja", Icon: ArrowLeftRight },
      { id: "c_alert", label: "Alertas de caja", href: "/dashboard/caja", Icon: AlertTriangle, badgeKey: "ops" },
    ],
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
    items: [
      { id: "cfg_local", label: "Datos del local", href: "/dashboard/configuracion", Icon: Building2 },
      { id: "cfg_bank", label: "Datos fiscales y bancarios", href: "/dashboard/configuracion", Icon: CreditCard },
      { id: "cfg_pay", label: "Métodos de pago", href: "/dashboard/configuracion", Icon: CreditCard },
      { id: "cfg_users", label: "Usuarios y permisos", href: "/dashboard/configuracion", Icon: UserCog },
      { id: "cfg_hours", label: "Horarios", href: "/dashboard/configuracion", Icon: CalendarRange },
      { id: "cfg_social", label: "Redes y contacto", href: "/dashboard/configuracion", Icon: Sparkles },
      { id: "cfg_int", label: "Integraciones", href: "/dashboard/configuracion", Icon: Plug },
      { id: "cfg_notif", label: "Notificaciones", href: "/dashboard/configuracion", Icon: Bell },
      { id: "cfg_prefs", label: "Preferencias generales", href: "/dashboard/configuracion", Icon: Sliders },
    ],
  },
];

export function getQuickAreaById(id: string | null | undefined): QuickAreaConfig | null {
  if (!id) return null;
  return QUICK_AREAS.find((a) => a.id === id) ?? null;
}
