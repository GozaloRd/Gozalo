import type { CashOriginAmounts, CashReport, CreateCashReportInput } from "./types";

export function formatRD(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  return `RD$ ${Math.round(n).toLocaleString("es-DO")}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function originSubtotal(amounts: CashOriginAmounts): number {
  return Number(amounts.cash || 0) + Number(amounts.card || 0) + Number(amounts.transfer || 0);
}

export function calculateReportTotals(input: CreateCashReportInput): {
  totalsByPaymentMethod: CashOriginAmounts;
  total: number;
} {
  const totalsByPaymentMethod = {
    cash: Number(input.entries.cash || 0) + Number(input.tables.cash || 0) + Number(input.bar.cash || 0),
    card: Number(input.entries.card || 0) + Number(input.tables.card || 0) + Number(input.bar.card || 0),
    transfer:
      Number(input.entries.transfer || 0) +
      Number(input.tables.transfer || 0) +
      Number(input.bar.transfer || 0),
  };
  return {
    totalsByPaymentMethod,
    total: originSubtotal(totalsByPaymentMethod),
  };
}

export function buildCashMetrics(reports: CashReport[]): {
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  grandTotal: number;
  reportsCount: number;
} {
  const cashTotal = reports.reduce((s, r) => s + Number(r.totalsByPaymentMethod.cash || 0), 0);
  const cardTotal = reports.reduce((s, r) => s + Number(r.totalsByPaymentMethod.card || 0), 0);
  const transferTotal = reports.reduce((s, r) => s + Number(r.totalsByPaymentMethod.transfer || 0), 0);
  return {
    cashTotal,
    cardTotal,
    transferTotal,
    grandTotal: cashTotal + cardTotal + transferTotal,
    reportsCount: reports.length,
  };
}

export function normalizeAmountSet(input: unknown): CashOriginAmounts {
  const row = input as Partial<CashOriginAmounts> | null | undefined;
  return {
    cash: Number(row?.cash || 0),
    card: Number(row?.card || 0),
    transfer: Number(row?.transfer || 0),
  };
}

export function normalizeCashReport(raw: unknown): CashReport {
  const r = raw as {
    id?: string;
    createdAt?: string;
    eventId?: string;
    eventName?: string;
    event?: { id?: string; title?: string } | null;
    metadata?: {
      breakdown?: {
        entradas?: CashOriginAmounts;
        mesas?: CashOriginAmounts;
        consumo?: CashOriginAmounts;
      };
    } | null;
    cashTotal?: number | string;
    cardTotal?: number | string;
    transferTotal?: number | string;
    grandTotal?: number | string;
    notes?: string;
    note?: string;
  };
  const entries = normalizeAmountSet(r.metadata?.breakdown?.entradas);
  const tables = normalizeAmountSet(r.metadata?.breakdown?.mesas);
  const bar = normalizeAmountSet(r.metadata?.breakdown?.consumo);
  const totalsByPaymentMethod = {
    cash: Number(r.cashTotal || 0),
    card: Number(r.cardTotal || 0),
    transfer: Number(r.transferTotal || 0),
  };
  return {
    id: String(r.id || ""),
    createdAt: String(r.createdAt || ""),
    eventId: r.eventId || r.event?.id || undefined,
    eventName: r.eventName || r.event?.title || undefined,
    entries,
    tables,
    bar,
    totalsByPaymentMethod,
    total: Number(r.grandTotal || 0),
    note: r.note || r.notes || undefined,
  };
}
