"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchAuthMe, logoutClient, type AuthUser } from "@/lib/authApi";

function dashboardPathForRole(role: AuthUser["role"]): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "venue_owner" || role === "staff") return "/dashboard";
  return "/dashboard/cliente";
}

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2) || "?";
}

type IconProps = { className?: string };

function IconTicket({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v14" />
    </svg>
  );
}
function IconCalendar({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconLogout({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
function IconGrid({ className }: IconProps) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function UserNavMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    void fetchAuthMe().then(setUser);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function logout() {
    await logoutClient();
    setUser(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  const initials = getInitials(user?.fullName);
  const dashboardHref = user ? dashboardPathForRole(user.role) : "/login?redirect=dashboard";
  const isStaff = user?.role === "admin" || user?.role === "venue_owner" || user?.role === "staff";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2.5 rounded-full border border-[#9B7FCA]/40 bg-white/[0.02] py-1 pl-1 pr-3 transition-all duration-300 hover:border-[#9B7FCA] hover:bg-[#9B7FCA]/5 hover:shadow-[0_0_18px_rgba(155,127,202,0.2)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#9B7FCA] to-[#7B5EA7] text-xs font-bold text-white shadow-[0_0_12px_rgba(155,127,202,0.35)]">
          {initials}
        </span>
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-white sm:inline">
          {user?.fullName ?? "Cuenta"}
        </span>
        <svg
          className={`h-4 w-4 text-white/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 min-w-[240px] overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111] shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
          {user && (
            <div className="border-b border-white/[0.06] px-4 py-3">
              <p className="truncate text-sm font-semibold text-white">{user.fullName}</p>
              {user.email && (
                <p className="truncate text-xs text-white/50">{user.email}</p>
              )}
            </div>
          )}

          <div className="py-1">
            {isStaff && (
              <button
                type="button"
                role="menuitem"
                onClick={() => go(dashboardHref)}
                className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/85 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                <IconGrid className="h-4 w-4 text-white/50 group-hover:text-[#9B7FCA]" />
                Mi panel
              </button>
            )}
            <Link
              href="/mis-mesas"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 px-4 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <IconCalendar className="h-4 w-4 text-white/50 group-hover:text-[#9B7FCA]" />
              Mis mesas
            </Link>
            <Link
              href="/mis-entradas"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="group flex items-center gap-3 px-4 py-2.5 text-sm text-white/85 transition-colors hover:bg-white/[0.04] hover:text-white"
            >
              <IconTicket className="h-4 w-4 text-white/50 group-hover:text-[#C77DFF]" />
              Mis entradas
            </Link>
          </div>

          <div className="border-t border-white/[0.06] py-1">
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="group flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#9B7FCA] transition-colors hover:bg-[#9B7FCA]/10 hover:text-[#B39CD8]"
            >
              <IconLogout className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
