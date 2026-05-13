"use client";

import Link from "next/link";

/**
 * Límite de error del segmento raíz (excluye fallos en el propio `layout.tsx` raíz).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#0a0a0f] px-4 py-16 text-center">
      <h2 className="text-lg font-semibold text-zinc-100">Algo salió mal</h2>
      {process.env.NODE_ENV === "development" && error?.message ? (
        <p className="max-w-lg text-sm text-red-300/90">{error.message}</p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
