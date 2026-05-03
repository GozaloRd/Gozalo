import { useEffect, useState } from "react";

export type CountdownParts = { days: number; hours: number; minutes: number };

function compute(iso: string): CountdownParts {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return { days, hours, minutes };
}

/** Countdown hasta `iso`; se actualiza al montar y cada 60s como mínimo. */
export function useCountdown(iso: string, enabled = true): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() => compute(iso));

  useEffect(() => {
    if (!enabled) return;
    setParts(compute(iso));
    const t = window.setInterval(() => setParts(compute(iso)), 60_000);
    return () => window.clearInterval(t);
  }, [iso, enabled]);

  return parts;
}
