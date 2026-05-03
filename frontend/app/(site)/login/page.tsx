"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import LogoG from "@/components/LogoG";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/authToken";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const redirect = searchParams.get("redirect");
  const defaultNext = "/mis-entradas";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showPanelHint = redirect === "dashboard" || next === "/dashboard";

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
      setAuthToken(data.token);

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

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="text-center">
        <div className="flex justify-center">
          <LogoG />
        </div>
        <p className="mt-4 text-sm text-slate-400">Entra a tu cuenta nocturna</p>
        {showPanelHint && (
          <p className="mt-3 rounded-xl border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 px-4 py-2 text-sm text-[#E9DFF7]">
            Inicia sesión para acceder a tu panel
          </p>
        )}
      </div>
      <form onSubmit={onSubmit} className="mt-10 glass rounded-2xl p-8 shadow-neonDual">
        {error && <p className="mb-4 text-sm text-gozalo-red">{error}</p>}
        <label className="block text-xs uppercase text-slate-500">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-night-900 px-4 py-3 text-white focus:border-gozalo-blue focus:outline-none"
        />
        <label className="mt-4 block text-xs uppercase text-slate-500">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-night-900 px-4 py-3 text-white focus:border-gozalo-blue focus:outline-none"
        />
        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full py-4">
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Sin cuenta?{" "}
          <Link href="/registro" className="text-gozalo-blue hover:underline">
            Regístrate
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-slate-500">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
