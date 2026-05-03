"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function ConditionalNavbar() {
  const pathname = usePathname();
  // Oculto solo en flujos internos del dashboard (ya tienen su propio chrome)
  if (pathname.startsWith("/dashboard")) return null;
  return <Navbar />;
}
