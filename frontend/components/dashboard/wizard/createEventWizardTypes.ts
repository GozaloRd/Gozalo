import { z } from "zod";

export const EVENT_WIZARD_GENRES = [
  "Reggaeton",
  "Electrónica",
  "Rock",
  "Latin",
  "Hip-Hop",
  "Pop",
  "Bachata",
  "Salsa",
  "Otro",
] as const;

export const MIN_AGE_OPTIONS = [
  { value: "all", label: "Todas las edades" },
  { value: "16", label: "16+" },
  { value: "18", label: "18+" },
  { value: "21", label: "21+" },
] as const;

export type TicketSaleStartMode =
  | "immediate"
  | "after_previous"
  | "hours_before_event"
  | "scheduled";

export type TicketSaleEndMode = "until_sold_out" | "until_sold_count" | "until_date";

export type TableZoneColor = "purple" | "green" | "red" | "yellow" | "blue" | "slate";

export type WizardTicketDraft = {
  localKey: string;
  name: string;
  price: string;
  quantityTotal: string;
  description: string;
  showQuantityPublic: boolean;
  showBeforeActive: boolean;
  saleStartMode: TicketSaleStartMode;
  saleStartHoursBefore: string;
  saleStartAt: string;
  saleEndMode: TicketSaleEndMode;
  saleEndSoldCount: string;
  saleEndAt: string;
  /** UI: 🟢 active 🟡 queued 🔴 last chance */
  queueUi: "active" | "queued" | "last_chance";
};

export type WizardTableZone = {
  localKey: string;
  name: string;
  color: TableZoneColor;
  tableCount: number;
  seatsPerTable: number;
  minSpend: string;
  requiresDeposit: boolean;
  depositPercent: number;
  description: string;
  inviteOnly: boolean;
  manualOnly: boolean;
};

export type WizardVisibility = "public" | "private" | "hidden";

const ticketDraft = z.object({
  localKey: z.string(),
  name: z.string(),
  price: z.string(),
  quantityTotal: z.string(),
  description: z.string(),
  showQuantityPublic: z.boolean(),
  showBeforeActive: z.boolean(),
  saleStartMode: z.enum(["immediate", "after_previous", "hours_before_event", "scheduled"]),
  saleStartHoursBefore: z.string(),
  saleStartAt: z.string(),
  saleEndMode: z.enum(["until_sold_out", "until_sold_count", "until_date"]),
  saleEndSoldCount: z.string(),
  saleEndAt: z.string(),
  queueUi: z.enum(["active", "queued", "last_chance"]),
});

const tableZone = z.object({
  localKey: z.string(),
  name: z.string().min(1),
  color: z.enum(["purple", "green", "red", "yellow", "blue", "slate"]),
  tableCount: z.number().int().min(1),
  seatsPerTable: z.number().int().min(1),
  minSpend: z.string(),
  requiresDeposit: z.boolean(),
  depositPercent: z.number().min(0).max(100),
  description: z.string(),
  inviteOnly: z.boolean(),
  manualOnly: z.boolean(),
});

export const createEventWizardSchema = z
  .object({
    title: z.string().min(3, "Mínimo 3 caracteres"),
    shortDescription: z.string().min(1, "Obligatorio").max(150),
    fullDescription: z.string(),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    category: z.string().min(1),
    minAge: z.enum(["all", "16", "18", "21"]),
    useVenueAddress: z.boolean(),
    address: z.string(),
    city: z.string().min(1),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    locationNotes: z.string(),
    principalImageUrl: z.string(),
    bannerImageUrl: z.string(),
    maxCapacity: z.string(),
    ticketAutoQueue: z.boolean(),
    tickets: z.array(ticketDraft),
    tablesEnabled: z.boolean(),
    tableZones: z.array(tableZone),
    visibility: z.enum(["public", "private", "hidden"]),
    refundPolicy: z.enum(["none", "24h", "48h", "custom"]),
    refundCustomUntil: z.string(),
    terms: z.string(),
    notify24h: z.boolean(),
    notify1h: z.boolean(),
    notifyEmailConfirm: z.boolean(),
    notifySmsConfirm: z.boolean(),
    sharePublicLink: z.boolean(),
    shareButton: z.boolean(),
    includeInCollage: z.boolean(),
    featured: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.startAt && data.endAt && new Date(data.endAt) <= new Date(data.startAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fecha de fin debe ser posterior al inicio",
        path: ["endAt"],
      });
    }
    if (!data.useVenueAddress && !data.address?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Indica la dirección", path: ["address"] });
    }
  });

export type CreateEventWizardFormValues = z.infer<typeof createEventWizardSchema>;

export function newLocalKey() {
  return `k_${Math.random().toString(36).slice(2, 11)}`;
}

export function defaultTicketRow(order: number): WizardTicketDraft {
  const queueUi = order === 0 ? "active" : order === 1 ? "queued" : "last_chance";
  return {
    localKey: newLocalKey(),
    name: "",
    price: "",
    quantityTotal: "",
    description: "",
    showQuantityPublic: true,
    showBeforeActive: false,
    saleStartMode: order === 0 ? "immediate" : "after_previous",
    saleStartHoursBefore: "48",
    saleStartAt: "",
    saleEndMode: "until_sold_out",
    saleEndSoldCount: "",
    saleEndAt: "",
    queueUi,
  };
}

export function defaultTableZone(): WizardTableZone {
  return {
    localKey: newLocalKey(),
    name: "",
    color: "purple",
    tableCount: 4,
    seatsPerTable: 8,
    minSpend: "",
    requiresDeposit: true,
    depositPercent: 50,
    description: "",
    inviteOnly: false,
    manualOnly: false,
  };
}

export function getDefaultWizardValues(
  venueCity: string,
  venueAddress: string
): CreateEventWizardFormValues {
  return {
    title: "",
    shortDescription: "",
    fullDescription: "",
    startAt: "",
    endAt: "",
    category: "Reggaeton",
    minAge: "18",
    useVenueAddress: true,
    address: venueAddress || "",
    city: venueCity || "Santiago",
    lat: 18.4861,
    lng: -69.9312,
    locationNotes: "",
    principalImageUrl: "",
    bannerImageUrl: "",
    maxCapacity: "",
    ticketAutoQueue: true,
    tickets: [defaultTicketRow(0)],
    tablesEnabled: false,
    tableZones: [],
    visibility: "hidden",
    refundPolicy: "none",
    refundCustomUntil: "",
    terms: "",
    notify24h: true,
    notify1h: true,
    notifyEmailConfirm: true,
    notifySmsConfirm: false,
    sharePublicLink: true,
    shareButton: true,
    includeInCollage: true,
    featured: false,
  };
}
