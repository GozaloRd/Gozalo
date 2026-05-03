import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/[0.08] bg-[#111118]/50 px-8 py-14 text-center">
      <p className="text-sm font-medium text-[#9CA3AF]">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-xs text-[#6B7280]">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
