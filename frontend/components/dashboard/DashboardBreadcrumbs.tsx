"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  dashboard: "Panel",
  eventos: "Eventos",
  reservas: "Reservas",
  mesas: "Mesas",
  caja: "Caja",
  acceso: "Control de acceso",
  collage: "Collage",
  estadisticas: "Estadísticas",
  configuracion: "Configuración",
  tickets: "Entradas",
};

export function DashboardBreadcrumbs() {
  const path = usePathname();
  const parts = path.split("/").filter(Boolean);

  if (parts[0] !== "dashboard") return null;

  const crumbs: { href: string; label: string }[] = [{ href: "/dashboard", label: "Panel" }];
  if (parts.length > 1) {
    const sub = parts[1];
    const label = LABELS[sub] || sub;
    crumbs.push({ href: path, label });
  }

  return (
    <nav className="mb-6 text-sm text-slate-500" aria-label="Migas de pan">
      {crumbs.map((c, i) => (
        <span key={c.href}>
          {i > 0 && <span className="mx-2 text-slate-600">/</span>}
          {i < crumbs.length - 1 ? (
            <Link href={c.href} className="transition hover:text-[#B39CD8]/90">
              {c.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-300">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
