"use client";

import { useState } from "react";
import { BarChart3, GitCompare, TrendingUp } from "lucide-react";
import type { MobileAnalytics, MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import { StatAccordionItem } from "@/components/dashboard/panels/stats-sections/StatAccordionItem";
import { StatsOverview } from "@/components/dashboard/panels/stats-sections/StatsOverview";
import { StatsByEventSection } from "@/components/dashboard/panels/stats-sections/StatsByEventSection";
import { EventComparisonSection } from "@/components/dashboard/panels/stats-sections/EventComparisonSection";
import { TrendsSection } from "@/components/dashboard/panels/stats-sections/TrendsSection";

export function StatsPanel({
  stats,
  analytics,
}: {
  stats: MobileStats | null;
  analytics: MobileAnalytics | null;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  return (
    <div className="space-y-3">
      <StatsOverview stats={stats} analytics={analytics} />

      <StatAccordionItem
        id="por-evento"
        title="Estadísticas por evento"
        Icon={BarChart3}
        openId={openId}
        onToggle={toggle}
      >
        <StatsByEventSection />
      </StatAccordionItem>

      <StatAccordionItem
        id="comparativa"
        title="Comparativa entre eventos"
        Icon={GitCompare}
        openId={openId}
        onToggle={toggle}
      >
        <EventComparisonSection />
      </StatAccordionItem>

      <StatAccordionItem
        id="tendencias"
        title="Tendencias por mes / día"
        Icon={TrendingUp}
        openId={openId}
        onToggle={toggle}
      >
        <TrendsSection />
      </StatAccordionItem>
    </div>
  );
}
