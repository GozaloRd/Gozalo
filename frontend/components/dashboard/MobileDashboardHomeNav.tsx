"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

/** Misma línea visual que la referencia: calendario (eventos), carné/teal (→ tickets), morado (stats), naranja (mesas). */
const PILLS: {
  href: string;
  label: string;
  emoji: string;
  idleClass: string;
}[] = [
  {
    href: "/dashboard/eventos",
    label: "Eventos",
    emoji: "📅",
    idleClass:
      "border-amber-500/45 bg-gradient-to-br from-amber-500/15 to-orange-600/10 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  },
  {
    href: "/dashboard/estadisticas",
    label: "Estadísticas",
    emoji: "📊",
    idleClass:
      "border-purple-500/45 bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 text-fuchsia-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  },
  {
    href: "/dashboard/tickets",
    label: "Tickets",
    emoji: "🎫",
    idleClass:
      "border-teal-500/50 bg-gradient-to-br from-teal-500/20 to-cyan-600/10 text-teal-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  },
  {
    href: "/dashboard/mesas",
    label: "Mesas",
    emoji: "🪑",
    idleClass:
      "border-orange-500/45 bg-gradient-to-br from-orange-500/18 to-amber-600/10 text-orange-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
  },
];

export function MobileDashboardHomeNav() {
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");

  const { pastTabActive, upcomingTabActive } = useMemo(() => {
    const isEvents = path.startsWith("/dashboard/eventos");
    const tab = searchParams.get("tab");
    // En inicio del panel: misma lectura que la captura (vacío / pasados)
    if (path === "/dashboard") {
      return { pastTabActive: true, upcomingTabActive: false };
    }
    if (!isEvents) {
      return { pastTabActive: false, upcomingTabActive: false };
    }
    if (tab === "past") {
      return { pastTabActive: true, upcomingTabActive: false };
    }
    return { pastTabActive: false, upcomingTabActive: true };
  }, [path, searchParams]);

  const submitSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const t = q.trim();
      if (!t) {
        router.push("/dashboard/eventos");
        return;
      }
      router.push(`/dashboard/eventos?q=${encodeURIComponent(t)}`);
    },
    [q, router]
  );

  return (
    <section className="mx-auto hidden w-full max-w-md space-y-5 md:block lg:hidden" aria-label="Accesos rápidos del panel">
      {/* Cuatro iconos: rejilla simétrica (misma anchura por columna que la referencia) */}
      <div className="grid w-full grid-cols-4 place-items-center gap-3 px-0 sm:px-1">
        {PILLS.map((p) => {
          const active =
            p.href === "/dashboard/eventos"
              ? path === "/dashboard" || path.startsWith("/dashboard/eventos")
              : path === p.href || path.startsWith(`${p.href}/`);
          return (
            <Link
              key={p.href}
              href={p.href}
              aria-label={p.label}
              title={p.label}
              className={`flex size-[54px] items-center justify-center rounded-full border text-sm font-semibold transition ${
                active
                  ? "border-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-[#FF6B35] text-white shadow-[0_8px_22px_rgba(251,146,60,0.45)] ring-2 ring-amber-400/40"
                  : `${p.idleClass} hover:brightness-110`
              }`}
            >
              <span className="text-[1.65rem] leading-none">{p.emoji}</span>
            </Link>
          );
        })}
      </div>

      {/* Novedades — misma lectura en fila: chip izq. + texto + flecha */}
      <Link
        href="/"
        className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-[#1a1a1f] px-4 py-3.5 text-sm transition hover:bg-[#222228]"
      >
        <span className="inline-flex min-w-0 flex-1 items-center gap-2.5">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#2979FF]/25 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
            <span className="text-xs leading-none" aria-hidden>
              🎁
            </span>
            Novedades
          </span>
          <span className="truncate text-[13px] font-medium text-slate-300">Qué hay de nuevo en Gozalo</span>
        </span>
        <span aria-hidden className="shrink-0 text-lg text-[#60A5FA]">
          →
        </span>
      </Link>

      {/* Crear evento ancho + botón cuadrado (como la captura) */}
      <div className="flex w-full items-stretch gap-2.5">
        <Link
          href="/dashboard/eventos"
          className="flex min-h-[52px] min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2979FF] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(41,121,255,0.45)] transition hover:bg-[#1e6bef]"
        >
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="4" y="5" width="16" height="16" rx="2" strokeLinecap="round" />
            <path strokeLinecap="round" d="M12 9v6m-3-3h6" />
          </svg>
          Crear evento
        </Link>
        <Link
          href="/dashboard/configuracion"
          className="flex aspect-square h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#1a1a1f] text-slate-400 transition hover:border-white/15 hover:text-white"
          aria-label="Más opciones"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="6" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="18" r="1.75" />
          </svg>
        </Link>
      </div>

      {/* Pestañas simétricas (misma proporción 50/50 que la referencia) */}
      <div className="flex w-full border-b border-white/[0.08]">
        <Link
          href="/dashboard/eventos?tab=past"
          className={`flex-1 pb-3 pt-1 text-center text-[13px] transition ${
            pastTabActive
              ? "border-b-2 border-[#2979FF] font-semibold text-white"
              : "border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-300"
          }`}
        >
          Eventos pasados
        </Link>
        <Link
          href="/dashboard/eventos?tab=published"
          className={`flex-1 pb-3 pt-1 text-center text-[13px] transition ${
            upcomingTabActive
              ? "border-b-2 border-[#2979FF] font-semibold text-white"
              : "border-b-2 border-transparent font-medium text-slate-500 hover:text-slate-300"
          }`}
        >
          Próximos eventos
        </Link>
      </div>

      <form onSubmit={submitSearch} className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7280]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar"
          className="w-full rounded-[1.35rem] border border-white/[0.08] bg-[#1a1a1f] py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-[#6B7280] focus:border-[#2979FF]/45 focus:outline-none focus:ring-2 focus:ring-[#2979FF]/25"
          autoComplete="off"
        />
      </form>
    </section>
  );
}
