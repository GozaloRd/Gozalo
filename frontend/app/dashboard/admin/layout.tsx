"use client";

import { AdminAuthGate } from "@/components/dashboard/admin/AdminAuthGate";
import { AdminShell } from "@/components/dashboard/admin/AdminShell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGate>
  );
}
