"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Building2,
  CalendarDays,
  ChevronRight,
  CheckCircle2,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react";
import { fetchAdminPendingVenues } from "@/lib/adminApi";
import { fetchAuthMe } from "@/lib/authApi";

const nav = [
  { href: "/dashboard/admin", label: "Resumen", icon: LayoutDashboard, color: "#ffffff" },
  { href: "/dashboard/admin/locales", label: "Locales", icon: Building2, color: "#f97316" },
  { href: "/dashboard/admin/usuarios", label: "Usuarios", icon: Users, color: "#3b82f6" },
  { href: "/dashboard/admin/pendientes", label: "Pendientes", icon: CheckCircle2, color: "#f59e0b" },
  { href: "/dashboard/admin/eventos", label: "Eventos", icon: CalendarDays, color: "#ec4899" },
  { href: "/dashboard/admin/ingresos", label: "Ingresos", icon: BadgeDollarSign, color: "#10b981" },
  { href: "/dashboard/admin/configuracion", label: "Config", icon: Settings, color: "#a855f7" },
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
    <div className="flex min-h-0 w-full max-w-full flex-col bg-[#0D0D14]/95 lg:h-full lg:w-16">
      <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:gap-1 lg:overflow-y-auto lg:px-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard/admin"
              ? path === "/dashboard/admin"
              : path === item.href || path.startsWith(`${item.href}/`);
          const showPend = item.href === "/dashboard/admin/pendientes" && pending != null && pending > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`group relative flex min-w-max items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition lg:h-12 lg:w-12 lg:min-w-0 lg:justify-center lg:px-0 ${
                active
                  ? "bg-white/[0.08] text-[#F9FAFB] lg:border-l-[3px]"
                  : "border-transparent text-[#9CA3AF] hover:bg-white/[0.04] hover:text-[#F9FAFB]"
              }`}
              style={active ? { borderLeftColor: item.color } : undefined}
            >
              <span className="flex min-w-0 items-center gap-2 lg:justify-center">
                <Icon
                  className="h-4 w-4 shrink-0 lg:h-5 lg:w-5"
                  style={{ color: active ? item.color : undefined }}
                />
                <span className="lg:sr-only">{item.label}</span>
              </span>
              {showPend && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold leading-none text-white lg:absolute lg:right-1 lg:top-1 lg:px-1.5">
                  {pending}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="hidden border-t border-white/[0.08] px-2 pt-2 lg:block">
        <button
          type="button"
          className="flex h-10 w-full items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
          title={adminName || "Admin"}
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
          <span className="sr-only">{adminName || "Admin"}</span>
        </button>
      </div>
    </div>
  );
}
