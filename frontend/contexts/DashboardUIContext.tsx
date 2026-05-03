"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DateRangePreset = "7d" | "30d" | "90d" | "1y";

type Ctx = {
  datePreset: DateRangePreset;
  setDatePreset: (p: DateRangePreset) => void;
};

const DashboardUIContext = createContext<Ctx | null>(null);

export function DashboardUIProvider({ children }: { children: ReactNode }) {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("30d");
  const value = useMemo(() => ({ datePreset, setDatePreset }), [datePreset]);
  return (
    <DashboardUIContext.Provider value={value}>{children}</DashboardUIContext.Provider>
  );
}

export function useDashboardUI() {
  const ctx = useContext(DashboardUIContext);
  if (!ctx) throw new Error("useDashboardUI dentro de DashboardUIProvider");
  return ctx;
}
