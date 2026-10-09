import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { NavPanel, NavPanelSinRuta } from "@/components/panel/nav-panel";
import { accionCerrarSesion } from "./acciones";
import "../panel.css";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel · Trofeo Escudero" },
  robots: { index: false, follow: false },
};

export default function LayoutPanel({ children }: { children: ReactNode }) {
  return (
    <div className="panel-shell">
      <header className="panel-cabecera">
        <Link href="/admin" className="panel-marca">
          Trofeo Escudero <span>Panel</span>
        </Link>
        <div className="panel-cabecera__acciones">
          <a href="/admin/vista-previa" className="panel-enlace">
            Vista previa del borrador
          </a>
          <a href="/" className="panel-enlace" target="_blank" rel="noopener">
            Ver la web publicada
          </a>
          <form action={accionCerrarSesion}>
            <button type="submit" className="boton boton--claro">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <div className="panel-cuerpo">
        <Suspense fallback={<NavPanelSinRuta />}>
          <NavPanel />
        </Suspense>
        <div className="panel-contenido">{children}</div>
      </div>
    </div>
  );
}
