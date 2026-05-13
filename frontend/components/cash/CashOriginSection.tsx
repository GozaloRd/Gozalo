"use client";

import { motion } from "framer-motion";
import { CashAmountInput } from "./CashAmountInput";
import type { CashOriginAmounts } from "./types";
import { formatRD, originSubtotal } from "./utils";

export function CashOriginSection({
  title,
  description,
  amounts,
  onChange,
}: {
  title: string;
  description: string;
  amounts: CashOriginAmounts;
  onChange: (next: CashOriginAmounts) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-5">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <p className="mt-0.5 mb-5 text-sm text-white/40">{description}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <CashAmountInput label="EFECTIVO" value={amounts.cash} onChange={(cash) => onChange({ ...amounts, cash })} />
        <CashAmountInput label="TARJETA" value={amounts.card} onChange={(card) => onChange({ ...amounts, card })} />
        <CashAmountInput
          label="TRANSFERENCIA"
          value={amounts.transfer}
          onChange={(transfer) => onChange({ ...amounts, transfer })}
        />
      </div>

      <p className="mt-4 text-sm text-white/50">
        Subtotal canal:{" "}
        <motion.span className="font-bold text-fuchsia-300" key={originSubtotal(amounts)}>
          {formatRD(originSubtotal(amounts))}
        </motion.span>
      </p>
    </section>
  );
}
