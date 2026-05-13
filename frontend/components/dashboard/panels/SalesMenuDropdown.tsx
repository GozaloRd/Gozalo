"use client";

import { Bell, MoreVertical, RefreshCw, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const NOTIF_KEY = "gozalo_ventas_order_notif";
const SOUND_KEY = "gozalo_ventas_order_sound";

function readNotif() {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(NOTIF_KEY);
  if (v === null) return true;
  return v === "1" || v === "true";
}

function readSound() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SOUND_KEY) === "1" || localStorage.getItem(SOUND_KEY) === "true";
}

export function SalesMenuDropdown({ onRefresh }: { onRefresh?: () => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [notif, setNotif] = useState(true);
  const [sound, setSound] = useState(false);

  useEffect(() => {
    setNotif(readNotif());
    setSound(readSound());
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function persistNotif(v: boolean) {
    localStorage.setItem(NOTIF_KEY, v ? "1" : "0");
    setNotif(v);
    window.dispatchEvent(new Event("gozalo-ventas-prefs"));
  }

  function persistSound(v: boolean) {
    localStorage.setItem(SOUND_KEY, v ? "1" : "0");
    setSound(v);
    window.dispatchEvent(new Event("gozalo-ventas-prefs"));
  }

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/40"
        aria-label="Más opciones de Ventas"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>
      {open ? (
        <ul
          role="menu"
          className="absolute right-0 top-full z-[80] mt-1 min-w-[220px] rounded-xl border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/[0.06]"
              onClick={() => {
                onRefresh?.();
                setOpen(false);
              }}
            >
              <RefreshCw className="h-4 w-4 text-emerald-400" aria-hidden />
              Actualizar datos
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/[0.06]"
              onClick={() => persistNotif(!notif)}
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-400" aria-hidden />
                Notificaciones de órdenes
              </span>
              <span className="text-xs text-slate-500">{notif ? "Sí" : "No"}</span>
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-white/90 hover:bg-white/[0.06]"
              onClick={() => persistSound(!sound)}
            >
              <span className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-emerald-400" aria-hidden />
                Sonido nuevas órdenes
              </span>
              <span className="text-xs text-slate-500">{sound ? "Sí" : "No"}</span>
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
