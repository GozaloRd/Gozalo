"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

export function CashActionCard({
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/5 p-5 text-left transition-colors hover:border-purple-500/35 hover:bg-white/[0.08]"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-purple-400" />
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="text-sm text-white/50">{sub}</p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
    </motion.button>
  );
}
