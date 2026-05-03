"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { QuickAreaConfig, SubmenuItemConfig } from "@/components/dashboard/quickActions.config";
import { useIsMobile } from "@/hooks/useMediaQuery";

export function PanelFooterLinks({
  area,
  items,
  opsAlertCount,
}: {
  area: QuickAreaConfig;
  items: SubmenuItemConfig[];
  opsAlertCount: number;
}) {
  const isMobile = useIsMobile();

  if (!items.length) return null;
  return (
    <div className="mt-4 border-t border-white/[0.07] pt-3">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Accesos web
        {isMobile ? (
          <span className="sr-only"> (se abren en una pestaña nueva para no salir del panel móvil)</span>
        ) : null}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.Icon;
          const showBadge = item.badgeKey === "ops" && opsAlertCount > 0;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                target={isMobile ? "_blank" : undefined}
                rel={isMobile ? "noopener noreferrer" : undefined}
                className={`flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm font-medium text-white/90 transition active:scale-[0.99] ${area.itemHoverClass}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${area.accentTextClass}`} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {showBadge ? (
                  <span className="rounded-full bg-[#EF4444]/90 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {opsAlertCount > 9 ? "9+" : opsAlertCount}
                  </span>
                ) : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
