const MAP: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  confirmed: "success",
  checked_in: "info",
  pending: "warning",
  cancelled: "danger",
  completed: "muted",
  no_show: "danger",
};

const COL: Record<string, string> = {
  success: "bg-[#10B981]",
  warning: "bg-[#9B7FCA]",
  danger: "bg-[#EF4444]",
  info: "bg-[#3B82F6]",
  muted: "bg-[#6B7280]",
};

export function StatusDot({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const tone = MAP[status] ?? "muted";
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${COL[tone]}`}
        aria-hidden
      />
      <span className="text-xs text-[#9CA3AF]">{label}</span>
    </span>
  );
}
