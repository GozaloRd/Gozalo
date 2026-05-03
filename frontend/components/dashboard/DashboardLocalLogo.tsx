import Link from "next/link";

/**
 * Marca compacta para cabecera móvil del panel del local (gradiente + G).
 */
export function DashboardLocalLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/dashboard"
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#2979FF] via-[#5B7AEA] to-[#9B7FCA] shadow-[0_10px_28px_rgba(41,121,255,0.38)] ring-1 ring-white/15 transition hover:brightness-110 ${className ?? ""}`}
      aria-label="Gozalo — panel del local"
    >
      <span
        className="font-black leading-none tracking-tight text-white drop-shadow-md"
        style={{ fontSize: "1.125rem" }}
      >
        G
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-2 right-0 h-10 w-10 rounded-full bg-white/15 blur-xl"
      />
    </Link>
  );
}
