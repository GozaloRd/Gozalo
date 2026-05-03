"use client";

import { AREA_SUBMENU_PANEL_ID, QUICK_AREAS, type QuickAreaId } from "@/components/dashboard/quickActions.config";

function hapticLight() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
  }
}

export function QuickActionBubbles({
  activeAreaId,
  onToggleArea,
}: {
  activeAreaId: QuickAreaId | null;
  onToggleArea: (id: QuickAreaId) => void;
}) {
  return (
    <div
      className="flex w-full flex-wrap justify-center gap-x-3 gap-y-4 px-0 py-1"
      role="toolbar"
      aria-label="Accesos rápidos del panel"
    >
      {QUICK_AREAS.map((cfg) => {
        const expanded = activeAreaId === cfg.id;
        const Icon = cfg.bubbleIcon;
        return (
          <button
            key={cfg.id}
            type="button"
            id={`quick-bubble-${cfg.id}`}
            aria-label={cfg.label}
            aria-expanded={expanded}
            aria-controls={AREA_SUBMENU_PANEL_ID}
            aria-pressed={expanded}
            onClick={() => {
              if (!expanded) hapticLight();
              onToggleArea(cfg.id);
            }}
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 transition-all duration-[250ms] ease-in-out motion-safe:transition-all active:scale-95 ${
              expanded
                ? `h-11 min-h-[44px] px-3 ${cfg.bubbleExpandedClass} gap-1.5`
                : `h-11 w-11 min-h-[44px] min-w-[44px] ${cfg.bubbleIdleClass}`
            } `}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 stroke-[1.55]" aria-hidden />
            {expanded ? (
              <span className="max-w-[9rem] truncate text-xs font-bold tracking-tight">{cfg.label}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
