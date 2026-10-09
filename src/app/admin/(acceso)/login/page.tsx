import type { Metadata } from "next";
import { FormularioAcceso } from "./formulario";

export const metadata: Metadata = {
  title: "Acceso al panel · Trofeo Escudero",
};

export default function PaginaAcceso() {
  return (
    <main id="main" tabIndex={-1} className="contenedor comprobacion panel-acceso">
      <p className="etiqueta">Panel de administración</p>
      <h1 className="titular">
        Acceso <em>al panel.</em>
      </h1>
      <p className="entradilla">Solo para la organización. Necesitas tu contraseña y tu app de autenticación.</p>
      <FormularioAcceso />
    </main>
  );
}
