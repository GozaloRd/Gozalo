import type { QuickAreaId } from "@/components/dashboard/quickActions.config";

/** Borde izquierdo acento (p. ej. cards / paneles). */
export const MOBILE_AREA_BORDER_L: Record<QuickAreaId, string> = {
  eventos: "border-l-2 border-amber-500",
  ventas: "border-l-2 border-emerald-500",
  acceso: "border-l-2 border-blue-500",
  caja: "border-l-2 border-purple-500",
  estadisticas: "border-l-2 border-pink-500",
  config: "border-l-2 border-orange-600",
};

/** Gradiente botón primario por área. */
export const MOBILE_AREA_PRIMARY_GRADIENT: Record<QuickAreaId, string> = {
  eventos: "from-amber-500 to-orange-600 shadow-amber-900/30",
  ventas: "from-emerald-500 to-teal-600 shadow-emerald-900/30",
  acceso: "from-blue-500 to-indigo-600 shadow-blue-900/30",
  caja: "from-purple-500 to-fuchsia-600 shadow-purple-900/30",
  estadisticas: "from-pink-500 to-rose-600 shadow-pink-900/30",
  config: "from-orange-500 to-amber-600 shadow-orange-900/30",
};

export function mobilePrimaryButtonClass(area: QuickAreaId): string {
  const g = MOBILE_AREA_PRIMARY_GRADIENT[area];
  return `bg-gradient-to-r ${g} text-white shadow-lg`;
}
