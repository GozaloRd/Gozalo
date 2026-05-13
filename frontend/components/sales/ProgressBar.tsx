"use client";

import { motion, useReducedMotion } from "framer-motion";

export function ProgressBar({
  pct,
  className = "",
}: {
  /** 0–100 */
  pct: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const w = Math.max(0, Math.min(100, pct));

  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/10 ${className}`}>
      <motion.div
        className="h-full rounded-full bg-emerald-400"
        initial={reduce ? { width: `${w}%` } : { width: "0%" }}
        animate={{ width: `${w}%` }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.7, ease: [0, 0, 0.2, 1] }
        }
      />
    </div>
  );
}
