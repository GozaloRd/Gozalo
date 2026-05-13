"use client";

import { AnimatePresence, motion } from "framer-motion";
import useSWR from "swr";
import { X } from "lucide-react";
import Link from "next/link";
import { fetchOpsAlerts, type OpsAlert } from "@/lib/alertsApi";

function severityStyles(s: OpsAlert["severity"]) {
  if (s === "danger") return "border-rose-500/35 bg-rose-500/10 text-rose-100";
  if (s === "warn") return "border-amber-500/35 bg-amber-500/10 text-amber-100";
  return "border-sky-500/30 bg-sky-500/10 text-sky-100";
}

export function DesktopNotificationsDrawer({
  open,
  onClose,
  venueId,
}: {
  open: boolean;
  onClose: () => void;
  venueId: string;
}) {
  const { data, error, isLoading } = useSWR(
    open && venueId ? (["ops-alerts-drawer", venueId] as const) : null,
    () => fetchOpsAlerts(venueId),
    { revalidateOnFocus: true }
  );

  const alerts = data?.data ?? [];

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="notif-drawer"
          className="fixed inset-0 z-[60] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            className="pointer-events-auto absolute inset-0 bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="desktop-notif-title"
            className="pointer-events-auto absolute right-0 top-0 z-[10] flex h-full w-full max-w-[360px] flex-col border-l border-white/[0.08] bg-[#0D0D14]/98 shadow-2xl backdrop-blur-md"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
              <h2 id="desktop-notif-title" className="text-sm font-semibold text-white">
                Alertas operativas
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
              {isLoading ? (
                <div className="space-y-3" aria-busy>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse rounded-xl border border-white/[0.06] bg-zinc-900/60"
                    />
                  ))}
                </div>
              ) : error ? (
                <p className="text-sm text-rose-300">No se pudieron cargar las alertas.</p>
              ) : alerts.length === 0 ? (
                <p className="text-sm text-zinc-400">No hay alertas pendientes.</p>
              ) : (
                <ul className="space-y-3">
                  {alerts.map((a) => {
                    const inner = (
                      <div
                        className={`rounded-xl border p-3 text-left ${severityStyles(a.severity)}`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
                          {a.title}
                        </p>
                        <p className="mt-1 text-sm text-white/90">{a.detail}</p>
                      </div>
                    );
                    return (
                      <li key={a.id}>
                        {a.href ? (
                          <Link
                            href={a.href}
                            className="block transition hover:opacity-95"
                            onClick={onClose}
                          >
                            {inner}
                          </Link>
                        ) : (
                          inner
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
