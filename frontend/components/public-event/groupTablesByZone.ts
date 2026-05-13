import type { PublicTable } from "./types";

export function groupTablesByZone(tables: PublicTable[]): { zone: string; tables: PublicTable[] }[] {
  const map = new Map<string, PublicTable[]>();
  for (const t of tables) {
    const z = t.zone?.trim() || "General";
    const list = map.get(z) ?? [];
    list.push(t);
    map.set(z, list);
  }
  return Array.from(map.entries())
    .map(([zone, zoneTables]) => ({ zone, tables: zoneTables }))
    .sort((a, b) => a.zone.localeCompare(b.zone, "es"));
}
