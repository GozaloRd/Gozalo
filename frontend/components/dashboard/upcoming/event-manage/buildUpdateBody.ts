import type { TableLayoutSlot } from "@/components/dashboard/panels/TableLayoutEditor";

/** Evita import circular con `UpcomingEventCard`: mismo shape mínimo. */
export type EventForManage = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  status?: string;
  coverImageUrl?: string | null;
  maxCapacity?: number | null;
  description?: string | null;
  ticketTypes?: {
    id: string;
    name: string;
    price: number;
    quantityTotal?: number;
    soldCount?: number;
  }[];
  city?: string | null;
  category?: string | null;
  images?: string[] | null;
  tableLayoutImageUrl?: string | null;
  requiresCoverForTable?: boolean;
  featured?: boolean;
  minimumAge?: number | null;
  refundPolicy?: string;
};

export type TicketFormRow = {
  id?: string;
  name: string;
  price: string;
  quantityTotal: string;
  showQuantityPublic: boolean;
  active: boolean;
};

export type ManageFormState = {
  title: string;
  description: string;
  city: string;
  category: string;
  minimumAge: string;
  startAt: string;
  endAt: string;
  coverImageUrl: string;
  bannerUrl: string;
  galleryImages: string[];
  maxCapacity: string;
  tableLayoutImageUrl: string;
  mesasEnabled: boolean;
  featured: boolean;
  /** true = público */
  visibilityPublic: boolean;
  refundNote: string;
  ticketRows: TicketFormRow[];
  layoutTablesDraft: TableLayoutSlot[];
};

export function toDatetimeLocalValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formFromEvent(ev: EventForManage): ManageFormState {
  const tt = ev.ticketTypes ?? [];
  const imgs = Array.isArray(ev.images) ? ev.images.filter((u): u is string => typeof u === "string") : [];
  const cover = (ev.coverImageUrl || "").trim();
  const bannerGuess = imgs.find((u) => u && u !== cover) ?? "";

  return {
    title: ev.title ?? "",
    description: ev.description ?? "",
    city: ev.city ?? "",
    category: ev.category ?? "Reggaeton",
    minimumAge: String(ev.minimumAge ?? ""),
    startAt: toDatetimeLocalValue(ev.startAt),
    endAt: toDatetimeLocalValue(ev.endAt),
    coverImageUrl: cover,
    bannerUrl: bannerGuess,
    galleryImages: imgs.filter((u) => u !== cover && u !== bannerGuess),
    maxCapacity: ev.maxCapacity != null ? String(ev.maxCapacity) : "",
    tableLayoutImageUrl: ev.tableLayoutImageUrl ?? "",
    mesasEnabled: !!ev.requiresCoverForTable,
    featured: !!ev.featured,
    visibilityPublic: (ev.status || "") !== "paused",
    refundNote: ev.refundPolicy ?? "",
    ticketRows:
      tt.length > 0
        ? tt.map((t) => ({
            id: t.id,
            name: t.name,
            price: String(t.price ?? ""),
            quantityTotal: t.quantityTotal != null ? String(t.quantityTotal) : "",
            showQuantityPublic: true,
            active: true,
          }))
        : [{ name: "", price: "", quantityTotal: "", showQuantityPublic: true, active: true }],
    layoutTablesDraft: [],
  };
}

export function buildPutBody(
  form: ManageFormState,
  opts?: {
    /** Guardar manteniendo estado de publicación actual */
    currentStatus?: string;
    /** Forzar al guardar */
    statusOverride?: "draft" | "published" | "paused";
  }
) {
  const ticketTypes = form.ticketRows
    .filter((r) => r.active && r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      price: parseFloat(r.price) || 0,
      quantityTotal: r.quantityTotal.trim() ? parseInt(r.quantityTotal, 10) : null,
      showQuantityPublic: r.showQuantityPublic,
      description: undefined as string | undefined,
    }));

  const images: string[] = [];
  if (form.bannerUrl.trim()) images.push(form.bannerUrl.trim());
  images.push(...form.galleryImages.filter(Boolean));

  const body: Record<string, unknown> = {
    title: form.title.trim(),
    description: form.description.trim() || undefined,
    category: form.category.trim() || undefined,
    city: form.city.trim() || undefined,
    startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
    endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
    coverImageUrl: form.coverImageUrl.trim() || undefined,
    tableLayoutImageUrl: form.tableLayoutImageUrl.trim() ? form.tableLayoutImageUrl.trim() : null,
    images: images.length ? images : undefined,
    maxCapacity: form.maxCapacity.trim() ? parseInt(form.maxCapacity, 10) : undefined,
    featured: form.featured,
    includeInCollage: form.featured,
    requiresCoverForTable: form.mesasEnabled,
    ticketTypes,
  };

  if (form.minimumAge.trim()) {
    const n = parseInt(form.minimumAge, 10);
    if (!Number.isNaN(n) && n >= 0) body.minimumAge = n;
  }

  if (opts?.statusOverride) {
    body.status = opts.statusOverride;
  } else if (opts?.currentStatus) {
    const s = opts.currentStatus.toLowerCase();
    if (s === "published" || s === "draft" || s === "paused") body.status = s;
  }

  return body;
}
