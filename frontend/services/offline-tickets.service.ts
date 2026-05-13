import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "gozalo-access-offline";
const DB_VERSION = 1;

export type PendingScanRow = {
  id: string;
  payload: string;
  eventId: string;
  venueId: string;
  createdAt: number;
  attempts: number;
};

let dbPromise: Promise<IDBPDatabase<{ pendingScans: { key: string; value: PendingScanRow } }>> | null =
  null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<{ pendingScans: { key: string; value: PendingScanRow } }>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("pendingScans")) {
          database.createObjectStore("pendingScans", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueuePendingScan(
  row: Omit<PendingScanRow, "attempts"> & { attempts?: number }
): Promise<void> {
  const d = await db();
  const full: PendingScanRow = { ...row, attempts: row.attempts ?? 0 };
  await d.put("pendingScans", full);
}

export async function listPendingScans(): Promise<PendingScanRow[]> {
  const d = await db();
  return d.getAll("pendingScans");
}

export async function removePendingScan(id: string): Promise<void> {
  const d = await db();
  await d.delete("pendingScans", id);
}

export async function pendingScanCount(): Promise<number> {
  const rows = await listPendingScans();
  return rows.length;
}
