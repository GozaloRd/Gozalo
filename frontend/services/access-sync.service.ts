import { scanAccess } from "@/lib/dashboardApi";
import { listPendingScans, removePendingScan } from "@/services/offline-tickets.service";

/** Reintenta escaneos guardados en cola (IndexedDB) cuando vuelve la red. */
export async function flushPendingScans(venueId: string | null): Promise<{ flushed: number; failed: number }> {
  const rows = await listPendingScans();
  let flushed = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      await scanAccess(r.payload, r.eventId, venueId);
      await removePendingScan(r.id);
      flushed += 1;
    } catch {
      failed += 1;
    }
  }
  return { flushed, failed };
}
