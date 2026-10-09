import type { Metadata } from "next";
import { FormularioAlta } from "./formulario";

// Solo existe mientras no haya ningún administrador y ADMIN_SETUP_SECRET esté en Vercel.
// Si no, el proxy responde 404 antes de llegar aquí, y la Server Action vuelve a comprobarlo.
export const metadata: Metadata = {
  title: "Alta inicial · Trofeo Escudero",
};

export default function PaginaAltaInicial() {
  return (
    <main id="main" tabIndex={-1} className="contenedor comprobacion panel-acceso">
      <p className="etiqueta">Panel de administración</p>
      <h1 className="titular">
        Alta del <em>primer administrador.</em>
      </h1>
      <p className="entradilla">
        Se hace una sola vez. Después, esta página deja de existir. Al terminar tendrás que activar la
        verificación en dos pasos (TOTP) antes de entrar en el panel.
      </p>
      <FormularioAlta />
    </main>
  );
}
