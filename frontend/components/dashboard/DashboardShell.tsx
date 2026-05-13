"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CreateVenueOnboarding } from "./CreateVenueOnboarding";
import { AdminVenuePicker } from "./AdminVenuePicker";
import { DashboardMobileHeader } from "./DashboardMobileHeader";
import { VenuePendingApprovalScreen } from "./VenuePendingApprovalScreen";
import { useDashboard } from "@/contexts/DashboardContext";

function VenueLifecycleBanner({
  venue,
  isAdminViewer,
}: {
  venue: { id: string; status?: string };
  isAdminViewer: boolean;
}) {
  const [hideApprovedNotice, setHideApprovedNotice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !venue?.id) return;
    setHideApprovedNotice(
      localStorage.getItem(`gozalo_venue_approved_banner_${venue.id}`) === "1"
    );
  }, [venue?.id]);

  if (isAdminViewer) return null;

  const st = venue.status;
  if (st === "approved" && !hideApprovedNotice) {
    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
        <span>
          🎉 ¡Tu local ha sido aprobado! Ya puedes crear tu primer evento.
        </span>
        <button
          type="button"
          className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white hover:bg-white/10"
          onClick={() => {
            if (typeof window !== "undefined" && venue.id) {
              localStorage.setItem(`gozalo_venue_approved_banner_${venue.id}`, "1");
            }
            setHideApprovedNotice(true);
          }}
        >
          Entendido
        </button>
      </div>
    );
  }
  return null;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { venue, needsVenue, needsVenuePick, loading, error, isAdminViewer, clearVenueSelection, refresh } =
    useDashboard();
  const [open, setOpen] = useState(false);
  const [approvalCheckLoading, setApprovalCheckLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] text-[#6B7280]">
        Cargando panel…
      </div>
    );
  }

  if (needsVenue && !venue) {
    return <CreateVenueOnboarding />;
  }

  if (needsVenuePick && !venue) {
    return <AdminVenuePicker />;
  }

  if (error || !venue) {
    const isForbidden = error === "No autorizado";
    const notFound = error === "Local no encontrado";
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0A0A0F] px-4 text-center">
        <p className="max-w-md text-[#EF4444]">
          {isForbidden
            ? "El panel del local es solo para cuentas de dueño o administración. Regístrate marcando «Soy dueño/a de un local» o pide a un admin que cambie tu rol a dueño de local."
            : error || "No se encontró un local asociado a tu cuenta."}
        </p>
        {notFound && (
          <button
            type="button"
            onClick={() => void clearVenueSelection()}
            className="text-sm text-[#3B82F6] underline"
          >
            Elegir otro local (admin)
          </button>
        )}
        <a href="/registro" className="text-[#3B82F6] underline">
          Crear cuenta como dueño
        </a>
        <a href="/login?next=/dashboard" className="text-[#3B82F6] underline">
          Iniciar sesión
        </a>
        <a href="/" className="text-[#6B7280]">
          Volver al inicio
        </a>
      </div>
    );
  }

  const st = venue.status;
  const ownerBlocked =
    !isAdminViewer && (st === "pending" || st === "rejected" || st === "suspended");

  if (ownerBlocked) {
    return (
      <VenuePendingApprovalScreen
        venueName={venue.name}
        status={st as "pending" | "rejected" | "suspended"}
        refreshing={approvalCheckLoading}
        onRefresh={async () => {
          setApprovalCheckLoading(true);
          try {
            await refresh();
          } finally {
            setApprovalCheckLoading(false);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] font-sans text-[#F9FAFB] antialiased">
      <DashboardMobileHeader venueName={venue.name} onOpenSidebar={() => setOpen(true)} />

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/70 md:hidden"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="absolute right-3 top-16 w-48 rounded-2xl border border-white/[0.08] bg-[#15151F] p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {isAdminViewer ? (
              <button
                type="button"
                onClick={() => {
                  void clearVenueSelection();
                  setOpen(false);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
              >
                Cambiar local
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-white/[0.06]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="h-14 shrink-0 md:hidden" aria-hidden />
      <main className="min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-0 md:max-w-none">
          <VenueLifecycleBanner venue={venue} isAdminViewer={isAdminViewer} />
          {children}
        </div>
      </main>
    </div>
  );
}
