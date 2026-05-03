"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { fetchAuthMe, type AuthUser } from "@/lib/authApi";
import { getToken } from "@/lib/api";

export function VenueOwnerDashboardRoot({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login?redirect=dashboard");
        return;
      }
      const u = await fetchAuthMe();
      if (cancelled) return;
      if (!u) {
        router.replace("/login?redirect=dashboard");
        return;
      }
      if (u.role === "customer") {
        router.replace("/dashboard/cliente");
        return;
      }
      if (u.role === "admin") {
        router.replace("/dashboard/admin");
        return;
      }
      setUser(u);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] text-[#6B7280]">
        Cargando panel…
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
