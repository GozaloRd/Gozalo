"use client";

import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  Clock,
  CreditCard,
  Globe2,
  LogOut,
  Plug,
  Share2,
  Sliders,
  UserCog,
} from "lucide-react";
import { logoutClient } from "@/lib/authApi";

export function SettingsPanel() {
  const router = useRouter();

  async function onLogout() {
    await logoutClient();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        <SetRow Icon={Building2} label="Datos del local" hint="Nombre, logo, descripción" />
        <SetRow Icon={CreditCard} label="Información fiscal y bancaria" />
        <SetRow Icon={CreditCard} label="Métodos de pago" />
        <SetRow Icon={UserCog} label="Usuarios y permisos" />
        <SetRow Icon={Clock} label="Horarios de apertura" />
        <SetRow Icon={Share2} label="Redes y contacto público" />
        <SetRow Icon={Plug} label="Integraciones" />
        <SetRow Icon={Bell} label="Notificaciones" />
        <SetRow Icon={Sliders} label="Preferencias (idioma, moneda, zona)" />
        <SetRow Icon={Globe2} label="Preferencias generales" />
      </ul>

      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-zinc-950/80 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Cerrar sesión
      </button>
    </div>
  );
}

function SetRow({
  Icon,
  label,
  hint,
}: {
  Icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
}) {
  return (
    <li>
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden />
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
      </div>
    </li>
  );
}
