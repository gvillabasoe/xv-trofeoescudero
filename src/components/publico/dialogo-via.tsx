"use client";

import { useRef, type ReactNode } from "react";

/**
 * Detalle de una vía (fase-1 §13.2) con <dialog> nativo en modo modal:
 * - cerrado no ocupa espacio; abierto, el resto de la página queda inerte (el foco no puede salir);
 * - se cierra con Escape, con el botón explícito o pulsando el fondo;
 * - al cerrar, el foco vuelve al botón que lo abrió.
 * En escritorio es un panel lateral; en móvil, una hoja inferior (CSS).
 */
export function DialogoVia({
  id,
  etiquetaBoton,
  nombreAccesible,
  children,
}: {
  id: string;
  etiquetaBoton: string;
  nombreAccesible: string;
  children: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const boton = useRef<HTMLButtonElement>(null);

  const cerrar = () => dialogo.current?.close();

  return (
    <>
      <button
        ref={boton}
        type="button"
        className="via-detalle"
        aria-haspopup="dialog"
        aria-controls={id}
        // El nombre accesible empieza por el texto visible (WCAG 2.5.3) y añade de qué vía se trata.
        aria-label={`${etiquetaBoton}: ${nombreAccesible}`}
        onClick={() => dialogo.current?.showModal()}
      >
        {etiquetaBoton}
      </button>
      <dialog
        ref={dialogo}
        id={id}
        className="dialogo-via"
        aria-labelledby={`${id}-titulo`}
        onClose={() => boton.current?.focus()}
        onClick={(evento) => {
          // Un clic en el fondo (fuera del contenido) llega al propio <dialog>.
          if (evento.target === dialogo.current) cerrar();
        }}
      >
        <div className="dialogo-barra">
          <span className="label">{nombreAccesible}</span>
          <button type="button" className="dialogo-cerrar" onClick={cerrar} aria-label="Cerrar el detalle">
            Cerrar <span aria-hidden="true">✕</span>
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
