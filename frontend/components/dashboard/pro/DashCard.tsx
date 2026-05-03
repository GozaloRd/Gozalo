import type { ReactNode } from "react";

export function DashCard({
  children,
  className = "",
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-white/[0.08] bg-[#111118] transition-colors duration-150 ease-out ${padding ? "p-6" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
