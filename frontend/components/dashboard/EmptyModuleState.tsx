"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard";

export function EmptyModuleState({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  children?: ReactNode;
}) {
  return (
    <GlassCard className="p-10 text-center">
      <p className="font-display text-xl font-semibold text-gozalo-cream">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
      {children}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="btn-primary mt-6 inline-flex min-w-[200px] justify-center py-3 text-sm"
        >
          {actionLabel}
        </Link>
      )}
    </GlassCard>
  );
}
