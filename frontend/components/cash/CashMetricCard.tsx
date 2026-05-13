"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

export function CashMetricCard({
  label,
  value,
  sub,
  Icon,
  highlight,
  isLoading,
}: {
  label: string;
  value: string;
  sub: string;
  Icon: LucideIcon;
  highlight?: boolean;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="h-2 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-6 w-32 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  return (
    <motion.article
      className={`rounded-xl border p-5 transition-colors ${
        highlight
          ? "border-purple-500/20 bg-purple-950/40"
          : "border-white/10 bg-white/5 hover:border-purple-500/30 hover:bg-white/[0.07]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-widest text-white/60">{label}</p>
          <p className={`mt-3 text-xl font-bold ${highlight ? "text-purple-100" : "text-white"}`}>{value}</p>
          <p className="mt-1 text-sm text-white/50">{sub}</p>
        </div>
        <Icon className={highlight ? "h-5 w-5 text-fuchsia-400" : "h-5 w-5 text-purple-400"} />
      </div>
    </motion.article>
  );
}
