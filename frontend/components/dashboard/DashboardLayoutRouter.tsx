"use client";

import { usePathname } from "next/navigation";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { DashboardUIProvider } from "@/contexts/DashboardUIContext";
import { VenueOwnerDashboardRoot } from "@/components/dashboard/VenueOwnerDashboardRoot";

/**
 * /dashboard/admin y /dashboard/cliente usan layouts propios (sin DashboardProvider de local).
 *
 * Importante: no omitir `{children}` en ninguna rama — si no, el SSR de Next no monta la página
 * y puede romper hooks del runtime (`useContext` / `usePathname`).
 */
export default function DashboardLayoutRouter({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "";
  const skipVenue = path.startsWith("/dashboard/admin") || path.startsWith("/dashboard/cliente");

  if (skipVenue) {
    return <>{children}</>;
  }

  return (
    <DashboardProvider>
      <DashboardUIProvider>
        <VenueOwnerDashboardRoot>{children}</VenueOwnerDashboardRoot>
      </DashboardUIProvider>
    </DashboardProvider>
  );
}
