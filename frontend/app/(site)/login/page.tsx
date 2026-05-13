"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import LogoG from "@/components/LogoG";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/authToken";

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? null;
  const redirect = searchParams?.get("redirect") ?? null;
  const defaultNext = "/mis-entradas";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showPanelHint = redirect === "dashboard" || next === "/dashboard";
  const googleAuthUrl = process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL?.trim();
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  const forgotHref = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent("Recuperar contraseña — Gozalo")}`
    : "/registro";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api<{
        token: string;
        user?: { role?: string };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await setAuthToken(data.token);

      const target = next || defaultNext;
      if (redirect === "dashboard" || target === "/dashboard") {
        const role = data.user?.role;
        if (role === "admin") router.push("/dashboard/admin");
        else if (role === "venue_owner" || role === "staff") router.push("/dashboard");
        else router.push("/dashboard/cliente");
        return;
      }
      router.push(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const fieldLabel = "block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050508]">
      {/* Glows radiales: índigo, fucsia, violeta */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-[20%] top-[-12%] h-[min(78vmin,30rem)] w-[min(78vmin,30rem)] rounded-full bg-[#312e81] opacity-[0.32] blur-[118px]" />
        <div className="absolute right-[-18%] top-[18%] h-[min(70vmin,26rem)] w-[min(70vmin,26rem)] rounded-full bg-[#be185d] opacity-[0.22] blur-[100px]" />
        <div className="absolute bottom-[-22%] left-[22%] h-[min(72vmin,28rem)] w-[min(72vmin,28rem)] rounded-full bg-[#6d28d9] opacity-[0.26] blur-[108px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-4 py-16 pb-28">
        <div className="text-center">
          <div className="flex justify-center">
            <LogoG size="xl" />
          </div>
          <p className="mt-5 font-serif text-[15px] text-white/50 sm:text-base">Entra a tu cuenta nocturna</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="relative mt-10 overflow-hidden rounded-[28px] border border-white/[0.09] bg-white/[0.045] px-7 pb-8 pt-9 shadow-[0_28px_90px_-24px_rgba(0,0,0,0.78)] backdrop-blur-[22px]"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#c4b5fd]/95 to-transparent"
            aria-hidden
          />

          {showPanelHint && (
            <p className="mb-5 rounded-xl border border-[#9B7FCA]/35 bg-[#9B7FCA]/12 px-4 py-2.5 text-center text-[13px] leading-snug text-[#EDE9FE]">
              Inicia sesión para acceder a tu panel
            </p>
          )}

          {error && <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}

          <label htmlFor="login-email" className={fieldLabel}>
            Correo
          </label>
          <div className="relative mt-1.5">
            <Mail
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/[0.12] bg-black/40 py-3 pl-11 pr-4 font-sans text-[15px] text-white outline-none ring-0 transition placeholder:text-white/25 focus:border-[#c4b5fd]/85 focus:ring-2 focus:ring-[#a78bfa]/35"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <label htmlFor="login-password" className={fieldLabel}>
              Contraseña
            </label>
            <Link
              href={forgotHref}
              className="shrink-0 pb-0.5 text-right text-[12px] font-medium text-[#d8b4fe]/90 underline-offset-4 transition hover:text-[#f5d0fe] hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative mt-1.5">
            <Lock
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/35"
              strokeWidth={1.75}
              aria-hidden
            />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/[0.12] bg-black/40 py-3 pl-11 pr-12 font-sans text-[15px] text-white outline-none transition placeholder:text-white/25 focus:border-[#c4b5fd]/85 focus:ring-2 focus:ring-[#a78bfa]/35"
              placeholder="••••••••"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white/85"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-7 w-full rounded-xl bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#db2777] py-3.5 font-sans text-[15px] font-semibold tracking-wide text-white shadow-[0_10px_36px_-6px_rgba(124,58,237,0.55),0_8px_28px_-8px_rgba(219,39,119,0.35)] transition hover:brightness-[1.06] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
            <span className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/38">
              O continúa con
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
          </div>

          {googleAuthUrl ? (
            <a
              href={googleAuthUrl}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.14] bg-white/[0.04] py-3 font-sans text-[14px] font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/25 hover:bg-white/[0.08]"
            >
              <GoogleGlyph className="h-5 w-5 shrink-0" />
              Continuar con Google
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Configura NEXT_PUBLIC_GOOGLE_AUTH_URL para activar el acceso con Google"
              className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-xl border border-white/[0.1] bg-white/[0.03] py-3 font-sans text-[14px] font-medium text-white/45 opacity-[0.72]"
            >
              <GoogleGlyph className="h-5 w-5 shrink-0 opacity-80" />
              Continuar con Google
            </button>
          )}

          <p className="mt-8 text-center font-sans text-[13px] text-white/45">
            ¿Sin cuenta?{" "}
            <Link href="/registro" className="font-semibold text-[#93c5fd] underline-offset-4 transition hover:text-[#bfdbfe] hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] font-sans text-sm text-white/40">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
