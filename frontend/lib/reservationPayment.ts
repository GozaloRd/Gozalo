export type PaymentInfo = {
  pendingAtVenue: number;
  paidBeforeEvent: number;
  total: number;
  settled: boolean;
};

type NotesRow = {
  montoRD?: number;
  /** JSON de pago; puede ser null desde el API. */
  notes?: string | null;
};

/** Lee pendingAtVenue desde notes JSON (dashboard / flujo de reserva). */
export function paymentInfo(row: NotesRow): PaymentInfo {
  let parsed: { payment?: { pendingAtVenue?: number } } = {};
  try {
    parsed = JSON.parse(row.notes ?? "{}");
  } catch {
    parsed = {};
  }
  const total = Number(row.montoRD ?? 0);
  const pendingRaw = Number(parsed.payment?.pendingAtVenue ?? 0);
  const pendingAtVenue = Number.isFinite(pendingRaw) ? Math.max(0, pendingRaw) : 0;
  const paidBeforeEvent = Math.max(0, total - pendingAtVenue);
  const settled = pendingAtVenue <= 0;
  return { pendingAtVenue, paidBeforeEvent, total, settled };
}
