import { Suspense } from "react";
import { ConditionalNavbar } from "@/components/ConditionalNavbar";
import { ConditionalFooter } from "@/components/ConditionalFooter";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* Tipografía pública unificada (Playfair / font-display): eventos, checkout, login, collage, etc. */
  return (
    <div className="font-display antialiased">
      <Suspense fallback={null}>
        <ConditionalNavbar />
      </Suspense>
      <main className="relative z-0 flex min-h-screen w-full flex-col">{children}</main>
      <Suspense fallback={null}>
        <ConditionalFooter />
      </Suspense>
    </div>
  );
}
