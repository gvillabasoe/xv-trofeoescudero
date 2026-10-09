"use client";

import { useActionState, useEffect, useRef, useTransition, type ReactNode } from "react";
import type { EstadoEdicion } from "@/server/panel/acciones";
import { Estado } from "./formulario-entidad";

const INICIAL: EstadoEdicion = {};

/**
 * Formulario para una acción concreta del panel (publicar, cambiar estado, anonimizar…).
 * Los campos llegan como hijos; el mensaje de resultado aparece junto al botón.
 */
export function FormularioAccion({
  accion,
  children,
  boton,
  enviandoTexto = "Un momento…",
  peligro = false,
  reiniciar = false,
  deshabilitado = false,
  className,
}: {
  accion: (previo: EstadoEdicion, formulario: FormData) => Promise<EstadoEdicion>;
  children?: ReactNode;
  boton: string;
  enviandoTexto?: string;
  peligro?: boolean;
  /** Vacía el formulario tras un envío correcto (p. ej., una nota nueva). */
  reiniciar?: boolean;
  /** Se mantiene montado (conserva el mensaje del último envío) pero no se puede enviar. */
  deshabilitado?: boolean;
  className?: string;
}) {
  const [estado, enviar, enviando] = useActionState(accion, INICIAL);
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (reiniciar && estado.ok) formulario.current?.reset();
  }, [estado.marca, estado.ok, reiniciar]);

  return (
    <form
      ref={formulario}
      action={enviar}
      onSubmit={(evento) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        iniciar(() => enviar(datos));
      }}
      className={`cms-form${className ? ` ${className}` : ""}`}
    >
      {children}
      <div className="cms-pie">
        <button type="submit" className={`boton${peligro ? " boton--peligro" : ""}`} disabled={enviando || deshabilitado}>
          {enviando ? enviandoTexto : boton}
        </button>
        <Estado estado={estado} />
      </div>
    </form>
  );
}
