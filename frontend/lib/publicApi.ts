export type PublicEventVenue = {
  id: string;
  name: string;
  city: string;
  logo?: string | null;
  coverImageUrl?: string | null;
};

export type PublicEventListItem = {
  id: string;
  slug: string;
  title: string;
  category: string;
  city: string;
  startAt: string;
  endAt: string;
  coverImageUrl?: string | null;
  /** Galería promocional (URLs); si falta, el cliente usa solo coverImageUrl */
  images?: string[] | null;
  /** Fotos subidas por el local tras el evento (recap / recuerdos) */
  collagePhotos?: string[] | null;
  /** Si el local permitió publicar recuerdos en /collage y ficha pública */
  includeInCollage?: boolean;
  /** Autorización en panel Collage; sin esto no se publica en /collage */
  collageAuthorized?: boolean;
  featured?: boolean;
  destacado?: boolean;
  publicado?: boolean;
  venue: PublicEventVenue | null;
  priceFrom?: number | null;
  minTicketPrice?: number | null;
  requiresCoverForTable?: boolean;
};

export type PublicEventsResponse = {
  data: PublicEventListItem[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type PublicEventDetail = PublicEventListItem & {
  /** Venta en paralelo o en cola secuencial por `sortOrder` de tipos. */
  ticketSaleMode?: "parallel" | "sequential" | string;
  description?: string;
  /** Plano o foto del salón (mesas reservables), si el local la subió */
  tableLayoutImageUrl?: string | null;
  venue: (PublicEventVenue & { address?: string }) | null;
  tables?: Array<{
    id: string;
    zone: string;
    label: string;
    capacity: number;
    minPrice?: number | string | null;
    /** 1–100 adelanto al reservar; 100 = pago completo */
    initialPaymentPercent?: number | null;
    isAvailable?: boolean;
    estado?: string;
    posX?: number;
    posY?: number;
  }>;
  ticketTypes?: Array<{
    id?: string;
    name: string;
    price: number | string;
    quantityTotal?: number | null;
    soldCount?: number;
    sortOrder?: number;
    /** Si false, no se muestra cupo al público (ficha/checkout). */
    showQuantityPublic?: boolean;
    active?: boolean;
    description?: string | null;
  }>;
};

function apiBase() {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
}

const PUBLIC_REVALIDATE_SECONDS = 45;
const PUBLIC_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_PUBLIC_API_TIMEOUT_MS || 20000);

async function fetchJsonWithTimeout<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBLIC_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: PUBLIC_REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPublicEvents(params: {
  page?: number;
  pageSize?: number;
  featuredOnly?: boolean;
  excludeFeatured?: boolean;
  /** Si true, pide eventos pasados (para /collage) en lugar de futuros */
  past?: boolean;
  /** Filtros opcionales */
  city?: string;
  category?: string;
  from?: string;
  /** Filtra eventos de un local (p. ej. collage público con ?venueId=) */
  venueId?: string;
  /** Documentación / futuro: el backend filtra por entorno */
  status?: "published";
}): Promise<PublicEventsResponse> {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.featuredOnly) search.set("featuredOnly", "true");
  if (params.excludeFeatured) search.set("excludeFeatured", "true");
  if (params.past) search.set("past", "true");
  if (params.city) search.set("city", params.city);
  if (params.category) search.set("category", params.category);
  if (params.from) search.set("from", params.from);
  if (params.venueId) search.set("venueId", params.venueId);
  if (params.status) search.set("status", params.status);
  const qs = search.toString();
  const pageSize = params.pageSize ?? 12;
  const page = params.page ?? 1;
  const empty = (): PublicEventsResponse => ({
    data: [],
    pagination: { page, pageSize, total: 0, totalPages: 0 },
  });
  try {
    const out = await fetchJsonWithTimeout<PublicEventsResponse>(
      `${apiBase()}/api/events${qs ? `?${qs}` : ""}`
    );
    if (!out) return empty();
    return out;
  } catch {
    return empty();
  }
}

export async function fetchPublicEventById(eventId: string): Promise<PublicEventDetail | null> {
  return fetchJsonWithTimeout<PublicEventDetail>(`${apiBase()}/api/events/by-id/${eventId}`);
}

export async function fetchPublicEventBySlug(slug: string): Promise<PublicEventDetail | null> {
  return fetchJsonWithTimeout<PublicEventDetail>(`${apiBase()}/api/events/slug/${slug}`);
}
