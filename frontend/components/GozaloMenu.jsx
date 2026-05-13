"use client";
import { useState } from "react";

// Tabler icons as inline SVGs (no extra dependency needed)
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);
const IconSparkles = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 3v4M19 17v4M3 5h4M17 19h4"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>
  </svg>
);
const IconCollage = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="11" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="18" width="7" height="3" rx="1"/>
  </svg>
);
const IconDashboard = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
);
const IconPanel = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconTable = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="6" cy="12" r="2"/><circle cx="6" cy="6" r="2"/><circle cx="6" cy="18" r="2"/>
    <path d="M10 12h11M10 6h11M10 18h11"/>
  </svg>
);
const IconTicket = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z"/>
    <path d="M13 5v2M13 17v2M13 11v2"/>
  </svg>
);
const IconLogout = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

import Link from "next/link";

export default function GozaloMenu({
  isOpen = true,
  onClose,
  loggedIn = false,
  authUser = null,
  isStaff = false,
  onLogout,
  onStaffPanel,
  onDashboardClick,
}) {
  const [hovered, setHovered] = useState(null);

  function initials(name) {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  }

  const navItems = [
    { id: "eventos",   href: "/eventos",   label: "Eventos",   icon: <IconCalendar />,  accent: "pink",   badge: "Nuevo" },
    { id: "collage",   href: "/collage",   label: "Collage",   icon: <IconCollage />,   accent: "purple" },
    { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: <IconDashboard />, accent: "indigo", onClick: onDashboardClick },
  ];

  const accountItems = [
    { id: "mesas",    href: "/mis-mesas",    label: "Mis mesas",    icon: <IconTable />,  accent: "purple" },
    { id: "entradas", href: "/mis-entradas", label: "Mis entradas", icon: <IconTicket />, accent: "pink"   },
  ];

  const accentStyles = {
    pink:   { bg: "rgba(232,121,249,0.12)", color: "#e879f9" },
    purple: { bg: "rgba(192,132,252,0.12)", color: "#c084fc" },
    indigo: { bg: "rgba(129,140,248,0.12)", color: "#818cf8" },
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 10050,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(340px, 88vw)",
          background: "#0e0c14",
          borderLeft: "0.5px solid rgba(255,255,255,0.07)",
          zIndex: 10060,
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.25s cubic-bezier(0.32,0.72,0,1)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 24px 20px",
          borderBottom: "0.5px solid rgba(255,255,255,0.06)",
          position: "sticky", top: 0,
          background: "#0e0c14",
          zIndex: 1,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18, fontWeight: 500,
              letterSpacing: "0.12em", color: "#fff",
            }}>
              <span style={{ color: "#c084fc" }}>G</span>ÖZALO
            </span>
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#e879f9",
              boxShadow: "0 0 8px #e879f9",
            }} />
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "0.5px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.5)",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
            aria-label="Cerrar menú"
          >
            <IconX />
          </button>
        </div>

        {/* Tagline */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 14px",
            background: "linear-gradient(135deg, rgba(192,132,252,0.1), rgba(232,121,249,0.07))",
            border: "0.5px solid rgba(192,132,252,0.22)",
            borderRadius: 10,
          }}>
            <span style={{ color: "#c084fc", display: "flex" }}><IconSparkles /></span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>
              Tu noche empieza aquí
            </span>
          </div>
        </div>

        {/* Nav — Explorar */}
        <div style={{ padding: "20px 24px 0" }}>
          <p style={{
            fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,255,255,0.26)",
            textTransform: "uppercase", marginBottom: 6, padding: "0 2px",
          }}>Explorar</p>

          {navItems.map(item => (
            <NavItem
              key={item.id}
              item={item}
              accentStyles={accentStyles}
              hovered={hovered}
              setHovered={setHovered}
              onClose={onClose}
            />
          ))}
        </div>

        {/* Divider */}
        <Divider />

        {loggedIn && authUser ? (
          <>
            {/* User card */}
            <div style={{ padding: "0 24px" }}>
              <p style={{
                fontSize: 10, letterSpacing: "0.14em", color: "rgba(255,255,255,0.26)",
                textTransform: "uppercase", marginBottom: 10, padding: "0 2px",
              }}>Tu cuenta</p>

              <div style={{
                padding: "14px 16px",
                background: "rgba(255,255,255,0.04)",
                border: "0.5px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c3aed, #e879f9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 500, color: "#fff",
                  flexShrink: 0,
                }}>{initials(authUser.fullName)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.9)" }}>
                    {authUser.fullName}
                  </div>
                  {authUser.email && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", marginTop: 1 }}>
                      {authUser.email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Nav — Cuenta */}
            <div style={{ padding: "12px 24px 0" }}>
              {isStaff && (
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "11px 12px", borderRadius: 10, cursor: "pointer",
                    background: hovered === "panel" ? "rgba(255,255,255,0.05)" : "transparent",
                    marginBottom: 2, transition: "background 0.15s",
                  }}
                  onMouseEnter={() => setHovered("panel")}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => { onClose(); onStaffPanel?.(); }}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: 8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: accentStyles.indigo.bg, color: accentStyles.indigo.color,
                    flexShrink: 0,
                    transform: hovered === "panel" ? "scale(1.08)" : "scale(1)",
                    transition: "transform 0.15s",
                  }}>
                    <IconPanel />
                  </div>
                  <span style={{ fontSize: 15, color: "rgba(255,255,255,0.88)" }}>Mi panel</span>
                </div>
              )}
              {accountItems.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  accentStyles={accentStyles}
                  hovered={hovered}
                  setHovered={setHovered}
                  onClose={onClose}
                />
              ))}
            </div>

            {/* Divider */}
            <Divider />

            {/* Logout */}
            <button
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "11px 38px",
                background: hovered === "logout" ? "rgba(239,68,68,0.06)" : "transparent",
                border: "none", cursor: "pointer",
                borderRadius: 10,
                margin: "0 0 8px",
                transition: "background 0.15s",
                width: "100%",
                textAlign: "left",
              }}
              onMouseEnter={() => setHovered("logout")}
              onMouseLeave={() => setHovered(null)}
              onClick={onLogout}
            >
              <span style={{ color: "rgba(239,68,68,0.65)", display: "flex" }}><IconLogout /></span>
              <span style={{ fontSize: 14, color: "rgba(239,68,68,0.7)" }}>Cerrar sesión</span>
            </button>
          </>
        ) : (
          /* Botones login/registro cuando no hay sesión */
          <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
            <Link
              href="/login"
              onClick={onClose}
              style={{
                display: "block", textAlign: "center",
                padding: "11px 0", borderRadius: 10,
                border: "0.5px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.88)", fontSize: 14, fontWeight: 500,
                textDecoration: "none", transition: "background 0.15s",
              }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              onClick={onClose}
              style={{
                display: "block", textAlign: "center",
                padding: "11px 0", borderRadius: 10,
                background: "linear-gradient(135deg, #7B2CBF, #C77DFF)",
                color: "#fff", fontSize: 14, fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap');
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
      `}</style>
    </>
  );
}

function NavItem({ item, accentStyles, hovered, setHovered, onClose }) {
  const accent = accentStyles[item.accent];
  const isHovered = hovered === item.id;

  const inner = (
    <>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: accent.bg, color: accent.color,
        flexShrink: 0,
        transition: "transform 0.15s",
        transform: isHovered ? "scale(1.08)" : "scale(1)",
      }}>
        {item.icon}
      </div>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.88)", flex: 1 }}>
        {item.label}
      </span>
      {item.badge && (
        <span style={{
          fontSize: 10, padding: "2px 8px", borderRadius: 20,
          background: "rgba(232,121,249,0.12)", color: "#e879f9",
          letterSpacing: "0.04em",
        }}>
          {item.badge}
        </span>
      )}
    </>
  );

  const sharedStyle = {
    display: "flex", alignItems: "center", gap: 14,
    padding: "11px 12px", borderRadius: 10, cursor: "pointer",
    background: isHovered ? "rgba(255,255,255,0.05)" : "transparent",
    marginBottom: 2, transition: "background 0.15s",
    textDecoration: "none",
  };

  if (item.onClick) {
    return (
      <div
        style={sharedStyle}
        onMouseEnter={() => setHovered(item.id)}
        onMouseLeave={() => setHovered(null)}
        onClick={(e) => { onClose?.(); item.onClick(e); }}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClose}
      style={sharedStyle}
      onMouseEnter={() => setHovered(item.id)}
      onMouseLeave={() => setHovered(null)}
    >
      {inner}
    </Link>
  );
}

function Divider() {
  return (
    <div style={{
      margin: "16px 24px",
      borderTop: "0.5px solid rgba(255,255,255,0.06)",
    }} />
  );
}
