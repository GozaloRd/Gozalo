"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

const DEV_DASHBOARD_PASSWORD = "gozalo2024";

const CARD_BG = "#111118";
const BORDER = "1px solid rgba(255,255,255,0.08)";
const INPUT_BG = "#0A0A0F";
const GOLD = "#9B7FCA";

type Props = {
  open: boolean;
  onClose: () => void;
};

function LockIcon() {
  return (
    <div
      className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
      style={{ background: "rgba(155, 127, 202, 0.12)", border: "1px solid rgba(155, 127, 202, 0.35)" }}
      aria-hidden
    >
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M7 11V8a5 5 0 0110 0v3M6 11h12a2 2 0 012 2v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7a2 2 0 012-2z"
          stroke={GOLD}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="16" r="1.25" fill={GOLD} />
      </svg>
    </div>
  );
}

export function DashboardPasswordModal({ open, onClose }: Props) {
  const router = useRouter();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setError(null);
    setShowPw(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const triggerShake = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 300);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password === DEV_DASHBOARD_PASSWORD) {
      onClose();
      router.push("/dashboard");
      return;
    }
    triggerShake();
    setError("Contraseña incorrecta");
  }

  if (!mounted || !open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-modal-in relative w-full max-w-md shadow-2xl"
        style={{
          background: CARD_BG,
          border: BORDER,
          borderRadius: 12,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="px-6 pb-6 pt-8">
          <LockIcon />
          <h2
            id={titleId}
            className="mt-5 text-center text-lg font-semibold text-[#F9FAFB]"
          >
            Acceso al Panel de Gestión
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Área exclusiva para propietarios de locales
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="dash-pw" className="sr-only">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="dash-pw"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Contraseña"
                  className={`w-full rounded-[8px] px-4 py-3 pr-12 text-sm text-[#F9FAFB] placeholder:text-slate-600 outline-none transition-[border-color,box-shadow] duration-150 focus:ring-2 focus:ring-[#9B7FCA]/30 ${
                    shake ? "animate-shake" : ""
                  }`}
                  style={{
                    background: INPUT_BG,
                    border:
                      error != null
                        ? "1px solid rgba(239, 68, 68, 0.5)"
                        : "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = GOLD;
                    e.target.style.boxShadow = "0 0 0 1px #9B7FCA";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor =
                      error != null ? "rgba(239, 68, 68, 0.5)" : "rgba(255,255,255,0.1)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500 hover:text-slate-300"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPw ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 3l18 18M10.5 10.677a2 2 0 002.823 2.823M7.362 7.561C8.522 6.74 9.963 6.2 11.5 6.2c5 0 9.27 5.6 9.27 5.6s-1.085 1.718-2.73 3.218M12.5 17.8c-5 0-9.27-5.6-9.27-5.6s1.085-1.718 2.73-3.218" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-[8px] py-3 text-sm font-bold text-black transition hover:brightness-110"
              style={{ background: GOLD }}
            >
              Acceder
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            <Link
              href="/registro?local=1"
              className="text-slate-400 underline-offset-2 hover:text-[#9B7FCA] hover:underline"
              onClick={onClose}
            >
              ¿No tienes cuenta? Regístrate como local
            </Link>
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
