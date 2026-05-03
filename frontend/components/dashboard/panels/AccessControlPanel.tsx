"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { ClipboardList, DoorOpen, History, ScanLine, Search, Users } from "lucide-react";
import type { QuickAreaConfig } from "@/components/dashboard/quickActions.config";
import { PanelFooterLinks } from "@/components/dashboard/panels/PanelFooterLinks";
import type { MobileStats } from "@/components/dashboard/panels/mobilePanelTypes";
import { QRValidator } from "@/components/dashboard/panels/QRValidator";

export function AccessControlPanel({
  area,
  stats,
  opsAlertCount,
}: {
  area: QuickAreaConfig;
  stats: MobileStats | null;
  opsAlertCount: number;
}) {
  const occ = stats?.occupancy;
  const cap = occ?.maxCapacity ?? 0;
  const inside = occ?.currentAttendees ?? 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.08] bg-zinc-950/70 p-3">
        <p className="text-center text-xs font-medium text-slate-400">Validador QR</p>
        <div className="mt-2 flex justify-center">
          <QRValidator maxWidth={320} />
        </div>
        <Link
          href="/dashboard/acceso"
          className="mt-3 block text-center text-xs font-semibold text-[#2979FF]"
        >
          Abrir pantalla completa de acceso
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 text-center backdrop-blur-sm">
          <Users className="mx-auto h-5 w-5 text-blue-400" aria-hidden />
          <p className="mt-1 text-[10px] uppercase text-slate-500">Aforo en vivo</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">
            {inside} / {cap || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-zinc-900/80 px-3 py-3 text-center backdrop-blur-sm">
          <ScanLine className="mx-auto h-5 w-5 text-blue-400" aria-hidden />
          <p className="mt-1 text-[10px] uppercase text-slate-500">QR validados</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-white">—</p>
          <p className="text-[10px] text-slate-500">En tiempo real en acceso</p>
        </div>
      </div>

      <ul className="space-y-2">
        <AccessLink href="/dashboard/guestlist" Icon={ClipboardList} label="Lista de invitados" />
        <AccessLink href="/dashboard/acceso" Icon={Search} label="Validación manual" hint="Nombre / documento" />
        <AccessLink href="/dashboard/acceso" Icon={Users} label="Check-in por mesas" />
        <AccessLink href="/dashboard/acceso" Icon={History} label="Histórico del evento" />
        <AccessLink href="/dashboard/configuracion" Icon={DoorOpen} label="Puntos de acceso" hint="Puerta, VIP…" />
      </ul>

      <PanelFooterLinks area={area} items={area.items} opsAlertCount={opsAlertCount} />
    </div>
  );
}

function AccessLink({
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
        className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5 transition active:scale-[0.99] hover:bg-blue-500/10"
      >
        <Icon className="h-4 w-4 shrink-0 text-blue-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white">{label}</p>
          {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
        </div>
      </Link>
    </li>
  );
}
