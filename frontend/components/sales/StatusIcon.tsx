"use client";

import { CheckCircle, Clock, RefreshCw } from "lucide-react";
import type { OrderStatus } from "./types";

export function StatusIcon({ status, className }: { status: OrderStatus; className?: string }) {
  const cn = className ?? "";
  switch (status) {
    case "completed":
      return <CheckCircle className={`h-4 w-4 shrink-0 text-emerald-400 ${cn}`} aria-hidden />;
    case "pending":
      return <Clock className={`h-4 w-4 shrink-0 text-yellow-400 ${cn}`} aria-hidden />;
    case "refunded":
      return <RefreshCw className={`h-4 w-4 shrink-0 text-blue-400 ${cn}`} aria-hidden />;
    default:
      return null;
  }
}
