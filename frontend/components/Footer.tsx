import Link from "next/link";
import GozaloSiteLogo from "@/components/GozaloSiteLogo";

const LEGAL_LINKS = [
  { href: "/prensa", label: "Prensa" },
  { href: "/legal/terminos", label: "Términos y servicios" },
  { href: "/legal/seguridad", label: "Seguridad" },
  { href: "/legal/compra-segura", label: "Compra segura" },
  { href: "/legal/reembolsos", label: "Reembolsos" },
  { href: "/legal/privacidad", label: "Política de privacidad" },
  { href: "/legal/cookies", label: "Cookies" },
] as const;

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18" />
    </svg>
  );
}

function FooterMark() {
  return (
    <Link
      href="/"
      aria-label="Gozalo"
      className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] text-[13px] font-black text-white"
    >
      G
    </Link>
  );
}

function PayVisa() {
  return (
    <span
      aria-label="Visa"
      className="inline-flex h-7 min-w-[46px] items-center justify-center rounded-md border border-white/10 bg-white px-2 text-[11px] font-black italic tracking-tight text-[#1A1F71]"
    >
      VISA
    </span>
  );
}

function PayMastercard() {
  return (
    <span
      aria-label="Mastercard"
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white px-2"
    >
      <span className="flex">
        <span className="block h-4 w-4 rounded-full bg-[#EB001B]" />
        <span className="-ml-2 block h-4 w-4 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </span>
      <span className="text-[9px] font-bold uppercase tracking-tight text-[#222]">mastercard</span>
    </span>
  );
}

function PayVerifiedVisa() {
  return (
    <span
      aria-label="Verified by Visa"
      className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-[#1A1F71] px-2 text-white"
    >
      <span className="text-[10px] font-black italic leading-none">VISA</span>
      <span className="text-[7px] font-semibold uppercase leading-tight">
        Secure
      </span>
    </span>
  );
}

function PayIdCheck() {
  return (
    <span
      aria-label="Mastercard ID Check"
      className="inline-flex h-7 items-center gap-1 rounded-md border border-white/10 bg-black px-2 text-white"
    >
      <span className="flex">
        <span className="block h-3 w-3 rounded-full bg-[#EB001B]" />
        <span className="-ml-1.5 block h-3 w-3 rounded-full bg-[#F79E1B] mix-blend-multiply" />
      </span>
      <span className="text-[8px] font-semibold uppercase leading-tight">ID Check</span>
    </span>
  );
}

function PayPci() {
  return (
    <span
      aria-label="PCI DSS Compliant"
      className="inline-flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white px-2 text-[#0A1F44]"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" />
      </svg>
      <span className="text-[8px] font-bold uppercase leading-tight">
        PCI DSS
        <br />
        Secure
      </span>
    </span>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
          {/* Fila 1: mark + copyright · idioma + links legales */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <GozaloSiteLogo size="sm" className="font-display" />
              <p className="text-[11px] text-white/40">
                © {new Date().getFullYear()} Gozalo Dominicana. Todos los derechos reservados.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-transparent px-2 py-1 text-[11px] text-white/60 transition-colors hover:border-white/25 hover:text-white"
              >
                <IconGlobe />
                Español
              </button>
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[11px] text-white/45 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Fila 2: descripción legal del servicio */}
          <p className="mt-6 border-t border-white/[0.04] pt-6 text-[11px] leading-relaxed text-white/35 lg:max-w-4xl">
            Gozalo es una plataforma online que conecta a locales y organizadores
            de eventos con asistentes en República Dominicana. Facilitamos la
            publicación, venta de entradas y reservas de mesa, ofreciendo un
            servicio seguro, auditado y eficiente para cualquier experiencia
            nocturna. Todos los cobros se procesan bajo estrictos estándares de
            seguridad PCI DSS y autenticación 3-D Secure.
          </p>

          {/* Fila 3: dirección fiscal + pasarelas de pago aceptadas */}
          <div className="mt-6 flex flex-col gap-5 border-t border-white/[0.04] pt-6 md:flex-row md:items-center md:justify-between">
            <p className="text-[11px] text-white/35">
              Av 27 de Febrero 194 · Santo Domingo 10305 · República Dominicana
            </p>
          <div className="flex flex-wrap items-center gap-2">
            <PayVisa />
            <PayMastercard />
            <PayVerifiedVisa />
            <PayIdCheck />
            <PayPci />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
