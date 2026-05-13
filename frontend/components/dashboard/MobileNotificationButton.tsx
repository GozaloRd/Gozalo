"use client";

/**
 * Campanilla del header: punto rojo con pulso cuando hay alertCount > 0.
 * Opcional `onClick` para abrir el panel de alertas en desktop.
 */
export function MobileNotificationButton({
  alertCount,
  onClick,
}: {
  alertCount: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg p-2 text-[#6B7280] transition duration-150 hover:bg-white/[0.05] hover:text-[#9CA3AF] active:scale-[0.97] motion-safe:active:scale-[0.97]"
      aria-label={alertCount > 0 ? `Alertas operativas (${alertCount})` : "Notificaciones"}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {alertCount > 0 ? (
        <span className="gozalo-notification-dot-pulse absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EF4444]/95 ring-2 ring-[#0A0A0F]" />
      ) : null}
    </button>
  );
}
