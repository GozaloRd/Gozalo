/** Tipos compartidos entre paneles móviles y `MobileDashboard` (home). */

/** Subconjunto de `fetchDashboardStats`: suficiente para paneles móviles. */
export type MobileStats = {
  occupancy: {
    activeEvent: { id: string; title: string } | null;
    currentAttendees: number;
    maxCapacity: number;
    ratio: number;
  };
  reservations?: {
    today: number;
    week: number;
    month: number;
  };
  revenue?: {
    totalRD: { today: number; week: number; month: number };
  };
};

export type MobileAnalytics = {
  summary: {
    revenue: { total: number; today?: number };
    tickets?: { today: number; total: number };
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
    revenueByEvent?: { eventId: string; eventTitle: string; total: number }[];
    entriesVsTables?: { eventId: string; eventTitle: string; tickets: number; tables: number }[];
  };
};
