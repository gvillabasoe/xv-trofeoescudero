import type { Metadata } from "next";
import Link from "next/link";
import { FormularioAccion } from "@/components/panel/formulario-accion";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { informePublicacion } from "@/server/panel/informe";
import { accionPublicar } from "./acciones";

export const metadata: Metadata = { title: "Revisar y publicar" };

export default function PaginaPublicar() {
  return (
    <PaginaPanel
      titulo="Revisar y publicar"
      descripcion="Antes de publicar se comprueba todo: campos obligatorios, privacidad (sin emails, teléfonos ni «[PENDIENTE]» fuera de los canales de contacto), marcas y derechos de las imágenes."
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const informe = await informePublicacion(obtenerPrisma());

  return (
    <>
      <Seccion
        titulo="Estado"
        id="estado"
        acciones={
          <a className="boton boton--secundario" href="/admin/vista-previa">
            Ver la vista previa del borrador
          </a>
        }
      >
        <p>
          {informe.publicada
            ? `Versión publicada: nº ${informe.publicada.numero}, del ${formatearFechaHora(informe.publicada.publicadaEn)}.`
            : "Todavía no hay ninguna versión publicada."}{" "}
          <Link href="/admin/versiones">Ver todas las versiones</Link>
        </p>
        {informe.errores.length > 0 ? (
          <Chip tono="error">No se puede publicar</Chip>
        ) : informe.identico ? (
          <Chip tono="ok">El borrador es igual que lo publicado</Chip>
        ) : (
          <Chip tono="nuevo">Hay cambios listos para publicar</Chip>
        )}
      </Seccion>

      {informe.errores.length > 0 && (
        <Seccion titulo="Qué hay que corregir" id="errores">
          <ul className="lista-avisos lista-avisos--error">
            {informe.errores.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Seccion>
      )}

      {informe.avisos.length > 0 && (
        <Seccion titulo="Se publicará sin esto" id="avisos">
          <ul className="lista-avisos">
            {informe.avisos.map((aviso) => (
              <li key={aviso}>{aviso}</li>
            ))}
          </ul>
        </Seccion>
      )}

      {informe.cambios.length > 0 && (
        <Seccion titulo="Qué cambia" id="cambios">
          <ul className="lista-avisos">
            {informe.cambios.map((cambio) => (
              <li key={cambio}>{cambio}</li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Publicar" id="publicar">
        {informe.errores.length > 0 ? (
          <p className="nota">Corrige lo marcado arriba para poder publicar.</p>
        ) : informe.identico ? (
          <p className="nota">No hay nada nuevo que publicar.</p>
        ) : null}
        {/* Siempre montado: así se conserva el mensaje de la última publicación. */}
        <FormularioAccion
          accion={accionPublicar}
          boton="Publicar ahora"
          enviandoTexto="Publicando…"
          deshabilitado={informe.errores.length > 0 || informe.identico}
          reiniciar
        >
          <input type="hidden" name="_version" value={informe.versionSitio} />
          {informe.errores.length === 0 && !informe.identico && (
            <>
              <div className="campo">
                <label htmlFor="comentario">Comentario (opcional, interno)</label>
                <input id="comentario" name="comentario" maxLength={300} placeholder="Qué cambia en esta versión" />
              </div>
              <label className="campo--casilla">
                <input type="checkbox" name="_confirmar" value="si" required /> He revisado la vista previa y quiero
                publicar estos cambios en la web.
              </label>
            </>
          )}
        </FormularioAccion>
      </Seccion>
    </>
  );
}
