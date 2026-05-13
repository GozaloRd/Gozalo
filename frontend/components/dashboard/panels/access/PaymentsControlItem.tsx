"use client";

import { Wallet } from "lucide-react";
import { MobilePanelRow } from "@/components/dashboard/mobile/shared/MobilePanelRow";

export function PaymentsControlItem({
  hint,
  onOpen,
  disabled,
}: {
  hint: string;
  onOpen: () => void;
  disabled?: boolean;
}) {
  return (
    <MobilePanelRow
      Icon={Wallet}
      label="Control de pagos"
      hint={hint}
      tone="acceso"
      surfaceClassName="bg-zinc-900/80 backdrop-blur-sm"
      onRowClick={disabled ? undefined : onOpen}
    />
  );
}
