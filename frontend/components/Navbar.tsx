"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { UserNavMenu } from "@/components/UserNavMenu";
import { fetchAuthMe, logoutClient, type AuthUser } from "@/lib/authApi";
import { getToken } from "@/lib/api";

const navLinks = [
  { href: "/eventos", label: "Eventos" },
  { href: "/collage", label: "Collage" },
];

function dashboardPathForRole(role: AuthUser["role"]): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "venue_owner" || role === "staff") return "/dashboard";
  return "/dashboard/cliente";
}

function NavLogo({
  onClick,
  className,
}: {
  onClick?: () => void;
  /** Clases extra en el contenedor (p. ej. panel móvil) — mismos colores de marca */
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Gózalo — inicio"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center gap-2.5 outline-none ${className ?? ""}`}
    >
      <span className="relative text-xl font-black tracking-tight md:text-2xl">
        <span className="text-[#9B7FCA] transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_18px_rgba(155,127,202,0.65)]">
          G
        </span>
        <span className="text-white transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_14px_rgba(155,127,202,0.35)]">
          OZALO
        </span>
      </span>
      <span className="relative inline-block h-2 w-2 rounded-full bg-[#9B7FCA] shadow-[0_0_10px_rgba(155,127,202,0.7)]">
        <span className="absolute inset-0 rounded-full bg-[#9B7FCA] opacity-70 animate-[navDotPulse_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
      </span>
      <style jsx>{`
        @keyframes navDotPulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
      `}</style>
    </Link>
  );
}

type NavLinkItemProps = {
  href: string;
  label: string;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
  emoji?: string;
};

function DesktopNavLink({ href, label, active, onClick }: NavLinkItemProps) {
  const base =
    "group relative px-1 py-2 text-sm transition-colors duration-200";
  const color = active
    ? "text-white font-semibold"
    : "text-white/70 hover:text-white font-medium";

  return (
    <Link href={href} onClick={onClick} className={`${base} ${color}`}>
      {label}
      <span
        aria-hidden
        className={`pointer-events-none absolute -bottom-0.5 left-0 h-[3px] rounded-full bg-gradient-to-r from-[#E0AAFF] via-[#C77DFF] to-[#9B7FCA] shadow-[0_0_8px_rgba(199,125,255,0.75),0_0_18px_rgba(199,125,255,0.45),0_0_28px_rgba(224,170,255,0.25)] transition-all duration-300 ease-out ${
          active
            ? "w-full opacity-100"
            : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100"
        }`}
      />
    </Link>
  );
}

function MobileNavLink({ href, label, active, onClick, emoji }: NavLinkItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`relative flex items-center justify-between overflow-hidden rounded-xl px-4 py-4 text-lg transition-colors duration-200 ${
        active
          ? "bg-[#C77DFF]/10 font-semibold text-white"
          : "font-medium text-white/80 hover:bg-white/5 hover:text-white"
      }`}
    >
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#E0AAFF] via-[#C77DFF] to-[#9B7FCA] shadow-[0_0_10px_rgba(199,125,255,0.7),0_0_20px_rgba(199,125,255,0.4)]"
        />
      )}
      <span className="flex items-center gap-2.5">
        {emoji ? <span aria-hidden className="text-[1.05em] leading-none">{emoji}</span> : null}
        <span>{label}</span>
      </span>
      {active && (
        <span
          aria-hidden
          className="h-2 w-2 rounded-full bg-[#C77DFF] shadow-[0_0_8px_rgba(199,125,255,0.9),0_0_16px_rgba(224,170,255,0.5)]"
        />
      )}
    </Link>
  );
}

export function Navbar() {
  const path = usePathname();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const onScroll = useCallback(() => {
    setScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoggedIn(false);
      setAuthUser(null);
      return;
    }
    void fetchAuthMe().then((u) => {
      setLoggedIn(!!u);
      setAuthUser(u);
    });
  }, [path]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    path === href || (href !== "/" && path.startsWith(href));

  const dashActive = path === "/dashboard" || path.startsWith("/dashboard/");
  const mobileEmojiByHref: Record<string, string> = {
    "/eventos": "◇",
    "/collage": "◈",
    "/dashboard": "▦",
    "/mis-mesas": "⌂",
    "/mis-entradas": "⌗",
  };

  function handleDashboardClick(e: React.MouseEvent) {
    e.preventDefault();
    setMobileOpen(false);
    const t = getToken();
    if (!t) {
      router.push("/login?redirect=dashboard");
      return;
    }
    void fetchAuthMe().then((u) => {
      if (!u) {
        router.push("/login?redirect=dashboard");
        return;
      }
      setAuthUser(u);
      router.push(dashboardPathForRole(u.role));
    });
  }

  const isStaff =
    authUser?.role === "admin" ||
    authUser?.role === "venue_owner" ||
    authUser?.role === "staff";

  function handleMobileLogout() {
    logoutClient();
    setAuthUser(null);
    setLoggedIn(false);
    setMobileOpen(false);
    router.push("/");
    router.refresh();
  }

  function goMobileStaffPanel() {
    if (!authUser) return;
    setMobileOpen(false);
    router.push(dashboardPathForRole(authUser.role));
  }

  const headerClass = scrolled
    ? "border-white/5 bg-[#080808]/95 backdrop-blur-xl backdrop-saturate-150 shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
    : "border-transparent bg-transparent";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,backdrop-filter,border-color,box-shadow] duration-500 ease-out ${headerClass}`}
      >
        <div className="mx-auto flex h-[4.25rem] max-w-7xl items-center gap-4 px-4 md:h-[4.5rem] md:px-6">
          {/* Móvil: logo original (G morado + OZALO blanco + punto); solo se desplaza, sin perder color */}
          <div
            className={`relative z-[1] min-w-0 origin-left will-change-transform transition-[transform,filter] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] md:translate-x-0 md:filter-none motion-reduce:translate-x-0 motion-reduce:transition-none motion-reduce:filter-none ${
              mobileOpen
                ? "max-md:translate-x-[calc(100vw-10.5rem)] max-md:drop-shadow-[0_0_20px_rgba(155,127,202,0.55)]"
                : "translate-x-0"
            }`}
          >
            <NavLogo />
          </div>

          <nav
            className="hidden flex-1 items-center justify-center gap-8 md:flex lg:gap-10"
            aria-label="Principal"
          >
            {navLinks.map((l) => (
              <DesktopNavLink
                key={l.href}
                href={l.href}
                label={l.label}
                active={isActive(l.href)}
              />
            ))}
            <DesktopNavLink
              href="/dashboard"
              label="Dashboard"
              active={dashActive}
              onClick={handleDashboardClick}
            />
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            {loggedIn ? (
              <UserNavMenu />
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/70 bg-transparent px-5 py-2.5 text-sm font-black tracking-wide text-white transition-all duration-300 ease-out hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0AAFF]/70"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro"
                  className="rounded-xl border border-[#C77DFF] bg-gradient-to-r from-[#7B2CBF] to-[#C77DFF] px-5 py-2.5 text-sm font-black tracking-wide text-white shadow-[0_0_18px_rgba(199,125,255,0.35)] transition-all duration-300 ease-out hover:border-[#E0AAFF] hover:shadow-[0_0_24px_rgba(224,170,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0AAFF]/70"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="relative z-[2] ml-auto flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px] rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-[#9B7FCA]/50 hover:bg-[#9B7FCA]/5 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span
              className={`h-[2px] w-5 rounded-full bg-white transition-all duration-300 ease-out ${
                mobileOpen ? "translate-y-[7px] rotate-45 bg-[#9B7FCA]" : ""
              }`}
            />
            <span
              className={`h-[2px] w-5 rounded-full bg-white transition-opacity duration-200 ${
                mobileOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`h-[2px] w-5 rounded-full bg-white transition-all duration-300 ease-out ${
                mobileOpen ? "-translate-y-[7px] -rotate-45 bg-[#9B7FCA]" : ""
              }`}
            />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out md:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        id="mobile-drawer"
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(100vw-3rem,20rem)] flex-col border-l border-white/5 bg-[#0a0a0a] shadow-[-20px_0_50px_rgba(0,0,0,0.6)] transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[#9B7FCA]/18 blur-3xl" />
          <div className="absolute top-40 -left-14 h-32 w-32 rounded-full bg-[#C77DFF]/14 blur-3xl" />
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3.5">
          <NavLogo
            onClick={() => setMobileOpen(false)}
            className="min-w-0 origin-left scale-[0.94] transition-transform duration-300 hover:scale-[0.96]"
          />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Cerrar"
            onClick={() => setMobileOpen(false)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="relative mx-4 mt-3 rounded-xl border border-[#9B7FCA]/25 bg-gradient-to-r from-[#9B7FCA]/12 via-[#C77DFF]/8 to-transparent px-3.5 py-2 text-[11px] font-medium tracking-[0.02em] text-[#EADFFF]">
          ✨ Tu noche empieza aquí
        </div>

        <nav className="relative flex flex-1 flex-col gap-1 overflow-y-auto p-4" aria-label="Móvil">
          {navLinks.map((l) => (
            <MobileNavLink
              key={l.href}
              href={l.href}
              label={l.label}
              emoji={mobileEmojiByHref[l.href]}
              active={isActive(l.href)}
              onClick={() => setMobileOpen(false)}
            />
          ))}
          <MobileNavLink
            href="/dashboard"
            label="Dashboard"
            emoji={mobileEmojiByHref["/dashboard"]}
            active={dashActive}
            onClick={(e) => handleDashboardClick(e)}
          />

          {loggedIn && authUser && (
            <>
              <div className="my-3 border-t border-white/[0.06] pt-3">
                <p className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                  Tu cuenta
                </p>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <p className="truncate text-sm font-semibold text-white">
                    {authUser.fullName}
                  </p>
                  {authUser.email && (
                    <p className="truncate text-xs text-white/45">{authUser.email}</p>
                  )}
                </div>
              </div>

              {isStaff && (
                <button
                  type="button"
                  onClick={goMobileStaffPanel}
                  className={`relative flex w-full items-center justify-between overflow-hidden rounded-xl px-4 py-4 text-left text-lg transition-colors duration-200 ${
                    dashActive
                      ? "bg-[#C77DFF]/10 font-semibold text-white"
                      : "font-medium text-white/80 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {dashActive && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-2 left-0 w-[3px] rounded-full bg-gradient-to-b from-[#E0AAFF] via-[#C77DFF] to-[#9B7FCA]"
                    />
                  )}
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden className="text-[1.05em] leading-none">▦</span>
                    <span>Mi panel</span>
                  </span>
                  {dashActive && (
                    <span
                      aria-hidden
                      className="h-2 w-2 rounded-full bg-[#C77DFF]"
                    />
                  )}
                </button>
              )}

              <MobileNavLink
                href="/mis-mesas"
                label="Mis mesas"
                emoji={mobileEmojiByHref["/mis-mesas"]}
                active={isActive("/mis-mesas")}
                onClick={() => setMobileOpen(false)}
              />
              <MobileNavLink
                href="/mis-entradas"
                label="Mis entradas"
                emoji={mobileEmojiByHref["/mis-entradas"]}
                active={isActive("/mis-entradas")}
                onClick={() => setMobileOpen(false)}
              />

              <button
                type="button"
                onClick={handleMobileLogout}
                className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-base font-medium text-[#9B7FCA] transition-colors hover:bg-[#9B7FCA]/10"
              >
                <span aria-hidden className="text-[1.05em] leading-none">↩</span>
                Cerrar sesión
              </button>
            </>
          )}
        </nav>

        <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-white/5 p-4">
          {!loggedIn && (
            <>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-white/70 bg-transparent py-3 text-center text-sm font-black tracking-wide text-white transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0AAFF]/70"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-[#C77DFF] bg-gradient-to-r from-[#7B2CBF] to-[#C77DFF] py-3 text-center text-sm font-black tracking-wide text-white shadow-[0_0_18px_rgba(199,125,255,0.35)] transition-colors hover:border-[#E0AAFF] hover:shadow-[0_0_24px_rgba(224,170,255,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E0AAFF]/70"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </aside>

      {path !== "/" && (
        <div className="h-[4.25rem] md:h-[4.5rem]" aria-hidden />
      )}
    </>
  );
}
