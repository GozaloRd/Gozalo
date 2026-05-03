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
      <ConditionalNavbar />
      <main className="flex min-h-screen w-full flex-col">{children}</main>
      <ConditionalFooter />
    </div>
  );
}
