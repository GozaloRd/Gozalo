"use client";

import type { ReactNode } from "react";

type Props = {
  id?: string;
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
};

export function MobileFormField({ id, label, error, children, className = "" }: Props) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400"
      >
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}
