"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardUI, type DateRangePreset } from "@/contexts/DashboardUIContext";

const TITLES: Record<string, { title: string; crumb?: string }> = {
  "/dashboard": { title: "Inicio", crumb: "Resumen" },
  "/dashboard/estadisticas": { title: "Estadísticas" },
  "/dashboard/eventos": { title: "Eventos" },
  "/dashboard/reservas": { title: "Reservas" },
  "/dashboard/tickets": { title: "Tickets" },
  "/dashboard/mesas": { title: "Mesas" },
  "/dashboard/caja": { title: "Caja" },
  "/dashboard/configuracion": { title: "Configuración" },
  "/dashboard/acceso": { title: "Control de acceso" },
  "/dashboard/collage": { title: "Collage" },
};

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "1y", label: "1A" },
];

export function DashboardProHeader({ showDateRange }: { showDateRange?: boolean }) {
  const path = usePathname();
  const { datePreset, setDatePreset } = useDashboardUI();

  const meta = TITLES[path] ?? {
    title: path.split("/").pop() || "Panel",
  };

  return (
    <header className="sticky top-0 z-30 hidden min-h-[64px] shrink-0 items-center justify-between gap-4 border-b border-white/[0.08] bg-[#0A0A0F]/95 px-6 py-3 backdrop-blur-sm lg:flex">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[#F9FAFB]">{meta.title}</h1>
        <nav className="mt-0.5 text-xs text-[#6B7280]" aria-label="Migas de pan">
          <Link href="/dashboard" className="hover:text-[#9CA3AF]">
            Panel
          </Link>
          {path !== "/dashboard" && (
            <>
              <span className="mx-1.5 text-[#4B5563]">/</span>
              <span className="text-[#9CA3AF]">{meta.crumb ?? meta.title}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {showDateRange ? (
          <div
            className="hidden items-center rounded-md border border-white/[0.08] p-0.5 sm:flex"
            role="group"
            aria-label="Rango de fechas"
          >
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`rounded px-2.5 py-1 text-xs font-medium tabular-nums transition duration-150 ${
                  datePreset === p.id
                    ? "bg-white/[0.08] text-[#F9FAFB]"
                    : "text-[#6B7280] hover:text-[#9CA3AF]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className="relative rounded-md p-2 text-[#6B7280] transition hover:bg-white/[0.04] hover:text-[#9CA3AF]"
          aria-label="Notificaciones"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#6B7280] opacity-50" />
        </button>
      </div>
    </header>
  );
}
