"use client";

import type { ReactNode } from "react";

export function SidePanel({
  open,
  onClose,
  title,
  children,
  widthClassName = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  widthClassName?: string;
}) {
  if (!open) return null;
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/50 transition-opacity duration-150"
        aria-label="Cerrar panel"
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-[100] flex w-full flex-col border-l border-white/[0.08] bg-[#0A0A0F] shadow-xl duration-150 ease-out ${widthClassName}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="side-panel-title"
      >
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <h2 id="side-panel-title" className="text-sm font-semibold text-[#F9FAFB]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-[#6B7280] transition hover:bg-white/[0.04] hover:text-[#F9FAFB]"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </>
  );
}
