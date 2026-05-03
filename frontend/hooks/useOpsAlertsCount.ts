"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOpsAlerts } from "@/lib/alertsApi";

/**
 * Conteo ligero para badge en cabecera móvil (evita duplicar UI completa de LiveOpsAlerts).
 */
export function useOpsAlertsCount(venueId: string | null | undefined) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const res = await fetchOpsAlerts(venueId);
      setCount(res.data?.length ?? 0);
    } catch {
      /* silencioso */
    }
  }, [venueId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(load, 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  return count;
}
