"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoG from "@/components/LogoG";
import { clearAuthToken } from "@/lib/authToken";

type Item = { href: string; label: string; icon: React.FC<{ className?: string }> };

const group = (title: string, items: Item[]) => ({ title, items });

const sections = [
  group("Operación", [
    { href: "/dashboard", label: "Vista general", icon: IconHome },
    { href: "/dashboard/eventos", label: "Eventos", icon: IconCal },
    { href: "/dashboard/tickets", label: "Entradas & tipos", icon: IconTicket },
    { href: "/dashboard/reservas", label: "Reservas", icon: IconBook },
    { href: "/dashboard/mesas", label: "Mesas & mapa", icon: IconGrid },
    { href: "/dashboard/acceso", label: "Control de acceso", icon: IconQr },
  ]),
  group("Ventas", [{ href: "/dashboard/caja", label: "Caja (reporte manual)", icon: IconCalc }]),
  group("Análisis", [{ href: "/dashboard/estadisticas", label: "Estadísticas", icon: IconChart }]),
  group("Sistema", [
    { href: "/dashboard/collage", label: "Collage", icon: IconCollage },
    { href: "/dashboard/configuracion", label: "Configuración", icon: IconGear },
  ]),
];

export function DashboardSidebar({
  venueName,
  onNavigate,
  isAdminViewer,
  onChangeVenue,
}: {
  venueName: string;
  onNavigate?: () => void;
  isAdminViewer?: boolean;
  onChangeVenue?: () => void;
}) {
  const path = usePathname();

  async function logout() {
    await clearAuthToken();
    localStorage.removeItem("gozalo_dashboard_venue_id");
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full flex-col border-r border-white/[0.06] bg-[#06060f]/95 backdrop-blur-xl">
      <div className="border-b border-white/[0.06] px-4 py-5">
        <div className="origin-left scale-90">
          <LogoG href="/dashboard" onNavigate={onNavigate} />
        </div>
        <p className="mt-3 truncate text-sm font-semibold text-gozalo-cream">{venueName}</p>
        <p className="text-xs text-slate-500">
          {isAdminViewer ? "Vista administrador · panel del local" : "Panel del local"}
        </p>
        {isAdminViewer && onChangeVenue && (
          <button
            type="button"
            onClick={() => {
              onChangeVenue();
              onNavigate?.();
            }}
            className="mt-3 w-full rounded-lg border border-[#9B7FCA]/30 py-2 text-xs text-[#B39CD8]/90 transition hover:bg-[#9B7FCA]/10"
          >
            Cambiar de local
          </button>
        )}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        {sections.map((sec) => (
          <div key={sec.title}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {sec.title}
            </p>
            <div className="space-y-0.5">
              {sec.items.map((it) => {
                const Icon = it.icon;
                const isActive =
                  it.href === "/dashboard"
                    ? path === "/dashboard"
                    : path === it.href || path.startsWith(it.href + "/");
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-gradient-to-r from-[#9B7FCA]/15 to-violet-600/20 text-[#D4C2EE]/95 shadow-[0_0_20px_rgba(155,127,202,0.12)]"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0 opacity-90" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.06] p-3">
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-xl border border-white/10 py-2.5 text-sm text-slate-300 transition hover:border-rose-500/40 hover:text-rose-300"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function IconCal({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
function IconBook({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}
function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function IconQr({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
    </svg>
  );
}
function IconTicket({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}
function IconCalc({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}
function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
    </svg>
  );
}
function IconGear({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
function IconCollage({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
