"use client";

/**
 * Captura errores en el `layout.tsx` raíz. Debe definir `<html>` y `<body>`.
 * Sin este archivo, el dev server puede mostrar “missing required error components”.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0a0f] font-sans text-zinc-100 antialiased" suppressHydrationWarning>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-lg font-semibold">Error en la aplicación</h2>
          {process.env.NODE_ENV === "development" && error?.message ? (
            <p className="max-w-lg text-sm text-red-300/90">{error.message}</p>
          ) : null}
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium transition hover:bg-white/15"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
