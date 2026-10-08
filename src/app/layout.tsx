import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// next/font aloja las fuentes en la propia web: no hay peticiones a Google desde el navegador.
const fuenteTitulares = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  variable: "--fuente-titulares",
});

const fuenteTexto = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-texto",
});

export const metadata: Metadata = {
  title: "Trofeo Escudero · Fundación técnica",
  description: "Página provisional de comprobación técnica. No forma parte de la web pública.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-ES" className={`${fuenteTitulares.variable} ${fuenteTexto.variable}`}>
      <body>
        <a className="saltar" href="#main">
          Saltar al contenido
        </a>
        <header className="cabecera">
          <div className="contenedor cabecera__interior">
            <span className="marca">
              Trofeo Escudero <span className="marca__edicion">XV</span>
            </span>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
