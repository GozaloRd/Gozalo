import Link from "next/link";

/**
 * Avatar del local en header móvil: G en círculo 40px con aro cónico animado + glow (solo se usa en header lg:hidden).
 */
export function DashboardLocalLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`group relative flex h-10 w-10 shrink-0 items-center justify-center motion-safe:transition motion-safe:duration-150 motion-safe:active:scale-[0.97] ${className ?? ""}`}
      aria-label="Gozalo — inicio"
    >
      <span
        className="absolute inset-0 motion-safe:animate-[spin_3s_linear_infinite] motion-reduce:animate-none rounded-full will-change-transform"
        style={{
          background: "conic-gradient(from 0deg, rgb(249, 115, 22), rgb(236, 72, 153), rgb(168, 85, 247), rgb(249, 115, 22))",
        }}
        aria-hidden
      />
      <span
        className="absolute inset-[2px] flex items-center justify-center rounded-full bg-[#0A0A0F] shadow-[0_0_20px_rgba(168,85,247,0.35)]"
        aria-hidden
      />
      <span
        className="relative z-[1] font-black leading-none tracking-tight text-white drop-shadow-sm"
        style={{ fontSize: "1.125rem" }}
      >
        G
      </span>
    </Link>
  );
}
