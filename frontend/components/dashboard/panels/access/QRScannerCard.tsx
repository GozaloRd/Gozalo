"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Camera, CameraOff, User } from "lucide-react";
import { scanAccess } from "@/lib/dashboardApi";
import { enqueuePendingScan } from "@/services/offline-tickets.service";
import { ManualValidationModal } from "@/components/dashboard/panels/access/ManualValidationModal";
import { ConnectionBadge } from "@/components/dashboard/panels/access/ConnectionBadge";

type FrameTone = "none" | "ok" | "err" | "warn" | "queue";

function playBeep(kind: "ok" | "bad") {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = kind === "ok" ? 920 : 200;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.1);
  } catch {
    /* sin audio */
  }
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(pattern);
  }
}

export type QRScannerCardProps = {
  maxWidth?: number;
  venueId: string | null;
  eventId: string;
  onValidated?: () => void;
  syncing?: boolean;
};

export function QRScannerCard({
  maxWidth = 320,
  venueId,
  eventId,
  onValidated,
  syncing = false,
}: QRScannerCardProps) {
  const regionId = useId().replace(/:/g, "");
  const readerId = `qr-reader-${regionId}`;
  const [running, setRunning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [frameTone, setFrameTone] = useState<FrameTone>("none");
  const lastPayloadRef = useRef<string>("");
  const lastAtRef = useRef<number>(0);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const busyRef = useRef(false);

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

  useEffect(() => {
    if (frameTone === "none") return;
    const t = window.setTimeout(() => setFrameTone("none"), 1200);
    return () => window.clearTimeout(t);
  }, [frameTone]);

  const onDecode = useCallback(
    async (payload: string) => {
      const now = Date.now();
      if (payload === lastPayloadRef.current && now - lastAtRef.current < 2500) {
        return;
      }
      lastPayloadRef.current = payload;
      lastAtRef.current = now;
      if (!eventId || !venueId) {
        setHint("Selecciona un evento activo para validar.");
        setFrameTone("err");
        playBeep("bad");
        vibrate([60, 40, 60]);
        return;
      }
      if (busyRef.current) return;
      busyRef.current = true;
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      if (offline) {
        await enqueuePendingScan({
          id: crypto.randomUUID(),
          payload,
          eventId,
          venueId,
          createdAt: Date.now(),
        });
        setHint("Sin red: validación en cola para sincronizar.");
        setFrameTone("queue");
        vibrate(40);
        busyRef.current = false;
        return;
      }
      try {
        const res = (await scanAccess(payload, eventId, venueId)) as {
          success?: boolean;
          message?: string;
        };
        const ok = res.success !== false;
        if (ok) {
          setFrameTone("ok");
          playBeep("ok");
          vibrate(25);
          setHint(res.message ?? "Entrada válida.");
          onValidated?.();
        } else {
          setFrameTone("warn");
          playBeep("bad");
          vibrate([50, 30, 50]);
          setHint(res.message ?? "Revisa el código.");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al validar";
        const network =
          e instanceof TypeError || /conectar|fetch|tardó|Network|red/i.test(msg);
        if (network && venueId && eventId) {
          try {
            await enqueuePendingScan({
              id: crypto.randomUUID(),
              payload,
              eventId,
              venueId,
              createdAt: Date.now(),
            });
            setHint("Sin conexión: validación en cola para sincronizar.");
            setFrameTone("queue");
            vibrate(40);
          } catch {
            setFrameTone("err");
            setHint(msg);
            playBeep("bad");
            vibrate([60, 30, 60]);
          }
          busyRef.current = false;
          return;
        }
        const duplicate = /ya utilizada|ya validado|utilizada/i.test(msg);
        setFrameTone(duplicate ? "err" : "warn");
        playBeep("bad");
        vibrate([70, 40, 70]);
        setHint(msg);
      } finally {
        busyRef.current = false;
      }
    },
    [eventId, venueId, onValidated]
  );

  const start = useCallback(async () => {
    if (running || starting) return;
    setStarting(true);
    setHint(null);
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
          void onDecode(decoded);
        },
        () => {
          /* sin QR en frame */
        }
      );
      setRunning(true);
    } catch {
      setHint("No se pudo abrir la cámara.");
      setFrameTone("err");
      scannerRef.current = null;
    } finally {
      setStarting(false);
    }
  }, [readerId, running, starting, onDecode]);

  const borderClass =
    frameTone === "ok"
      ? "border-emerald-500/90 shadow-[0_0_0_2px_rgba(16,185,129,0.45)]"
      : frameTone === "err"
        ? "border-rose-500/90 shadow-[0_0_0_2px_rgba(244,63,94,0.45)]"
        : frameTone === "warn" || frameTone === "queue"
          ? "border-amber-400/90 shadow-[0_0_0_2px_rgba(251,191,36,0.4)]"
          : "border-white/[0.1]";

  return (
    <div className="space-y-3">
      <ConnectionBadge syncing={syncing} />

      <div
        className={`relative mx-auto overflow-hidden rounded-xl border bg-black/40 transition-[border-color,box-shadow] duration-200 ${borderClass}`}
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

      <div className="flex flex-wrap items-center justify-center gap-2">
        {!running ? (
          <button
            type="button"
            onClick={() => void start()}
            disabled={starting}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#2979FF] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Camera className="h-4 w-4" aria-hidden />
            {starting ? "Iniciando…" : "Iniciar cámara"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void stop()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            <CameraOff className="h-4 w-4" aria-hidden />
            Pausar cámara
          </button>
        )}
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-blue-500/35 bg-blue-500/10 px-3 py-2.5 text-sm font-semibold text-blue-200"
        >
          <User className="h-4 w-4 shrink-0" aria-hidden />
          Validación manual
        </button>
      </div>

      {hint ? (
        <p className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-2 text-center text-xs text-slate-200">{hint}</p>
      ) : null}

      {venueId ? (
        <ManualValidationModal
          open={manualOpen}
          onClose={() => setManualOpen(false)}
          venueId={venueId}
          eventId={eventId}
          onDidCheckIn={() => {
            onValidated?.();
            setManualOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
