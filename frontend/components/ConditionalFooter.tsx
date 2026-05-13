"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard")) return null;
  if (pathname === "/registro" || pathname.startsWith("/registro/")) return null;
  return <Footer />;
}
