"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";

export function ConditionalNavbar() {
  const pathname = usePathname();
  // Oculto solo en flujos internos del dashboard (ya tienen su propio chrome)
  if (pathname.startsWith("/dashboard")) return null;
  // Registro: pantalla de rol + formulario a pantalla completa (sin barra del sitio)
  if (pathname === "/registro" || pathname.startsWith("/registro/")) return null;
  return <Navbar />;
}
