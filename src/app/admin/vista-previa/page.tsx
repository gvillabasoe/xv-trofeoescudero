import type { Metadata } from "next";
import { Suspense } from "react";
import { Landing } from "@/components/publico/bloques";
import { MarcoPublico } from "@/components/publico/marco";
import { ErrorPublicacion, prepararPublicacion, type ResultadoConstruccion } from "@/lib/snapshot/construir";
import { requerirAdmin } from "@/server/auth/guardas";
import { leerBorrador } from "@/server/borrador";
import { obtenerPrisma } from "@/server/db";
import { leerLegales, legalesPublicados } from "@/server/snapshot-publico";

export const metadata: Metadata = {
  title: "Vista previa del borrador",
  robots: { index: false, follow: false },
};

/**
 * Vista previa del borrador con los mismos componentes que la web, pasado por las mismas barreras que la
 * publicación (lista blanca, Zod e inspección de privacidad). Solo con sesión de administrador y TOTP.
 */
export default function VistaPrevia() {
  return (
    <Suspense fallback={<p role="status">Preparando la vista previa…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const legales = await leerLegales();
  let resultado: ResultadoConstruccion;
  try {
    resultado = prepararPublicacion(await leerBorrador(obtenerPrisma()));
  } catch (error) {
    if (!(error instanceof ErrorPublicacion)) throw error;
    return (
      <main id="main" tabIndex={-1} className="pagina">
        <div className="wrap pagina-head">
          <h1 className="display">El borrador todavía no se puede mostrar.</h1>
          <ul>
            {error.motivos.map((motivo) => (
              <li key={motivo}>{motivo}</li>
            ))}
          </ul>
          <p>
            <a className="btn btn-verde" href="/admin/publicar">
              Volver a «Revisar y publicar»
            </a>
          </p>
        </div>
      </main>
    );
  }

  const { snapshot, avisos } = resultado;
  return (
    <>
      <div className="franja-vista-previa" role="note">
        <span>Vista previa del borrador · no es la web publicada{avisos.length > 0 ? ` · ${avisos.length} avisos` : ""}</span>
        <a href="/admin/publicar">Revisar y publicar</a>
        <a href="/admin">Volver al panel</a>
      </div>
      <MarcoPublico snapshot={snapshot} legales={legalesPublicados(legales)} enPortada>
        <main id="main" tabIndex={-1}>
          <Landing snapshot={snapshot} />
        </main>
      </MarcoPublico>
    </>
  );
}
