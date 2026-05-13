import type { VenueTableRow } from "@/lib/dashboardApi";
import {
  defaultTableZone,
  defaultTicketRow,
  getDefaultWizardValues,
  newLocalKey,
  type CreateEventWizardFormValues,
  type TableZoneColor,
  type TicketSaleEndMode,
  type TicketSaleStartMode,
  type WizardTableZone,
  type WizardTicketDraft,
  type WizardVisibility,
} from "./createEventWizardTypes";

export type WizardMetaStored = {
  version: 1;
  shortLabel?: string;
  fullDescription?: string;
  minAge?: "all" | "16" | "18" | "21";
  useVenueAddress?: boolean;
  addressLine?: string;
  lat?: number | null;
  lng?: number | null;
  locationNotes?: string;
  bannerImageUrl?: string;
  visibility?: WizardVisibility;
  refundPolicy?: "none" | "24h" | "48h" | "custom";
  refundCustomUntil?: string;
  terms?: string;
  notify24h?: boolean;
  notify1h?: boolean;
  notifyEmailConfirm?: boolean;
  notifySmsConfirm?: boolean;
  sharePublicLink?: boolean;
  shareButton?: boolean;
  ticketExtras?: Partial<WizardTicketDraft>[];
  tableZones?: Omit<WizardTableZone, "localKey">[];
};

function coerceMeta(raw: unknown): WizardMetaStored | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as WizardMetaStored;
  if (o.version !== 1) return null;
  return o;
}

export function tablesToZones(rows: VenueTableRow[]): WizardTableZone[] {
  const byZone = new Map<string, VenueTableRow[]>();
  for (const t of rows) {
    const z = (t.zone || "General").trim() || "General";
    if (!byZone.has(z)) byZone.set(z, []);
    byZone.get(z)!.push(t);
  }
  const colors: TableZoneColor[] = ["purple", "green", "red", "yellow", "blue", "slate"];
  let ci = 0;
  return Array.from(byZone.entries()).map(([zoneName, list]) => {
    const first = list[0];
    const color = colors[ci++ % colors.length];
    return {
      localKey: newLocalKey(),
      name: zoneName,
      color,
      tableCount: Math.max(1, list.length),
      seatsPerTable: Number(first.capacity) || 4,
      minSpend: first.minPrice != null ? String(first.minPrice) : "",
      requiresDeposit: true,
      depositPercent: Math.max(
        1,
        Math.min(100, Number(first.initialPaymentPercent ?? 50))
      ),
      description: "",
      inviteOnly: false,
      manualOnly: false,
    };
  });
}

export function parseInitialToFormValues(opts: {
  venueCity: string;
  venueAddress: string;
  event: Record<string, unknown> | null;
  ticketTypes: Record<string, unknown>[] | undefined;
  tables: VenueTableRow[] | undefined;
}): CreateEventWizardFormValues {
  const base = getDefaultWizardValues(opts.venueCity, opts.venueAddress);
  const ev = opts.event;
  if (!ev) return base;

  const meta = coerceMeta(ev.wizardMeta);

  const ticketsFromApi: WizardTicketDraft[] =
    opts.ticketTypes?.length && Array.isArray(opts.ticketTypes)
      ? opts.ticketTypes.map((tt, idx) => {
          const extra = meta?.ticketExtras?.[idx];
          const row = defaultTicketRow(idx);
          return {
            ...row,
            ...extra,
            localKey: newLocalKey(),
            name: String(tt.name ?? ""),
            price: tt.price != null ? String(tt.price) : "",
            quantityTotal:
              tt.quantityTotal != null && tt.quantityTotal !== ""
                ? String(tt.quantityTotal)
                : "",
            description: tt.description != null ? String(tt.description) : "",
            showQuantityPublic: tt.showQuantityPublic !== false,
          };
        })
      : base.tickets;

  const principal =
    typeof ev.coverImageUrl === "string" && ev.coverImageUrl.trim()
      ? ev.coverImageUrl.trim()
      : "";
  const imgs = Array.isArray(ev.images) ? ev.images.filter((u) => typeof u === "string") : [];
  const banner =
    (typeof meta?.bannerImageUrl === "string" && meta.bannerImageUrl.trim()) ||
    (imgs[0] && typeof imgs[0] === "string" ? imgs[0] : "");

  const shortDesc =
    typeof ev.description === "string"
      ? ev.description.trim().slice(0, 150)
      : base.shortDescription;

  let tableZones: WizardTableZone[] =
    meta?.tableZones?.map((z) => ({
      ...defaultTableZone(),
      ...z,
      localKey: newLocalKey(),
    })) ?? [];
  if (!tableZones.length && opts.tables?.length) {
    tableZones = tablesToZones(opts.tables);
  }

  const startAt = isoToDatetimeLocal(pickIso(ev.startAt));
  const endAt = isoToDatetimeLocal(pickIso(ev.endAt));

  return {
    ...base,
    title: typeof ev.title === "string" ? ev.title : "",
    shortDescription: shortDesc,
    fullDescription: meta?.fullDescription ?? "",
    startAt: startAt || base.startAt,
    endAt: endAt || base.endAt,
    category: typeof ev.category === "string" ? ev.category : base.category,
    minAge: meta?.minAge ?? base.minAge,
    useVenueAddress: meta?.useVenueAddress ?? true,
    address: meta?.addressLine ?? base.address,
    city: typeof ev.city === "string" ? ev.city : base.city,
    lat: meta?.lat ?? base.lat,
    lng: meta?.lng ?? base.lng,
    locationNotes: meta?.locationNotes ?? "",
    principalImageUrl: principal,
    bannerImageUrl: banner,
    maxCapacity:
      ev.maxCapacity != null && ev.maxCapacity !== ""
        ? String(ev.maxCapacity)
        : "",
    ticketAutoQueue:
      String(ev.ticketSaleMode ?? "").toLowerCase() === "sequential",
    tickets: ticketsFromApi.length ? ticketsFromApi : base.tickets,
    tablesEnabled: Boolean(opts.tables?.length || tableZones.length),
    tableZones,
    visibility: meta?.visibility ?? base.visibility,
    refundPolicy: meta?.refundPolicy ?? base.refundPolicy,
    refundCustomUntil: meta?.refundCustomUntil ?? "",
    terms: meta?.terms ?? "",
    notify24h: meta?.notify24h ?? base.notify24h,
    notify1h: meta?.notify1h ?? base.notify1h,
    notifyEmailConfirm: meta?.notifyEmailConfirm ?? base.notifyEmailConfirm,
    notifySmsConfirm: meta?.notifySmsConfirm ?? base.notifySmsConfirm,
    sharePublicLink: meta?.sharePublicLink ?? base.sharePublicLink,
    shareButton: meta?.shareButton ?? base.shareButton,
    includeInCollage:
      ev.includeInCollage === false ? false : base.includeInCollage,
    featured: Boolean(ev.featured ?? ev.destacado),
  };
}

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pickIso(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return typeof v === "object" && v !== null && "toISOString" in v && typeof (v as { toISOString: () => string }).toISOString === "function"
    ? (v as Date).toISOString()
    : String(v);
}

export function buildWizardMeta(values: CreateEventWizardFormValues): WizardMetaStored {
  const ticketExtras: Partial<WizardTicketDraft>[] = values.tickets.map((t) => ({
    showBeforeActive: t.showBeforeActive,
    saleStartMode: t.saleStartMode as TicketSaleStartMode,
    saleStartHoursBefore: t.saleStartHoursBefore,
    saleStartAt: t.saleStartAt,
    saleEndMode: t.saleEndMode as TicketSaleEndMode,
    saleEndSoldCount: t.saleEndSoldCount,
    saleEndAt: t.saleEndAt,
    queueUi: t.queueUi,
  }));

  const tableZones: Omit<WizardTableZone, "localKey">[] = values.tableZones.map(
    ({ localKey: _lk, ...rest }) => rest
  );

  return {
    version: 1,
    fullDescription: values.fullDescription.trim() || undefined,
    minAge: values.minAge,
    useVenueAddress: values.useVenueAddress,
    addressLine: values.address.trim() || undefined,
    lat: values.lat,
    lng: values.lng,
    locationNotes: values.locationNotes.trim() || undefined,
    bannerImageUrl: values.bannerImageUrl.trim() || undefined,
    visibility: values.visibility,
    refundPolicy: values.refundPolicy,
    refundCustomUntil: values.refundCustomUntil.trim() || undefined,
    terms: values.terms.trim() || undefined,
    notify24h: values.notify24h,
    notify1h: values.notify1h,
    notifyEmailConfirm: values.notifyEmailConfirm,
    notifySmsConfirm: values.notifySmsConfirm,
    sharePublicLink: values.sharePublicLink,
    shareButton: values.shareButton,
    ticketExtras,
    tableZones: tableZones.length ? tableZones : undefined,
  };
}

export function buildDashboardPayload(
  values: CreateEventWizardFormValues,
  opts: { status: "draft" | "published"; venueAddress?: string }
) {
  const filteredTickets = values.tickets.filter((r) => r.name.trim());
  const ticketTypes = filteredTickets.map((r, idx) => ({
    name: r.name.trim(),
    price: parseFloat(r.price),
    quantityTotal: r.quantityTotal.trim() ? parseInt(r.quantityTotal, 10) : null,
    showQuantityPublic: r.showQuantityPublic,
    description: r.description.trim() || undefined,
    sortOrder: idx,
    active: true,
  }));

  const meta = buildWizardMeta(values);

  const effectiveCity = values.city.trim();

  const effectiveAddress = values.useVenueAddress
    ? (opts.venueAddress || "").trim() || values.address.trim()
    : values.address.trim();

  const wizardMeta: WizardMetaStored = {
    ...meta,
    addressLine: effectiveAddress || meta.addressLine,
  };

  const imagesPayload = values.bannerImageUrl.trim()
    ? [values.bannerImageUrl.trim()]
    : null;

  let status: "draft" | "published" | "paused" = "draft";
  if (opts.status === "published") {
    status = values.visibility === "hidden" ? "draft" : "published";
  } else {
    status = "draft";
  }

  return {
    title: values.title.trim(),
    description: values.shortDescription.trim(),
    category: values.category,
    city: effectiveCity,
    startAt: new Date(values.startAt).toISOString(),
    endAt: new Date(values.endAt).toISOString(),
    coverImageUrl: values.principalImageUrl.trim() || undefined,
    images: imagesPayload,
    maxCapacity: values.maxCapacity.trim() ? parseInt(values.maxCapacity, 10) : undefined,
    status,
    ticketSaleMode: values.ticketAutoQueue ? "sequential" : "parallel",
    ticketTypes,
    wizardMeta,
    includeInCollage: values.includeInCollage,
    featured: opts.status === "published" && values.visibility === "public" ? values.featured : false,
  };
}
