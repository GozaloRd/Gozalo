"use client";

import { motion } from "framer-motion";

export function WizardProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((step / total) * 100)));

  return (
    <div className="space-y-4">
      <div className="h-0.5 w-full bg-white/10">
        <motion.div
          className="h-full bg-orange-500"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }).map((_, idx) => {
          const current = idx + 1;
          const active = current === step;
          const done = current < step;
          return (
            <span
              key={current}
              className={`rounded-full ${
                active
                  ? "h-2.5 w-2.5 bg-orange-500"
                  : done
                    ? "h-2 w-2 border border-orange-500"
                    : "h-2 w-2 bg-white/20"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
