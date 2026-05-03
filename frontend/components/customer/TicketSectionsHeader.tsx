"use client";

import { siteBodyTextClass } from "@/lib/siteTypography";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  count?: number;
};

export function TicketSectionsHeader({ eyebrow, title, description, count }: Props) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.3em] text-[#C77DFF]/85">{eyebrow}</p>
      <h3 className="mt-2 text-[2rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.2rem]">{title}</h3>
      {description ? <p className={`mt-2 ${siteBodyTextClass}`}>{description}</p> : null}
      {count != null && count > 0 ? (
        <p className="mt-3 inline-flex rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[12px] font-medium tabular-nums text-slate-300">
          {count === 1 ? "1 entrada" : `${count} entradas`}
        </p>
      ) : null}
      <div className="mx-auto mt-6 flex w-full max-w-[230px] items-center justify-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#9B7FCA]/45 to-[#C77DFF]/35" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#C77DFF]/80 shadow-[0_0_10px_rgba(199,125,255,0.65)]" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#9B7FCA]/45 to-[#C77DFF]/35" />
      </div>
    </div>
  );
}
