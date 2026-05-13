"use client";

import { Armchair } from "lucide-react";
import { MobilePanelRow } from "@/components/dashboard/mobile/shared/MobilePanelRow";

export function TablesStatusItem({
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
      Icon={Armchair}
      label="Estado de mesas"
      hint={hint}
      tone="acceso"
      surfaceClassName="bg-zinc-900/80 backdrop-blur-sm"
      onRowClick={disabled ? undefined : onOpen}
    />
  );
}
