"use client";

import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import GozaloMenu from "@/components/GozaloMenu";
import GozaloSiteLogo from "@/components/GozaloSiteLogo";
import { fetchAuthMe, logoutClient, type AuthUser } from "@/lib/authApi";
import { getToken } from "@/lib/api";

function dashboardPathForRole(role: AuthUser["role"]): string {
  if (role === "admin") return "/dashboard/admin";
  if (role === "venue_owner" || role === "staff") return "/dashboard";
  return "/dashboard/cliente";
}

type Props = {
  scrolled: boolean;
  /** `light`: texto oscuro sobre página blanca / gris claro */
  variant?: "dark" | "light";
};

export function PublicNavbar({ scrolled, variant = "dark" }: Props) {
  const path = usePathname();
  const router = useRouter();
  const light = variant === "light";

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuMount, setMenuMount] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setMenuMount(true);
  }, []);

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

  return (
    <>
      <header
        className={`pointer-events-auto fixed left-0 right-0 top-0 z-[100] flex items-center justify-between px-5 py-3.5 transition-all duration-300 ${
          light && scrolled ? "border-b border-neutral-200/90" : ""
        } ${!light && scrolled ? "border-b border-white/[0.06]" : !light ? "border-b border-transparent" : ""}`}
        style={
          light
            ? {
                backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
                backdropFilter: scrolled ? "blur(14px)" : "none",
              }
            : {
                backgroundColor: scrolled ? "rgba(0,0,0,0.48)" : "transparent",
                backdropFilter: scrolled ? "blur(16px)" : "none",
              }
        }
      >
        <GozaloSiteLogo
          size="lg"
          variant={light ? "light" : "dark"}
          mark={light ? "brand" : "minimal"}
          onNavigate={() => setMobileOpen(false)}
        />
        <motion.button
          type="button"
          whileTap={{ scale: 0.93 }}
          onClick={() => setMobileOpen((o) => !o)}
          className={`relative z-[110] flex h-10 w-10 items-center justify-center rounded-xl border md:hidden ${
            light
              ? "border-neutral-200 bg-white shadow-sm text-neutral-900"
              : "border-white/20 bg-white/10 text-white"
          }`}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </motion.button>
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
    </>
  );
}
