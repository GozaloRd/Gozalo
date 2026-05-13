/**
 * Espejo de reglas de `backend/src/utils/ticketQueue.js` para badges y checkout (UI).
 */

export type TicketSaleMode = "parallel" | "sequential";

export type TicketUiStatus = "activo" | "en_cola" | "agotado" | "inactivo";

export type TicketTypeInput = {
  id: string;
  name: string;
  code?: string | null;
  price?: number | string | null;
  quantityTotal?: number | null;
  soldCount?: number;
  active?: boolean;
  sortOrder?: number;
};

function soldOf(tt: TicketTypeInput): number {
  return Number(tt.soldCount) || 0;
}

function capOf(tt: TicketTypeInput): number | null {
  const c = tt.quantityTotal;
  if (c == null || c <= 0) return null;
  return c;
}

export function isSoldOut(tt: TicketTypeInput): boolean {
  const cap = capOf(tt);
  if (cap == null) return false;
  return soldOf(tt) >= cap;
}

export function orderedTypes(types: TicketTypeInput[]): TicketTypeInput[] {
  return [...types].sort((a, b) => {
    const sa = Number(a.sortOrder ?? 0);
    const sb = Number(b.sortOrder ?? 0);
    if (sa !== sb) return sa - sb;
    return String(a.name).localeCompare(String(b.name), "es");
  });
}

/** Primer tipo activo y no agotado en orden (modo secuencial). */
export function currentSequentialSellableType(types: TicketTypeInput[]): TicketTypeInput | null {
  const list = orderedTypes(types).filter((t) => t.active !== false);
  for (const tt of list) {
    if (!isSoldOut(tt)) return tt;
  }
  return null;
}

export function uiStatusForType(
  mode: TicketSaleMode | string | undefined,
  tt: TicketTypeInput,
  allTypes: TicketTypeInput[]
): TicketUiStatus {
  if (tt.active === false) return "inactivo";
  if (isSoldOut(tt)) return "agotado";
  const m = String(mode || "parallel").toLowerCase() === "sequential" ? "sequential" : "parallel";
  if (m === "parallel") return "activo";
  const current = currentSequentialSellableType(allTypes);
  if (current && String(current.id) === String(tt.id)) return "activo";
  return "en_cola";
}

export function previousTypeInQueue(
  tt: TicketTypeInput,
  allTypes: TicketTypeInput[]
): TicketTypeInput | null {
  const list = orderedTypes(allTypes).filter((t) => t.active !== false);
  const i = list.findIndex((t) => String(t.id) === String(tt.id));
  if (i <= 0) return null;
  return list[i - 1] ?? null;
}

export function canPurchaseType(
  mode: TicketSaleMode | string | undefined,
  tt: TicketTypeInput,
  allTypes: TicketTypeInput[]
): boolean {
  const st = uiStatusForType(mode, tt, allTypes);
  return st === "activo";
}
