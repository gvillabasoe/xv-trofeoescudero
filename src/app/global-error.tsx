"use client";

import "./globals.css";

/** Error en el propio layout raíz: página mínima con su propio <html>. */
export default function ErrorGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-ES">
      <body>
        <main id="main" tabIndex={-1} className="pagina sistema">
          <div className="wrap pagina-head">
            <h1 className="display">Algo se ha quedado en el búnker.</h1>
            <p className="lead">No es culpa tuya. Vuelve a intentarlo en unos segundos.</p>
            <div className="pagina-acciones">
              <button type="button" className="btn btn-verde" onClick={() => reset()}>
                Reintentar
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
