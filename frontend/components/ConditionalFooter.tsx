"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  return <Footer />;
}
