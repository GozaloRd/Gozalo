import type { ReactNode } from "react";

type Trend = { value: number; label?: string };

export function MetricCard({
  label,
  value,
  unit,
  trend,
  icon,
}: {
  label: string;
  value: string | number;
  unit?: string;
  trend?: Trend | null;
  icon?: ReactNode;
}) {
  const up = trend != null && trend.value >= 0;
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#111118] p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#6B7280]">
          {label}
        </p>
        {icon ? (
          <span className="text-[#6B7280] opacity-70" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-[#F9FAFB]">
        {value}
        {unit ? <span className="ml-1 text-lg font-normal text-[#6B7280]">{unit}</span> : null}
      </p>
      {trend != null && (
        <p className="mt-2 text-xs tabular-nums text-[#6B7280]">
          <span className={up ? "text-[#10B981]" : "text-[#EF4444]"}>
            {up ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
          </span>
          {trend.label ? ` ${trend.label}` : ""}
        </p>
      )}
    </div>
  );
}
