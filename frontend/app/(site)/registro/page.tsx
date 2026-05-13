"use client";

import type { CSSProperties } from "react";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Flower2, Music2, Ticket } from "lucide-react";
import LogoG from "@/components/LogoG";
import { api } from "@/lib/api";
import { setAuthToken } from "@/lib/authToken";

type Phase = "role" | "form";

/** País + prefijo telefónico (NANP +1 compartido por varios países). */
const REGISTRY_COUNTRIES = [
  { value: "DO", label: "República Dominicana", dial: "+1" },
  { value: "US", label: "Estados Unidos", dial: "+1" },
  { value: "PR", label: "Puerto Rico", dial: "+1" },
  { value: "ES", label: "España", dial: "+34" },
  { value: "MX", label: "México", dial: "+52" },
  { value: "CO", label: "Colombia", dial: "+57" },
  { value: "VE", label: "Venezuela", dial: "+58" },
  { value: "CU", label: "Cuba", dial: "+53" },
  { value: "AR", label: "Argentina", dial: "+54" },
  { value: "CL", label: "Chile", dial: "+56" },
  { value: "PA", label: "Panamá", dial: "+507" },
  { value: "HT", label: "Haití", dial: "+509" },
] as const;

function countryMeta(code: string) {
  return REGISTRY_COUNTRIES.find((c) => c.value === code) ?? REGISTRY_COUNTRIES[0];
}

const REGISTRO_STAR_COUNT = 90;

function rnd(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

function RegistroBg() {
  const stars = useMemo(() => {
    const out: {
      left: number;
      top: number;
      sizePx: 1 | 2 | 3;
      twinkle: boolean;
      durationS: number;
      delayS: number;
      opacity: number;
    }[] = [];
    for (let i = 0; i < REGISTRO_STAR_COUNT; i++) {
      const rSize = rnd(i, 1);
      let sizePx: 1 | 2 | 3;
      if (rSize < 0.62) sizePx = 1;
      else if (rSize < 0.92) sizePx = 2;
      else sizePx = 3;
      out.push({
        left: rnd(i, 2) * 100,
        top: rnd(i, 3) * 100,
        sizePx,
        twinkle: rnd(i, 4) < 0.28,
        durationS: 2.2 + rnd(i, 6) * 2.8,
        delayS: rnd(i, 7) * 3.2,
        opacity: 0.55 + rnd(i, 9) * 0.38,
      });
    }
    return out;
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#050508]" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_100%_-10%,rgba(109,40,217,0.35),transparent_50%)]" />
      <div className="absolute -left-[18%] top-[20%] h-[min(70vmin,26rem)] w-[min(70vmin,26rem)] rounded-full bg-[#4c1d95] opacity-[0.18] blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[10%] h-[min(65vmin,24rem)] w-[min(65vmin,24rem)] rounded-full bg-[#831843] opacity-[0.14] blur-[95px]" />

      {/* Rayo de luz desde arriba (cono suave, encima de la niebla morada) */}
      <div
        className="absolute left-1/2 top-0 z-[1] h-[min(72vh,36rem)] w-[min(120vw,48rem)] max-w-none -translate-x-1/2 opacity-[0.85] sm:h-[min(68vh,40rem)] sm:w-[min(100vw,52rem)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,252,255,0.2) 0%, rgba(216,180,254,0.11) 12%, rgba(124,58,237,0.05) 32%, transparent 72%)",
          maskImage:
            "radial-gradient(ellipse 42% 100% at 50% 0%, black 0%, rgba(0,0,0,0.55) 45%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 42% 100% at 50% 0%, black 0%, rgba(0,0,0,0.55) 45%, transparent 78%)",
        }}
      />

      {/* Estrellas */}
      <div className="absolute inset-0 z-[2]">
        {stars.map((s, i) => {
          const halo =
            s.sizePx === 3
              ? {
                  boxShadow:
                    "0 0 3px 1px rgb(255 255 255 / 0.65), 0 0 8px 1px rgb(196 181 253 / 0.2)",
                }
              : undefined;
          const style: CSSProperties = {
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.sizePx,
            height: s.sizePx,
            backgroundColor: "rgba(255,255,255,0.92)",
            ...halo,
            ...(s.twinkle
              ? {
                  animation: `twinkle ${s.durationS}s ease-in-out infinite`,
                  animationDelay: `${s.delayS}s`,
                }
              : { opacity: s.opacity }),
          };
          return (
            <span
              key={i}
              className={`absolute rounded-full ${s.twinkle ? "starry-twinkle" : ""}`}
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}

function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("role");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState<string>("DO");
  const [city, setCity] = useState("");
  const [phoneNational, setPhoneNational] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [asVenueOwner, setAsVenueOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const local = searchParams?.get("local");
    const tipo = searchParams?.get("tipo");
    if (local === "1") {
      setAsVenueOwner(true);
      setPhase("form");
      return;
    }
    if (tipo === "organizador" || tipo === "local") {
      setAsVenueOwner(true);
      setPhase("form");
      return;
    }
    if (tipo === "comprador" || tipo === "cliente") {
      setAsVenueOwner(false);
      setPhase("form");
    }
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }

      const { dial, label: countryLabel } = countryMeta(countryCode);
      const digits = phoneNational.replace(/\D/g, "");
      const phone = digits.length > 0 ? `${dial}${digits}` : null;

      const data = await api<{ token: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName,
          email,
          phone,
          city: city.trim() || null,
          country: countryLabel || null,
          password,
          role: asVenueOwner ? "venue_owner" : "customer",
        }),
      });
      await setAuthToken(data.token);
      router.push(asVenueOwner ? "/dashboard" : "/mis-entradas");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const dial = countryMeta(countryCode).dial;
  const controlClass =
    "w-full rounded-md border border-white/[0.1] bg-black/30 px-2.5 py-1.5 font-sans text-[13px] text-white outline-none transition focus:border-white/18 focus:ring-1 focus:ring-[#a78bfa]/30 [color-scheme:dark]";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050508] text-white">
      <RegistroBg />

      <div className="relative z-10 mx-auto flex w-full max-w-[22rem] flex-col px-4 pb-20 pt-12 sm:max-w-[23.5rem] sm:px-0 sm:pt-14">
        <AnimatePresence mode="wait">
          {phase === "role" ? (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14, transition: { duration: 0.22 } }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-1 flex-col items-stretch"
            >
              <div className="flex justify-center">
                <LogoG size="lg" className="scale-95 sm:scale-100" />
              </div>
              <h1 className="mt-6 text-center font-sans text-xl font-bold leading-snug tracking-tight text-white sm:text-[1.35rem]">
                Selecciona tu rol para empezar
              </h1>
              <p className="mx-auto mt-2.5 max-w-[20rem] text-center font-sans text-[13px] leading-relaxed text-white/52">
                ¿Ya tienes tu marca o eventos configurados?
              </p>
              <p className="mt-1 text-center font-sans text-[13px]">
                <Link
                  href="/login"
                  className="font-semibold text-[#d8b4fe] underline decoration-[#d8b4fe]/40 underline-offset-4 hover:text-[#f5d0fe]"
                >
                  Iniciar sesión
                </Link>
              </p>

              <div className="mt-8 flex flex-1 flex-col gap-3 sm:mt-9">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.008 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => {
                    setAsVenueOwner(false);
                    setPhase("form");
                  }}
                  className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.045] p-4 text-left shadow-[0_16px_48px_-24px_rgba(0,0,0,0.72)] backdrop-blur-[18px] transition hover:border-white/18 hover:bg-white/[0.07]"
                >
                  <Flower2
                    className="pointer-events-none absolute -right-0.5 -top-0.5 h-16 w-16 rotate-12 text-white/[0.035]"
                    strokeWidth={1}
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/35 bg-orange-500/10 text-orange-300">
                      <Ticket className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.65} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-[0.95rem] font-semibold leading-snug tracking-tight text-white sm:text-base">
                        Comprar entradas o reservar mesas
                        <ArrowRight className="inline h-3.5 w-3.5 shrink-0 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/55" strokeWidth={2} />
                      </p>
                      <p className="mt-1.5 font-sans text-[12px] leading-snug text-white/48 sm:text-[13px]">
                        Para vivir la noche: entradas, mesas y tus pases en Gozalo.
                      </p>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.008 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => {
                    setAsVenueOwner(true);
                    setPhase("form");
                  }}
                  className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.045] p-4 text-left shadow-[0_16px_48px_-24px_rgba(0,0,0,0.72)] backdrop-blur-[18px] transition hover:border-white/18 hover:bg-white/[0.07]"
                >
                  <Flower2
                    className="pointer-events-none absolute -right-0.5 -top-0.5 h-16 w-16 -rotate-6 text-white/[0.035]"
                    strokeWidth={1}
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 text-rose-300">
                      <Music2 className="h-[1.35rem] w-[1.35rem]" strokeWidth={1.65} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-sans text-[0.95rem] font-semibold leading-snug tracking-tight text-white sm:text-base">
                        Organizador de eventos
                        <ArrowRight className="inline h-3.5 w-3.5 shrink-0 text-white/35 transition group-hover:translate-x-0.5 group-hover:text-white/55" strokeWidth={2} />
                      </p>
                      <p className="mt-1.5 font-sans text-[12px] leading-snug text-white/48 sm:text-[13px]">
                        Creación de eventos, estadísticas y un resumen breve pensado para el creador del local; también
                        reservas y caja para gestionar tu marca en un solo panel.
                      </p>
                    </div>
                  </div>
                </motion.button>
              </div>

              <p className="mt-auto pt-10 text-center font-sans text-[10px] text-white/32 sm:pt-12">
                © {new Date().getFullYear()} Gozalo Dominicana. Todos los derechos reservados.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-stretch"
            >
              <form
                onSubmit={onSubmit}
                className="relative mx-auto mt-0 w-full max-w-[20rem] rounded-xl border border-white/[0.07] bg-white/[0.03] p-4 shadow-[0_20px_50px_-28px_rgba(0,0,0,0.85)] backdrop-blur-[10px] sm:max-w-[21rem] sm:p-5"
              >
                <div className="flex justify-center">
                  <LogoG size="lg" className="scale-90 sm:scale-95" />
                </div>

                <h2 className="mt-3 text-center font-sans text-[15px] font-medium leading-snug text-white sm:text-base">
                  Crea tu cuenta en Gozalo
                </h2>
                <p className="mt-1.5 text-center font-sans text-[12px] leading-snug text-white/55">
                  ¿Ya tienes cuenta?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-[#d8b4fe] underline decoration-[#d8b4fe]/35 underline-offset-2 transition hover:text-[#f5d0fe] hover:underline"
                  >
                    Iniciar sesión
                  </Link>
                </p>

                {error && (
                  <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-[12px] leading-snug text-red-100/95">
                    {error}
                  </p>
                )}

                {/* Misma jerarquía de datos (título + acceso + bloque de campos); tema oscuro */}
                <div className="mt-4 rounded-lg border border-white/[0.08] bg-white/[0.035] p-3 sm:p-3.5">
                  <div className="flex flex-col gap-2.5">
                    <div>
                      <label htmlFor="reg-fullname" className="mb-0.5 block font-sans text-[11px] font-semibold text-white/85">
                        Nombre completo
                      </label>
                      <input
                        id="reg-fullname"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        placeholder="Nombre"
                        className={`${controlClass} placeholder:text-white/35`}
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-email" className="mb-0.5 block font-sans text-[11px] font-semibold text-white/85">
                        Correo electrónico
                      </label>
                      <input
                        id="reg-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="correo@ejemplo.com"
                        className={`${controlClass} placeholder:text-white/35`}
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-country" className="mb-0.5 block font-sans text-[11px] font-semibold text-white/85">
                        País
                      </label>
                      <select
                        id="reg-country"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        autoComplete="country"
                        className={`${controlClass} cursor-pointer`}
                      >
                        {REGISTRY_COUNTRIES.map((c) => (
                          <option key={c.value} value={c.value} className="bg-[#12121a] text-white">
                            {c.label} ({c.dial})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="reg-city" className="mb-0.5 block font-sans text-[11px] font-semibold text-white/85">
                        Ciudad
                      </label>
                      <input
                        id="reg-city"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        autoComplete="address-level2"
                        placeholder="Ej. Santiago"
                        className={`${controlClass} placeholder:text-white/35`}
                      />
                    </div>

                    <div>
                      <span className="mb-0.5 block font-sans text-[11px] font-semibold text-white/85">Teléfono</span>
                      <div className="flex gap-2">
                        <div
                          className="flex shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-black/40 px-2.5 py-1.5 font-sans text-[13px] font-medium tabular-nums text-white/90"
                          aria-hidden
                        >
                          {dial}
                        </div>
                        <input
                          id="reg-phone-national"
                          type="tel"
                          required
                          value={phoneNational}
                          onChange={(e) => setPhoneNational(e.target.value)}
                          autoComplete="tel-national"
                          inputMode="numeric"
                          placeholder="809 555 1234"
                          minLength={7}
                          className={`min-w-0 flex-1 ${controlClass} placeholder:text-white/35`}
                          aria-label="Número de teléfono sin prefijo"
                        />
                      </div>
                      <p className="mt-0.5 font-sans text-[10px] text-white/38">El prefijo se añade según el país elegido.</p>
                    </div>

                    <div>
                      <label htmlFor="reg-password" className="mb-0.5 block font-sans text-[11px] font-semibold text-white/85">
                        Contraseña
                      </label>
                      <input
                        id="reg-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                        className={`${controlClass} placeholder:text-white/35`}
                      />
                    </div>

                    <div>
                      <label htmlFor="reg-password-confirm" className="mb-0.5 block font-sans text-[11px] font-semibold text-white/85">
                        Confirmar contraseña
                      </label>
                      <input
                        id="reg-password-confirm"
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Repite la contraseña"
                        className={`${controlClass} placeholder:text-white/35`}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full rounded-md bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#db2777] py-2.5 font-sans text-[13px] font-semibold text-white shadow-[0_10px_28px_-12px_rgba(124,58,237,0.4)] transition hover:brightness-[1.05] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Creando…" : "Crear cuenta"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function RegistroPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#050508] font-sans text-sm text-white/40">
          Cargando…
        </div>
      }
    >
      <RegistroForm />
    </Suspense>
  );
}
