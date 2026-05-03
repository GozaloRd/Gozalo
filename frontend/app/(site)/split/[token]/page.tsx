"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getSplitByToken, payMyShare, type SplitPayment } from "@/lib/splitApi";
import { getToken } from "@/lib/api";

function formatMoney(n: number | string) {
  return `RD$ ${Number(n).toLocaleString("es-DO", { minimumFractionDigits: 0 })}`;
}

export default function SplitPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [split, setSplit] = useState<SplitPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const authed = !!getToken();

  useEffect(() => {
    getSplitByToken(token)
      .then(setSplit)
      .catch((e) => setError((e as Error)?.message ?? "No encontrado"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handlePay() {
    if (!authed) {
      router.push(`/login?next=/split/${token}`);
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const res = await payMyShare(token);
      setPaid(true);
      if (res.allPaid) {
        setTimeout(() => router.push("/mis-entradas"), 1800);
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Error pagando");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Cargando…
      </div>
    );
  }

  if (error && !split) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-rose-300">{error}</p>
        <Link href="/" className="text-sm text-[#C77DFF] underline">Volver al inicio</Link>
      </div>
    );
  }

  if (!split) return null;

  const paidCount = split.participants?.filter((p) => p.status === "paid").length ?? 0;
  const totalParts = split.parts;
  const progress = Math.round((paidCount / totalParts) * 100);
  const isComplete = split.status === "complete";
  const isCancelled = split.status === "cancelled";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0A0A1A] via-[#120822] to-[#0A0A1A] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12121c]/80 p-6 shadow-2xl backdrop-blur">

        {/* Header */}
        <div className="flex items-center gap-3">
          {split.event?.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={split.event.coverImageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
          )}
          <div>
            <p className="text-xs text-[#C77DFF] font-semibold uppercase tracking-wide">Pago compartido</p>
            <h1 className="font-bold text-white">{split.event?.title ?? "Evento"}</h1>
            {split.event && (
              <p className="text-xs text-slate-400">
                {new Date(split.event.startAt).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long" })}
              </p>
            )}
          </div>
        </div>

        {/* Importe */}
        <div className="mt-5 rounded-xl border border-[#C77DFF]/30 bg-[#C77DFF]/5 p-4 text-center">
          <p className="text-xs text-slate-400">Tu parte</p>
          <p className="mt-1 text-4xl font-black text-white">{formatMoney(split.shareAmount)}</p>
          <p className="mt-1 text-xs text-slate-500">
            de {formatMoney(split.totalAmount)} total · {totalParts} personas
          </p>
        </div>

        {/* Progreso */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Progreso</span>
            <span>{paidCount}/{totalParts} pagado{paidCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] to-[#C77DFF] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Participantes */}
        {split.participants && split.participants.length > 0 && (
          <div className="mt-4 space-y-1">
            {split.participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
                <span className="text-slate-300">{p.user?.fullName ?? p.nickname ?? "Amigo"}</span>
                <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                  p.status === "paid"
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/30 bg-amber-500/10 text-amber-300"
                }`}>
                  {p.status === "paid" ? "✓ Pagado" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Acción */}
        <div className="mt-5">
          {paid ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-emerald-200">
              ✓ ¡Tu parte está pagada!
            </div>
          ) : isComplete ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-200">
              ✓ Este split ya está completo. ¡Todo pagado!
            </div>
          ) : isCancelled ? (
            <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-200">
              Este split fue cancelado o caducó.
            </div>
          ) : (
            <>
              {error && <p className="mb-3 text-xs text-rose-300">{error}</p>}
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] py-3 text-sm font-black text-white hover:border-[#E0AAFF]/70 disabled:opacity-60"
              >
                {paying ? "Procesando…" : `Pagar mi parte · ${formatMoney(split.shareAmount)}`}
              </button>
              {!authed && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  Necesitas{" "}
                  <Link href={`/login?next=/split/${token}`} className="text-[#C77DFF] underline">iniciar sesión</Link>
                  {" "}para pagar.
                </p>
              )}
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-600">
          Organizado por {split.organizer?.fullName ?? "un amigo"} · Powered by Gózalo
        </p>
      </div>
    </div>
  );
}
