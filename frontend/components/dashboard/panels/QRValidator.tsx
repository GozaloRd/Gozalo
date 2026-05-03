"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, XCircle } from "lucide-react";

type Props = {
  /** Ancho máximo del visor (px). */
  maxWidth?: number;
};

export function QRValidator({ maxWidth = 280 }: Props) {
  const regionId = useId().replace(/:/g, "");
  const readerId = `qr-reader-${regionId}`;
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [last, setLast] = useState<{ ok: boolean; text: string } | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const stop = useCallback(async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        await s.stop();
      } catch {
        /* ignore */
      }
    }
    setRunning(false);
  }, []);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  const start = useCallback(async () => {
    if (running || starting) return;
    setStarting(true);
    setLast(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5 = new Html5Qrcode(readerId);
      scannerRef.current = {
        stop: async () => {
          await html5.stop();
          await html5.clear();
        },
      };
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          setLast({ ok: true, text: decoded });
          void stop();
        },
        () => {
          /* frame without qr */
        }
      );
      setRunning(true);
    } catch {
      setLast({ ok: false, text: "No se pudo abrir la cámara." });
      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  }, [readerId, running, starting, stop]);

  return (
    <div className="space-y-3">
      <div
        className="relative mx-auto overflow-hidden rounded-xl border border-white/[0.1] bg-black/40"
        style={{ maxWidth }}
      >
        <div id={readerId} className="min-h-[200px] w-full" />
        {!running && !starting ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 p-4 text-center">
            <CameraOff className="h-8 w-8 text-slate-500" aria-hidden />
            <p className="text-xs text-slate-400">Cámara detenida</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {!running ? (
          <button
            type="button"
            onClick={() => void start()}
            disabled={starting}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2979FF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden />
            {starting ? "Iniciando…" : "Iniciar cámara"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stop()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            <CameraOff className="h-4 w-4" aria-hidden />
            Detener
          </button>
        )}
      </div>

      {last ? (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
            last.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
              : "border-rose-500/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {last.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
          )}
          <span className="min-w-0 break-all">{last.ok ? last.text : last.text}</span>
        </div>
      ) : null}
    </div>
  );
}
