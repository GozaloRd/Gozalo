export type CashView = "dashboard" | "newReport" | "history";

export type CashOriginAmounts = {
  cash: number;
  card: number;
  transfer: number;
};

export type CashReport = {
  id: string;
  createdAt: string;
  eventId?: string;
  eventName?: string;
  entries: CashOriginAmounts;
  tables: CashOriginAmounts;
  bar: CashOriginAmounts;
  totalsByPaymentMethod: CashOriginAmounts;
  total: number;
  note?: string;
};

export type CreateCashReportInput = {
  eventId?: string;
  eventName?: string;
  entries: CashOriginAmounts;
  tables: CashOriginAmounts;
  bar: CashOriginAmounts;
  note?: string;
};

export type CashMetrics = {
  cashTotal: number;
  cardTotal: number;
  transferTotal: number;
  grandTotal: number;
  reportsCount: number;
};

export type WorkspaceEvent = {
  id: string;
  name: string;
  date?: string;
};
