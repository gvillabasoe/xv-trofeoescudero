"use client";

import { IconoSistema } from "@/components/publico/ilustraciones";

/** Página de error (fase-1 §4.6). No muestra detalles técnicos. */
export default function PaginaError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" tabIndex={-1} className="pagina sistema">
      <div className="wrap pagina-head">
        <IconoSistema tipo="bunker" />
        <h1 className="display">Algo se ha quedado en el búnker.</h1>
        <p className="lead">No es culpa tuya. Vuelve a intentarlo en unos segundos.</p>
        <div className="pagina-acciones">
          <button type="button" className="btn btn-verde" onClick={() => reset()}>
            Reintentar
          </button>
        </div>
      </div>
    </main>
  );
}
