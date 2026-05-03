"use client";

import type { ReactNode } from "react";

import { AdminSidebar } from "@/components/dashboard/admin/AdminSidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F] font-sans text-[#F9FAFB] antialiased">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] overflow-y-auto border-r border-white/[0.08] bg-[#0A0A0F] lg:block">
        <AdminSidebar />
      </aside>
      <aside className="border-b border-white/[0.08] bg-[#0A0A0F] lg:hidden">
        <AdminSidebar />
      </aside>
      <main className="min-h-screen w-full px-4 py-6 md:px-8 lg:ml-[260px]">{children}</main>
    </div>
  );
}
