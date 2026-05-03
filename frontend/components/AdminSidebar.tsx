"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoG from "./LogoG";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/locales", label: "Locales" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/transacciones", label: "Transacciones" },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/5 bg-night-950 py-6">
      <div className="px-4">
        <LogoG />
        <p className="mt-2 text-xs uppercase tracking-wider text-gozalo-blue">Admin Gózalo</p>
      </div>
      <nav className="mt-8 flex flex-col gap-1 px-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              path === it.href
                ? "bg-gozalo-red/20 text-gozalo-red shadow-neonRed"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {it.label}
          </Link>
        ))}
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-2 px-1 text-[10px] uppercase tracking-wide text-slate-600">
            Vista operativa
          </p>
          <Link
            href="/dashboard"
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${
              path.startsWith("/dashboard")
                ? "bg-[#2979FF]/15 text-[#5B9DFF]"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            Panel de locales
          </Link>
          <p className="mt-1 px-1 text-[11px] leading-snug text-slate-600">
            Mismo menú que los dueños: elige un local y revisa mejoras.
          </p>
        </div>
      </nav>
      <div className="mt-auto px-4 pt-8">
        <Link href="/" className="text-xs text-slate-500 hover:text-white">
          ← Sitio público
        </Link>
      </div>
    </aside>
  );
}
