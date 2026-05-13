import { useEffect } from "react";

/**
 * Hasta que exista WebSocket en la API, refrescos periódicos simulan “tiempo real”
 * entre dispositivos (otros clientes verán datos al siguiente poll).
 */
export function useAccessPanelPolling(
  onTick: () => void,
  enabled: boolean,
  intervalMs = 5000
) {
  useEffect(() => {
    if (!enabled) return;
    onTick();
    const id = window.setInterval(onTick, intervalMs);
    return () => window.clearInterval(id);
  }, [onTick, enabled, intervalMs]);
}
