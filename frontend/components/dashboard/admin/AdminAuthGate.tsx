"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuthMe, type AuthUser } from "@/lib/authApi";
import { getToken } from "@/lib/api";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
      if (u.role === "venue_owner" || u.role === "staff") {
        router.replace("/dashboard");
        return;
      }
      if (u.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] text-[#6B7280]">
        Cargando administración…
      </div>
    );
  }

  return <>{children}</>;
}
