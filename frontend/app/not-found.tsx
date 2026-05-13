import Link from "next/link";

/** Convención App Router: evita estados inconsistentes del runtime cuando no hay ruta (404). */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[#0a0a0f] px-4 py-16 text-center text-zinc-100">
      <h1 className="text-lg font-semibold">No encontramos esta página</h1>
      <p className="max-w-md text-sm text-zinc-400">La dirección puede haber cambiado o el enlace no es válido.</p>
      <Link
        href="/"
        className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
