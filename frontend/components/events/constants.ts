import type { EventCardModel, EventWizardDraft } from "./types";

export const CATEGORY_OPTIONS = [
  "Reggaeton",
  "Electronica",
  "Hip-Hop",
  "Salsa",
  "Merengue",
  "Bachata",
  "Pop",
  "Rock",
  "Otro",
];

export const MIN_AGE_OPTIONS = ["Sin restriccion", "18+", "21+"];

export const RD_CITIES = [
  "Santo Domingo",
  "Santiago",
  "La Romana",
  "Punta Cana",
  "San Francisco de Macoris",
  "Puerto Plata",
  "La Vega",
];

const CUPID_TICKETS = [
  { id: "tt-last", name: "Last Chance", price: 1500, sold: 0, total: 100 },
  { id: "tt-presale", name: "Pre Sale", price: 500, sold: 5, total: 20 },
  { id: "tt-sale", name: "Sale", price: 1000, sold: 0, total: 50 },
];

export const MOCK_ACTIVE_EVENTS: EventCardModel[] = [
  {
    id: "e-cupid",
    title: "Cupid",
    startAt: "2026-05-20T23:30:00.000Z",
    whenLabel: "mie, 20 may, 11:30 p.m.",
    badge: "upcoming",
    coverUrl:
      "https://images.unsplash.com/photo-1571266028243-d220c9d8c3f3?auto=format&fit=crop&w=1200&q=80",
    tickets: 5,
    reservations: 1,
    revenue: 10060,
    ticketTypes: CUPID_TICKETS,
    tableZones: [
      { id: "zone-vip", name: "VIP", peoplePerTable: 6, minSpend: 12000, reserved: 1, totalTables: 8 },
      { id: "zone-lounge", name: "Lounge", peoplePerTable: 4, minSpend: 8000, reserved: 0, totalTables: 6 },
    ],
  },
  {
    id: "e-ntg",
    title: "NTG PARTY",
    startAt: "2026-05-27T23:00:00.000Z",
    whenLabel: "mie, 27 may, 11:00 p.m.",
    badge: "upcoming",
    coverUrl:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
    tickets: 0,
    reservations: 0,
    revenue: 0,
    ticketTypes: [],
    tableZones: [],
  },
];

export const MOCK_PAST_EVENTS: EventCardModel[] = [
  {
    id: "e-lost",
    title: "LOST IN TIME",
    startAt: "2026-05-03T00:00:00.000Z",
    whenLabel: "dom, 03 may, 12:00 a.m.",
    badge: "finished",
    coverUrl:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    tickets: 3,
    reservations: 0,
    revenue: 5997,
    ticketTypes: [{ id: "tt-general", name: "General", price: 1999, sold: 3, total: 80 }],
    tableZones: [],
  },
  {
    id: "e-last-dance",
    title: "The Last dance",
    startAt: "2026-04-28T22:00:00.000Z",
    whenLabel: "mar, 28 abr, 10:00 p.m.",
    badge: "finished",
    coverUrl:
      "https://images.unsplash.com/photo-1574391884720-bbc0f4bc4f03?auto=format&fit=crop&w=1200&q=80",
    tickets: 1,
    reservations: 0,
    revenue: 500,
    ticketTypes: [{ id: "tt-only", name: "Only", price: 500, sold: 1, total: 50 }],
    tableZones: [],
  },
];

export const DEFAULT_WIZARD_DRAFT: EventWizardDraft = {
  title: "",
  shortDescription: "",
  fullDescription: "",
  startAt: "",
  endAt: "",
  category: "Reggaeton",
  minimumAge: "18+",
  venueName: "Vagabunda Club",
  address: "",
  city: "Santo Domingo",
  reference: "",
  flyerUrl: "",
  ticketTypes: [],
  hasTables: false,
  tableZones: [],
  publishMode: "now",
  publishAt: "",
};
