/**
 * El campo `notes` de reservas suele ser JSON `{ customerNotes, payment }`.
 * Solo devolvemos texto legible para el cliente/local si hay nota explícita.
 */
export function customerNotesFromReservationNotesBlob(
  notes: string | null | undefined
): string | null {
  if (notes == null || typeof notes !== "string") return null;
  const t = notes.trim();
  if (!t) return null;
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as { customerNotes?: unknown };
      const cn = o?.customerNotes;
      if (typeof cn === "string") {
        const s = cn.trim();
        return s.length > 0 ? s : null;
      }
      return null;
    } catch {
      return t.length > 0 ? t : null;
    }
  }
  return t.length > 0 ? t : null;
}
