"use client";

type Props = {
  current: number;
  total: number;
  className?: string;
};

export function WizardProgressBar({ current, total, className = "" }: Props) {
  const pct = Math.round(((current - 1) / Math.max(1, total - 1)) * 100);
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-zinc-800 ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-600 transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
