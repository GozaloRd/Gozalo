"use client";

import { ClienteAuthGate } from "@/components/dashboard/cliente/ClienteAuthGate";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClienteAuthGate>
      <div className="min-h-screen bg-[#0A0A0F] font-sans text-[#F9FAFB] antialiased">{children}</div>
    </ClienteAuthGate>
  );
}
