import type { Metadata } from "next";

import { Cormorant_Infant, Inter, Playfair_Display } from "next/font/google";

import "./globals.css";

import { GoogleTags } from "@/components/GoogleTags";

import { SLOGAN } from "@/lib/constants";



const inter = Inter({

  subsets: ["latin"],

  variable: "--font-inter",

  display: "swap",

});



const playfair = Playfair_Display({

  subsets: ["latin"],

  variable: "--font-playfair",

  display: "swap",

});



const logoMark = Cormorant_Infant({

  subsets: ["latin"],

  variable: "--font-logo-mark",

  display: "swap",

  weight: ["600", "700"],

  style: ["italic"],

});



const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();



export const metadata: Metadata = {

  title: `Gózalo — ${SLOGAN}`,

  description:

    "Plataforma de gestión de ocio nocturno para República Dominicana. Eventos, reservas, POS y control de acceso.",

  ...(googleSiteVerification

    ? {

        verification: {

          google: googleSiteVerification,

        },

      }

    : {}),

};



export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {

  return (

    <html lang="es" className={`${inter.variable} ${playfair.variable} ${logoMark.variable}`}>

      <GoogleTags />

      <body className="font-sans min-h-screen antialiased">{children}</body>

    </html>

  );

}

