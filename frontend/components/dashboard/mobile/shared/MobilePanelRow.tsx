"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ChevronRight } from "lucide-react";

/** Color del icono por área del dashboard móvil */
export type MobilePanelRowTone = "ventas" | "acceso" | "estadisticas" | "caja";

const ICON_CLASS: Record<MobilePanelRowTone, string> = {
  ventas: "text-emerald-500",
  acceso: "text-blue-500",
  estadisticas: "text-pink-500",
  caja: "text-purple-400",
};

const ROW_SURFACE =
  "flex min-h-[76px] items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4";

type IconComp = ComponentType<{ className?: string }>;

/** Contenido interno (icono + textos + flecha); el padre debe ser `flex items-center gap-3`. */
export function MobilePanelRowTriggerBody({
  Icon,
  title,
  subtitle,
  tone,
  badgeCount,
  trailing,
  arrowVariant = "diagonal",
}: {
  Icon: IconComp;
  title: ReactNode;
  subtitle?: string;
  tone: MobilePanelRowTone;
  badgeCount?: number;
  trailing?: ReactNode;
  /** `chevron` = misma línea visual que items de Estadísticas (›). */
  arrowVariant?: "diagonal" | "chevron";
}) {
  const iconTone = ICON_CLASS[tone];
  const defaultArrow =
    arrowVariant === "chevron" ? (
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
    ) : (
      <ArrowDownRight className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
    );
  return (
    <>
      <Icon className={`h-6 w-6 shrink-0 ${iconTone}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-white">
          {title}
          {badgeCount != null && badgeCount > 0 ? (
            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          ) : null}
        </p>
        {subtitle ? <p className="text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      {trailing ?? defaultArrow}
    </>
  );
}

export function MobilePanelRowSurface({
  Icon,
  title,
  subtitle,
  tone,
  badgeCount,
  trailing,
  surfaceClassName,
  arrowVariant = "diagonal",
}: {
  Icon: IconComp;
  title: ReactNode;
  subtitle?: string;
  tone: MobilePanelRowTone;
  badgeCount?: number;
  trailing?: ReactNode;
  /** p. ej. `bg-zinc-900/80 backdrop-blur-sm` en Control de acceso */
  surfaceClassName?: string;
  arrowVariant?: "diagonal" | "chevron";
}) {
  return (
    <div className={`${ROW_SURFACE} ${surfaceClassName ?? ""}`}>
      <MobilePanelRowTriggerBody
        Icon={Icon}
        title={title}
        subtitle={subtitle}
        tone={tone}
        badgeCount={badgeCount}
        trailing={trailing}
        arrowVariant={arrowVariant}
      />
    </div>
  );
}

/** Fila clicable / enlace: mismo aspecto que Tickets, Mesas y Órdenes en Ventas. */
export function MobilePanelRow({
  Icon,
  label,
  hint,
  tone,
  href,
  externalNewTab,
  onRowClick,
  badgeCount,
  surfaceClassName,
  arrowVariant,
}: {
  Icon: IconComp;
  label: string;
  hint?: string;
  tone: MobilePanelRowTone;
  href?: string;
  externalNewTab?: boolean;
  onRowClick?: () => void;
  badgeCount?: number;
  surfaceClassName?: string;
  arrowVariant?: "diagonal" | "chevron";
}) {
  const hoverRing =
    tone === "ventas"
      ? "hover:bg-emerald-500/5 active:scale-[0.99]"
      : tone === "estadisticas"
        ? "hover:bg-pink-500/5 active:scale-[0.99]"
        : tone === "caja"
          ? "hover:bg-purple-500/5 active:scale-[0.99]"
          : "hover:bg-blue-500/5 active:scale-[0.99]";

  const inner = (
    <MobilePanelRowSurface
      Icon={Icon}
      title={label}
      subtitle={hint}
      tone={tone}
      badgeCount={badgeCount}
      surfaceClassName={surfaceClassName}
      arrowVariant={arrowVariant ?? (tone === "estadisticas" ? "chevron" : "diagonal")}
    />
  );

  if (href && !onRowClick) {
    return (
      <Link
        href={href}
        target={externalNewTab ? "_blank" : undefined}
        rel={externalNewTab ? "noopener noreferrer" : undefined}
        className={`block transition ${hoverRing}`}
      >
        {inner}
      </Link>
    );
  }
  if (onRowClick) {
    return (
      <button type="button" onClick={onRowClick} className={`block w-full text-left transition ${hoverRing}`}>
        {inner}
      </button>
    );
  }
  return <div>{inner}</div>;
}
