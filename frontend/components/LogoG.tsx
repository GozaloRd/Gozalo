"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type LogoGProps = {
  /** Ej. cerrar drawer móvil al ir al inicio */
  onNavigate?: () => void;
  className?: string;
  /** Variante con tamaño menor para cabeceras compactas del dashboard */
  size?: "sm" | "md";
};

export default function LogoG({ onNavigate, className, size = "md" }: LogoGProps) {
  const pathname = usePathname();

  const textSize = size === "sm" ? "text-lg" : "text-xl md:text-2xl";
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <Link
      href="/"
      aria-label="Gozalo — inicio"
      className={`group inline-flex items-center gap-2 outline-none ${className ?? ""}`}
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        onNavigate?.();
      }}
    >
      <span className={`relative font-black tracking-tight ${textSize}`}>
        <span className="text-[#9B7FCA] transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_18px_rgba(155,127,202,0.65)]">
          G
        </span>
        <span className="text-white transition-[text-shadow] duration-300 group-hover:[text-shadow:0_0_14px_rgba(155,127,202,0.35)]">
          OZALO
        </span>
      </span>
      <span
        className={`relative inline-block ${dotSize} rounded-full bg-[#9B7FCA] shadow-[0_0_10px_rgba(155,127,202,0.7)]`}
      >
        <span className="absolute inset-0 rounded-full bg-[#9B7FCA] opacity-70 animate-[logoDotPulse_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite]" />
      </span>
      <style jsx>{`
        @keyframes logoDotPulse {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(2.6);
            opacity: 0;
          }
        }
      `}</style>
    </Link>
  );
}
