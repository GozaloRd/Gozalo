"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { DashboardUIProvider } from "@/contexts/DashboardUIContext";
import { VenueOwnerDashboardRoot } from "@/components/dashboard/VenueOwnerDashboardRoot";

/**
 * /dashboard/admin y /dashboard/cliente usan layouts propios (sin DashboardProvider de local).
 */
export default function DashboardLayoutRouter({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const skipVenue =
    path?.startsWith("/dashboard/admin") || path?.startsWith("/dashboard/cliente");

  if (!mounted) {
    return <div className="min-h-screen bg-[#0A0A0F]" aria-hidden />;
  }

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
