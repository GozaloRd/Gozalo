"use client";

/**
 * Separador sutil entre la fila superior del header móvil y los accesos circulares.
 * Solo móvil (el padre lo oculta en desktop si aplica).
 */
export function HeaderDivider({ className = "" }: { className?: string }) {
  return (
    <div
      role="presentation"
      className={`h-px w-full bg-gradient-to-r from-transparent via-white/[0.1] to-transparent ${className}`}
      aria-hidden
    />
  );
}
