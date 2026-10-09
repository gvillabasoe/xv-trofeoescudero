import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import { sitioIndexable, urlBaseSitio } from "@/lib/sitio";
import "./globals.css";

// next/font aloja las fuentes en la propia web: no hay peticiones a Google desde el navegador.
const fuenteTitulares = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--fuente-titulares",
});

const fuenteTexto = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-texto",
});

const indexable = sitioIndexable();

export const metadata: Metadata = {
  metadataBase: new URL(urlBaseSitio()),
  title: { default: "Trofeo Escudero", template: "%s · Trofeo Escudero" },
  applicationName: "Trofeo Escudero",
  formatDetection: { telephone: false, email: false, address: false },
  // Hasta el lanzamiento (SITIO_PUBLICO=si) nada se indexa.
  robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#12382C",
  colorScheme: "light",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-ES" className={`${fuenteTitulares.variable} ${fuenteTexto.variable}`}>
      <body>
        <a className="skip" href="#main">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
