"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import LogoG from "@/components/LogoG";
import { fetchAdminPendingVenues } from "@/lib/adminApi";
import { fetchAuthMe } from "@/lib/authApi";

const nav = [
  { href: "/dashboard/admin", label: "Resumen Global", icon: "📊" },
  { href: "/dashboard/admin/locales", label: "Todos los Locales", icon: "🏠" },
  { href: "/dashboard/admin/usuarios", label: "Usuarios", icon: "👥" },
  { href: "/dashboard/admin/pendientes", label: "Locales Pendientes", icon: "✅" },
  { href: "/dashboard/admin/eventos", label: "Eventos", icon: "📅" },
  { href: "/dashboard/admin/ingresos", label: "Ingresos", icon: "💰" },
  { href: "/dashboard/admin/configuracion", label: "Configuración", icon: "⚙️" },
];

export function AdminSidebar() {
  const path = usePathname();
  const [pending, setPending] = useState<number | null>(null);
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    void fetchAdminPendingVenues()
      .then((list) => setPending(list.length))
      .catch(() => setPending(0));
    void fetchAuthMe().then((u) => u && setAdminName(u.fullName));
  }, []);

  return (
    <div className="flex min-h-0 w-full max-w-full flex-col bg-[#0A0A0F] lg:h-screen lg:w-[260px] lg:max-w-[260px]">
      <div className="border-b border-white/[0.08] px-4 py-5">
        <LogoG />
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full border border-[#9B7FCA]/50 bg-[#9B7FCA]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#B39CD8]">
            Admin
          </span>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {nav.map((item) => {
          const active =
            item.href === "/dashboard/admin"
              ? path === "/dashboard/admin"
              : path === item.href || path.startsWith(`${item.href}/`);
          const showPend = item.href === "/dashboard/admin/pendientes" && pending != null && pending > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white/[0.08] text-[#F9FAFB]"
                  : "text-[#9CA3AF] hover:bg-white/[0.04] hover:text-[#F9FAFB]"
              }`}
            >
              <span>
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </span>
              {showPend && (
                <span className="rounded-full bg-[#9B7FCA]/20 px-2 py-0.5 text-[10px] font-bold text-[#B39CD8]">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/[0.08] p-4">
        <p className="text-[11px] uppercase tracking-wide text-[#6B7280]">Conectado</p>
        <p className="mt-1 truncate text-sm font-medium text-[#F9FAFB]">{adminName || "—"}</p>
      </div>
    </div>
  );
}
