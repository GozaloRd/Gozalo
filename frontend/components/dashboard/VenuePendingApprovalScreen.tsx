"use client";

import LogoG from "@/components/LogoG";

const GOZALO_APPROVAL_EMAIL = "gozalonightlife.rd@gmail.com";

type Props = {
  venueName: string;
  status: "pending" | "rejected" | "suspended";
  onRefresh: () => void;
  refreshing?: boolean;
};

export function VenuePendingApprovalScreen({ venueName, status, onRefresh, refreshing }: Props) {
  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const isSuspended = status === "suspended";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#06060b] px-4 py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(123,44,191,0.35)_0%,_transparent_55%),radial-gradient(ellipse_at_bottom,_rgba(41,121,255,0.2)_0%,_transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/4 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#7B2CBF]/20 blur-[100px]"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <LogoG href="/dashboard" />
        <div className="mt-10 w-full rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#15121F]/95 to-[#0d0d14]/95 p-8 shadow-[0_0_80px_rgba(123,44,191,0.15)] backdrop-blur-md md:p-10">
          <div
            className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border ${
              isPending
                ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                : isRejected
                  ? "border-red-400/40 bg-red-500/15 text-red-200"
                  : "border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200"
            }`}
          >
            {isPending ? (
              <span className="text-2xl" aria-hidden>
                ⏳
              </span>
            ) : isRejected ? (
              <span className="text-2xl" aria-hidden>
                ✕
              </span>
            ) : (
              <span className="text-2xl" aria-hidden>
                ⏸
              </span>
            )}
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9B7FCA]/90">
            {isPending ? "Revisión en curso" : isRejected ? "Solicitud no aprobada" : "Local suspendido"}
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
            {venueName}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            {isPending && (
              <>
                Hemos recibido los datos de tu local. El equipo de Gózalo revisará tu solicitud para asegurar que todo
                cumpla con nuestras normas y que la comunidad siga disfrutando de espacios seguros y de calidad.
              </>
            )}
            {isRejected && (
              <>
                En este momento tu local no puede operar en la plataforma. Si crees que hubo un error o quieres enviar
                más información, escríbenos y lo revisamos contigo.
              </>
            )}
            {isSuspended && (
              <>
                Tu local está suspendido temporalmente. Para reactivarlo o aclarar la situación, contacta al equipo de
                Gózalo con el correo de abajo.
              </>
            )}
          </p>

          <div className="mt-8 rounded-2xl border border-[#2979FF]/25 bg-[#2979FF]/10 px-5 py-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#93C5FD]">Siguiente paso</p>
            <p className="mt-2 text-sm text-slate-200">
              Escribe a{" "}
              <a
                href={`mailto:${GOZALO_APPROVAL_EMAIL}?subject=Aprobación%20de%20local%20-%20${encodeURIComponent(venueName)}`}
                className="font-semibold text-[#7CB0FF] underline decoration-[#7CB0FF]/50 underline-offset-2 hover:text-[#93C5FD]"
              >
                {GOZALO_APPROVAL_EMAIL}
              </a>{" "}
              para que tu local sea aprobado o para cualquier duda sobre el proceso.
            </p>
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Cuando tu local quede aprobado, este mismo acceso te llevará directo a tu panel para crear eventos, mesas y
            más.
          </p>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => onRefresh()}
            className="mt-8 w-full rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white transition hover:border-[#C77DFF]/40 hover:bg-[#C77DFF]/10 disabled:opacity-50"
          >
            {refreshing ? "Comprobando…" : "Ya me aprobaron — actualizar"}
          </button>
        </div>
      </div>
    </div>
  );
}
