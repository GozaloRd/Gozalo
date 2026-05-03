"use client";

import type { ComponentType } from "react";
import Link from "next/link";
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
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import { PanelFooterLinks } from "@/components/dashboard/panels/PanelFooterLinks";
import { logoutClient } from "@/lib/authApi";

export function SettingsPanel({
  area,
  opsAlertCount,
}: {
  area: QuickAreaConfig;
  opsAlertCount: number;
}) {
  const router = useRouter();

  function onLogout() {
    logoutClient();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        <SetRow href="/dashboard/configuracion" Icon={Building2} label="Datos del local" hint="Nombre, logo, descripción" />
        <SetRow href="/dashboard/configuracion" Icon={CreditCard} label="Información fiscal y bancaria" />
        <SetRow href="/dashboard/configuracion" Icon={CreditCard} label="Métodos de pago" />
        <SetRow href="/dashboard/configuracion" Icon={UserCog} label="Usuarios y permisos" />
        <SetRow href="/dashboard/configuracion" Icon={Clock} label="Horarios de apertura" />
        <SetRow href="/dashboard/configuracion" Icon={Share2} label="Redes y contacto público" />
        <SetRow href="/dashboard/configuracion" Icon={Plug} label="Integraciones" />
        <SetRow href="/dashboard/configuracion" Icon={Bell} label="Notificaciones" />
        <SetRow href="/dashboard/configuracion" Icon={Sliders} label="Preferencias (idioma, moneda, zona)" />
        <SetRow href="/dashboard/configuracion" Icon={Globe2} label="Preferencias generales" />
      </ul>

      <button
        type="button"
        onClick={onLogout}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.12] bg-zinc-950/80 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10 active:scale-[0.99]"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        Cerrar sesión
      </button>

      <PanelFooterLinks area={area} items={area.items} opsAlertCount={opsAlertCount} />
    </div>
  );
}

function SetRow({
  href,
  Icon,
  label,
  hint,
}: {
  href: string;
  Icon: ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-black/25 px-3 py-2.5 transition hover:bg-orange-600/10 active:scale-[0.99]"
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" aria-hidden />
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
      </Link>
    </li>
  );
}
