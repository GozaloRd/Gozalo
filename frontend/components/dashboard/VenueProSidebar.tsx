"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoG from "@/components/LogoG";
import pkg from "../../package.json";
import { clearAuthToken } from "@/lib/authToken";

type NavItem = { href: string; label: string };

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "General",
    items: [
      { href: "/dashboard", label: "Inicio" },
      { href: "/dashboard/estadisticas", label: "Estadísticas" },
    ],
  },
  {
    title: "Operaciones",
    items: [
      { href: "/dashboard/eventos", label: "Eventos" },
      { href: "/dashboard/tickets", label: "Entradas (tickets)" },
      { href: "/dashboard/reservas", label: "Reservas" },
      { href: "/dashboard/mesas", label: "Mesas" },
      { href: "/dashboard/acceso", label: "Control de acceso" },
    ],
  },
  {
    title: "Caja",
    items: [{ href: "/dashboard/caja", label: "Caja (reporte manual)" }],
  },
  {
    title: "Ajustes",
    items: [
      { href: "/dashboard/configuracion", label: "Configuración" },
      { href: "/dashboard/collage", label: "Collage" },
    ],
  },
];

const EXTRA: NavItem[] = [];

export function VenueProSidebar({
  venueName,
  userLabel,
  onNavigate,
  isAdminViewer,
  onChangeVenue,
}: {
  venueName: string;
  userLabel?: string;
  onNavigate?: () => void;
  isAdminViewer?: boolean;
  onChangeVenue?: () => void;
}) {
  const path = usePathname();

  function logout() {
    clearAuthToken();
    localStorage.removeItem("gozalo_dashboard_venue_id");
    window.location.href = "/login";
  }

  function active(href: string) {
    if (href === "/dashboard") return path === "/dashboard";
    return path === href || path.startsWith(`${href}/`);
  }

  return (
    <div className="flex h-full w-[240px] shrink-0 flex-col border-r border-white/[0.08] bg-[#0D0D14]">
      <div className="border-b border-white/[0.08] px-4 py-5">
        <LogoG onNavigate={onNavigate} />
        <p className="mt-2 truncate text-xs text-[#6B7280]" title={venueName}>
          {venueName}
        </p>
        {isAdminViewer && onChangeVenue && (
          <button
            type="button"
            onClick={() => {
              onChangeVenue();
              onNavigate?.();
            }}
            className="mt-3 w-full rounded-md border border-white/[0.08] py-2 text-xs text-[#9CA3AF] transition hover:bg-white/[0.03]"
          >
            Cambiar local
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {GROUPS.map((g) => (
          <div key={g.title} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
              {g.title}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    className={`block rounded-md px-3 py-2 text-sm transition duration-150 ease-out ${
                      active(it.href)
                        ? "border-l-2 border-[#9B7FCA] bg-white/[0.03] pl-[10px] font-medium text-[#9B7FCA]"
                        : "border-l-2 border-transparent pl-[10px] text-[#9CA3AF] hover:bg-white/[0.03] hover:text-[#F9FAFB]"
                    }`}
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {EXTRA.length > 0 && (
          <div className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
              Más
            </p>
            <ul className="space-y-0.5">
              {EXTRA.map((it) => (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={onNavigate}
                    className={`block rounded-md px-3 py-2 text-sm transition duration-150 ease-out ${
                      active(it.href)
                        ? "border-l-2 border-[#9B7FCA] bg-white/[0.03] pl-[10px] font-medium text-[#9B7FCA]"
                        : "border-l-2 border-transparent pl-[10px] text-[#9CA3AF] hover:bg-white/[0.03] hover:text-[#F9FAFB]"
                    }`}
                  >
                    {it.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="border-t border-white/[0.08] p-3">
        <div className="rounded-md px-3 py-2">
          <p className="text-xs font-medium text-[#F9FAFB]">{userLabel ?? "Dueño de local"}</p>
          <p className="text-[10px] text-[#6B7280]">Venue owner</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="mt-2 w-full rounded-md border border-white/[0.08] py-2 text-xs text-[#9CA3AF] transition hover:bg-white/[0.03] hover:text-[#F9FAFB]"
        >
          Cerrar sesión
        </button>
        <p className="mt-3 text-center text-[10px] text-[#4B5563]">v{pkg.version}</p>
      </div>
    </div>
  );
}
