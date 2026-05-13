"use client";

import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/dashboard/admin/AdminSidebar";
import { DashboardLocalLogo } from "@/components/dashboard/DashboardLocalLogo";
import { StarryBackground } from "@/components/dashboard/StarryBackground";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#000000] font-sans text-[#F9FAFB] antialiased">
      <StarryBackground variant="desktop" />
      <StarryBackground variant="mobile" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.08] bg-[#0A0A0F]/80 px-4 backdrop-blur-md">
          <div className="hidden shrink-0 items-center gap-1.5 font-bold tracking-tight text-white sm:flex">
            <span aria-hidden className="text-lg">
              ✦
            </span>
            <span>GOZALO</span>
          </div>
          <div className="sm:hidden">
            <DashboardLocalLogo />
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="rounded-xl border border-white/[0.08] bg-zinc-900/60 px-3 py-1.5">
              <p className="truncate text-sm font-medium text-white">Admin global</p>
            </div>
            <span className="hidden rounded-full border border-[#9B7FCA]/35 bg-[#9B7FCA]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#B39CD8] md:inline-flex">
              Plataforma
            </span>
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-zinc-800 text-sm font-bold text-white">
            A
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-16 shrink-0 flex-col border-r border-white/[0.08] bg-[#0D0D14]/95 py-3 backdrop-blur-sm lg:flex">
            <AdminSidebar />
          </aside>
          <aside className="fixed inset-x-0 top-14 z-30 border-b border-white/[0.08] bg-[#0D0D14]/85 backdrop-blur-xl lg:hidden">
            <AdminSidebar />
          </aside>
          <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0A0A0F]/40 pt-[58px] lg:pt-0">
            <div className="hidden shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 md:px-7 lg:flex">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Workspace · Admin
                </p>
                <h2 className="truncate text-lg font-semibold text-white">Panel de control</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span>Vista activa</span>
                <span className="rounded-full border border-[#9B7FCA]/30 bg-[#9B7FCA]/10 px-2 py-0.5 font-medium text-[#B39CD8]">
                  Gozalo
                </span>
              </div>
            </div>
            <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-7 lg:py-7">
              {children}
            </main>
          </section>
        </div>
      </div>
    </div>
  );
}
