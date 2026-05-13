"use client";

export type EventsMainView = "dashboard" | "wizard";
export type EventsTabKey = "active" | "past" | "templates";
export type EventDetailTab = "manage" | "tickets" | "tables";

export type TicketTypeStat = {
  id: string;
  name: string;
  price: number;
  sold: number;
  total: number;
};

export type TableZoneStat = {
  id: string;
  name: string;
  peoplePerTable: number;
  minSpend: number;
  reserved: number;
  totalTables: number;
};

export type EventCardModel = {
  id: string;
  title: string;
  startAt: string;
  whenLabel: string;
  badge: "upcoming" | "finished";
  coverUrl: string;
  tickets: number;
  reservations: number;
  revenue: number;
  ticketTypes: TicketTypeStat[];
  tableZones: TableZoneStat[];
};

export type EventWizardDraft = {
  title: string;
  shortDescription: string;
  fullDescription: string;
  startAt: string;
  endAt: string;
  category: string;
  minimumAge: string;
  venueName: string;
  address: string;
  city: string;
  reference: string;
  flyerUrl: string;
  ticketTypes: TicketTypeStat[];
  hasTables: boolean;
  tableZones: TableZoneStat[];
  publishMode: "now" | "scheduled";
  publishAt: string;
};
