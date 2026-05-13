"use client";

export function CashAmountInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-white/40">{label}</label>
      <input
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        placeholder="0"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-white placeholder:text-white/25 outline-none transition-colors [appearance:textfield] focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}
