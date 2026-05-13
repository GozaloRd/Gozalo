export type PublicTicket = {
  id: string;
  name: string;
  description?: string;
  price: number;
  available: number;
  highDemand?: boolean;
  includesFees?: boolean;
};

export type PublicTable = {
  id: string;
  /** Zona para agrupar en la ficha pública (ej. VIP, Terraza). */
  zone: string;
  /** Etiqueta corta de la mesa (ej. A1). */
  label: string;
  name: string;
  description?: string;
  minPrice: number;
  colorDots?: string[];
  status: "available" | "occupied";
};

export type PublicEvent = {
  id: string;
  name: string;
  description?: string;
  date: string;
  startTime: string;
  endTime?: string;
  city: string;
  country: string;
  address: string;
  venueName: string;
  venueSlug?: string;
  imageUrl?: string;
  /** Plano o foto del salón (mesas), si el local la subió */
  tableLayoutImageUrl?: string;
  ageRestriction?: string;
  tags?: string[];
  tickets: PublicTicket[];
  tables: PublicTable[];
};
