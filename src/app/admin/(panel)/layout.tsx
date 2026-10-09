import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { accionCerrarSesion } from "./acciones";

export const metadata: Metadata = {
  title: "Panel · Trofeo Escudero",
};

/** Secciones de las fases siguientes: se muestran desactivadas para orientar, sin enlace. */
const PROXIMAS = ["Contenidos", "Colaboraciones", "Imágenes", "Patrocinadores", "Propuestas", "Versiones", "Configuración", "Actividad"];

export default function LayoutPanel({ children }: { children: ReactNode }) {
  return (
    <div className="panel">
      <nav aria-label="Panel de administración" className="panel__nav contenedor">
        <Link href="/admin">Panel</Link>
        <Link href="/admin/seguridad">Seguridad</Link>
        {PROXIMAS.map((seccion) => (
          <span key={seccion} aria-disabled="true" className="panel__proxima" title="Llega en una fase posterior">
            {seccion}
          </span>
        ))}
        <form action={accionCerrarSesion} className="panel__salir">
          <button type="submit" className="boton boton--secundario">
            Cerrar sesión
          </button>
        </form>
      </nav>
      {children}
    </div>
  );
}
