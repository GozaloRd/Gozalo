/** Tipos compartidos entre paneles móviles y `MobileDashboard` (home). */

/** Subconjunto de `fetchDashboardStats`: suficiente para paneles móviles. */
export type MobileStats = {
  occupancy: {
    activeEvent: { id: string; title: string } | null;
    currentAttendees: number;
    maxCapacity: number;
    ratio: number;
  };
  /** Publicados con fin ≥ hoy (backend). */
  activeEvents?: number;
  reservations?: {
    today: number;
    week: number;
    month: number;
    changeVsPrevious?: { todayPct: number; weekPct: number; monthPct: number };
  };
  ticketsSold?: {
    today: number;
    week: number;
    month: number;
    changeVsPrevious?: { todayPct: number; weekPct: number; monthPct: number };
  };
  revenue?: {
    totalRD: { today: number; week: number; month: number };
    changeVsPrevious?: { todayPct: number; weekPct: number; monthPct: number };
  };
};

export type MobileAnalytics = {
  summary: {
    revenue: { total: number; today?: number; allTime?: number };
    tickets?: { today: number; total: number; orders?: number };
    reservations?: { today: number; total: number };
    occupancyCurrent?: {
      currentAttendees: number;
      maxCapacity: number;
      ratio: number;
      percentage: number;
    };
  };
  charts?: {
    salesByDay?: { day: string; total: number }[];
    salesByHour?: { hour: string; total: number }[];
    revenueByEvent?: { eventId: string; eventTitle: string; total: number }[];
    entriesVsTables?: { eventId: string; eventTitle: string; tickets: number; tables: number }[];
  };
  tables?: {
    occupancyByEvent?: {
      eventId: string;
      eventTitle: string;
      capacity: number;
      attended: number;
      occupancyRate: number;
    }[];
  };
  /** Solo cuando `eventId` en la petición de analytics. */
  eventInsights?: {
    peakHourLabel?: string | null;
    topTicketType?: string | null;
    noShowPct?: number | null;
    validatedCount?: number;
  } | null;
  revenueChannels?: {
    combined?: {
      entradas?: { total: number };
      mesas?: { total: number };
      consumo?: { total: number };
    };
    grandCombinedRD?: number;
  };
};
