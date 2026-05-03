"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchAuthMe } from "@/lib/authApi";
import { getToken } from "@/lib/api";

export function ClienteAuthGate({ children }: { children: React.ReactNode }) {
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
      if (u.role === "admin") {
        router.replace("/dashboard/admin");
        return;
      }
      if (u.role === "venue_owner" || u.role === "staff") {
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
        Cargando tu panel…
      </div>
    );
  }

  return <>{children}</>;
}
