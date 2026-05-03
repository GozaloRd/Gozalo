"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import LogoG from "@/components/LogoG";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/authToken";

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [asVenueOwner, setAsVenueOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("local") === "1") setAsVenueOwner(true);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api<{ token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          phone,
          password,
          role: asVenueOwner ? "venue_owner" : "customer",
        }),
      });
      setAuthToken(data.token);
      router.push(asVenueOwner ? "/dashboard" : "/mis-entradas");
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
        <p className="mt-4 text-sm text-slate-400">Crea tu perfil y empieza a vivir la noche</p>
      </div>
      <form onSubmit={onSubmit} className="mt-10 glass rounded-2xl p-8 shadow-neonDual">
        {error && <p className="mb-4 text-sm text-gozalo-red">{error}</p>}
        <label className="block text-xs uppercase text-slate-500">Nombre completo</label>
        <input
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-night-900 px-4 py-3 text-white focus:border-gozalo-blue focus:outline-none"
        />
        <label className="mt-4 block text-xs uppercase text-slate-500">Correo</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-night-900 px-4 py-3 text-white focus:border-gozalo-blue focus:outline-none"
        />
        <label className="mt-4 block text-xs uppercase text-slate-500">Teléfono</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-night-900 px-4 py-3 text-white focus:border-gozalo-blue focus:outline-none"
        />
        <label className="mt-4 block text-xs uppercase text-slate-500">Contraseña</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/10 bg-night-900 px-4 py-3 text-white focus:border-gozalo-blue focus:outline-none"
        />
        <label className="mt-6 flex cursor-pointer items-start gap-3 text-left text-sm text-slate-300">
          <input
            type="checkbox"
            checked={asVenueOwner}
            onChange={(e) => setAsVenueOwner(e.target.checked)}
            className="mt-1 rounded border-white/20 bg-night-900"
          />
          <span>
            Soy dueño/a o representante de un local y quiero usar el panel (eventos, reservas, caja).
          </span>
        </label>
        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full py-4">
          {loading ? "Creando…" : "Crear cuenta"}
        </button>
        <p className="mt-6 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-gozalo-blue hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-slate-500">Cargando…</div>}>
      <RegistroForm />
    </Suspense>
  );
}
