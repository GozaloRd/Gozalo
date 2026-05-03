"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { QuickAreaId } from "@/components/dashboard/quickActions.config";
import { mobilePrimaryButtonClass } from "@/components/dashboard/mobile/shared/mobileAreaTokens";

type Variant = "primary" | "secondary" | "destructive";

type Props = {
  children: ReactNode;
  variant?: Variant;
  /** Solo `variant="primary"`. */
  area?: QuickAreaId;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function MobileButton({
  children,
  variant = "secondary",
  area = "eventos",
  className = "",
  disabled,
  type = "button",
  ...rest
}: Props) {
  const base =
    "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50";

  const styles: Record<Variant, string> = {
    primary: mobilePrimaryButtonClass(area),
    secondary: "border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-800/90",
    destructive: "border border-red-500/30 bg-red-500/20 text-red-300 hover:bg-red-500/25",
  };

  return (
    <button type={type} disabled={disabled} className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}
