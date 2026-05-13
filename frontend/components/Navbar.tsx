"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import GozaloMenu from "@/components/GozaloMenu";
import GozaloSiteLogo from "@/components/GozaloSiteLogo";
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

type NavLinkItemProps = {
  href: string;
  label: string;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
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


export function Navbar() {
  const path = usePathname();
  const router = useRouter();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [menuMount, setMenuMount] = useState(false);

  useEffect(() => {
    setMenuMount(true);
  }, []);

  const onScroll = useCallback(() => {
    const glass =
      path === "/" ||
      path.startsWith("/reservar") ||
      path.startsWith("/checkout");
    setScrolled(window.scrollY > (glass ? 20 : 50));
  }, [path]);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll, path]);

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

  async function handleMobileLogout() {
    await logoutClient();
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

  /** Home, reserva y checkout: sin raya morada arriba; al bajar, mismo cristal que `PublicNavbar` en eventos. */
  const glassSiteHeader =
    path === "/" ||
    path.startsWith("/reservar") ||
    path.startsWith("/checkout");

  const headerClass = glassSiteHeader
    ? ""
    : scrolled
      ? "border-b border-[#9B7FCA]/30 bg-gradient-to-b from-[#1a0f2e]/[0.97] via-[#140b24]/[0.96] to-[#0c0716]/[0.98] backdrop-blur-xl backdrop-saturate-150 shadow-[0_4px_28px_rgba(91,33,182,0.22),0_14px_44px_-14px_rgba(155,127,202,0.2)]"
      : "border-b border-[#9B7FCA]/15 bg-gradient-to-b from-[#9B7FCA]/[0.14] via-[#6d28d9]/[0.07] to-transparent shadow-[inset_0_-1px_0_rgba(192,132,252,0.12)]";

  const glassHeaderStyle = glassSiteHeader
    ? {
        backgroundColor: scrolled ? "rgba(0,0,0,0.48)" : "rgba(0,0,0,0)",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrolled ? ("blur(16px)" as const) : ("none" as const),
        borderBottomWidth: 1,
        borderBottomStyle: "solid" as const,
        borderBottomColor: scrolled ? "rgba(255,255,255,0.06)" : "transparent",
        boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.35)" : "none",
      }
    : undefined;

  return (
    <>
      <header
        className={`pointer-events-auto fixed inset-x-0 top-0 z-[100] border-b transition-[background-color,backdrop-filter,border-color,box-shadow] duration-300 ease-out ${
          glassSiteHeader ? "" : headerClass
        }`}
        style={glassSiteHeader ? glassHeaderStyle : undefined}
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
            <GozaloSiteLogo
              size="lg"
              mark={
                path.startsWith("/reservar") || path.startsWith("/checkout") ? "minimal" : "brand"
              }
            />
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
            className={`relative z-[110] ml-auto flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px] rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors md:hidden ${
              glassSiteHeader
                ? "border-white/20 bg-white/10 hover:border-white/30 hover:bg-white/[0.14]"
                : "border-[#C77DFF]/35 bg-gradient-to-br from-[#9B7FCA]/15 via-[#581c87]/10 to-[#0f0720]/40 hover:border-[#E9D5FF]/45 hover:bg-[#9B7FCA]/20"
            }`}
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

      {menuMount
        ? createPortal(
            <GozaloMenu
              isOpen={mobileOpen}
              onClose={() => setMobileOpen(false)}
              loggedIn={loggedIn}
              authUser={authUser}
              isStaff={isStaff}
              onLogout={handleMobileLogout}
              onStaffPanel={goMobileStaffPanel}
              onDashboardClick={handleDashboardClick}
            />,
            document.body
          )
        : null}

      {path !== "/" && (
        <div className="h-[4.25rem] md:h-[4.5rem]" aria-hidden />
      )}
    </>
  );
}
