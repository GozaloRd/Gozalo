import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import type { UpcomingEventModel } from "@/components/dashboard/upcoming/UpcomingEventCard";

export type AreaSubmenuPanelProps = {
  upcomingEvents: UpcomingEventModel[];
  /** Todos los eventos del local (scope `all`: activos + finalizados). Para estadísticas desktop. */
  allVenueEvents?: UpcomingEventModel[];
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
  loading: boolean;
  nowMs: number;
  venueId: string;
  venueCity?: string;
  venueName?: string;
  venueAddress?: string | null;
  onRefreshData?: () => void;
};
