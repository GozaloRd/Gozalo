"use client";

/**
 * Estado vacío consistente: qué pasa + qué hacer (panel Estadísticas móvil).
 */
export function StatsEmptyState({
  title,
  reason,
  action,
  className = "",
}: {
  title: string;
  reason: string;
  action: string;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-5 text-center ${className}`}
    >
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      <p className="max-w-sm text-xs leading-relaxed text-zinc-500">{reason}</p>
      <p className="text-xs font-medium leading-snug text-pink-300/95">{action}</p>
    </div>
  );
}
