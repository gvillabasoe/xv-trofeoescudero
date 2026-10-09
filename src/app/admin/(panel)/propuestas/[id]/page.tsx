import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioAccion } from "@/components/panel/formulario-accion";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { NOMBRE_ESTADO_PROPUESTA, NOMBRE_TIPO_COLABORACION } from "@/lib/etiquetas";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { ESTADOS_PROPUESTA, leerPropuesta, marcarLeida } from "@/server/propuestas/bandeja";
import { accionAnonimizar, accionArchivar, accionCambiarEstado, accionEliminar, accionNota } from "../acciones";

export const metadata: Metadata = { title: "Propuesta" };

export default function PaginaPropuesta({ params }: PageProps<"/admin/propuestas/[id]">) {
  return (
    <PaginaPanel titulo="Propuesta" migas={[{ href: "/admin/propuestas", texto: "Propuestas" }]}>
      <Contenido params={params} />
    </PaginaPanel>
  );
}

async function Contenido({ params }: { params: PageProps<"/admin/propuestas/[id]">["params"] }) {
  await requerirAdmin({ exigirTotp: true });
  const { id } = await params;
  const bd = obtenerPrisma();
  await marcarLeida(bd, id);
  const propuesta = await leerPropuesta(bd, id);
  if (!propuesta) notFound();
  const anonimizada = propuesta.anonymizedAt !== null;

  return (
    <>
      <Seccion
        titulo={anonimizada ? "Propuesta anonimizada" : `${propuesta.company} · ${propuesta.name}`}
        id="propuesta"
        acciones={
          <span className="cms-en-linea">
            <Chip tono={propuesta.status === "NUEVA" ? "nuevo" : "neutro"}>{NOMBRE_ESTADO_PROPUESTA[propuesta.status]}</Chip>
            {propuesta.archivedAt && <Chip>Archivada</Chip>}
            {propuesta.isSynthetic && <Chip tono="aviso">Demo (ficticia)</Chip>}
          </span>
        }
      >
        <dl className="dl-datos">
          <dt>Recibida</dt>
          <dd>{formatearFechaHora(propuesta.createdAt.toISOString())}</dd>
          <dt>Tipo</dt>
          <dd>{NOMBRE_TIPO_COLABORACION[propuesta.collaborationType]}</dd>
          {!anonimizada && (
            <>
              <dt>Nombre</dt>
              <dd>{propuesta.name}</dd>
              <dt>Empresa o marca</dt>
              <dd>{propuesta.company}</dd>
              <dt>Cargo</dt>
              <dd>{propuesta.jobTitle ?? "—"}</dd>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${propuesta.email}`}>{propuesta.email}</a>
              </dd>
              <dt>Teléfono</dt>
              <dd>{propuesta.phone ? <a href={`tel:${propuesta.phone.replace(/\s/g, "")}`}>{propuesta.phone}</a> : "—"}</dd>
            </>
          )}
          <dt>Origen</dt>
          <dd>{propuesta.formOrigin}</dd>
          {propuesta.referrer && (
            <>
              <dt>Llegó desde</dt>
              <dd>{propuesta.referrer}</dd>
            </>
          )}
          {(propuesta.utmSource || propuesta.utmCampaign) && (
            <>
              <dt>Campaña</dt>
              <dd>{[propuesta.utmSource, propuesta.utmMedium, propuesta.utmCampaign].filter(Boolean).join(" · ")}</dd>
            </>
          )}
          <dt>Consentimiento</dt>
          <dd>
            «{propuesta.consentText}» · {propuesta.consentLegalVersion.legalPage.title} {propuesta.consentLegalVersion.versionLabel} ·{" "}
            {formatearFechaHora(propuesta.consentAt.toISOString())}
          </dd>
          {anonimizada && propuesta.anonymizedAt && (
            <>
              <dt>Anonimizada</dt>
              <dd>{formatearFechaHora(propuesta.anonymizedAt.toISOString())}</dd>
            </>
          )}
        </dl>
        {!anonimizada && <p className="texto-propuesta">{propuesta.message}</p>}
      </Seccion>

      {!anonimizada && (
        <Seccion titulo="Estado" id="estado">
          <FormularioAccion accion={accionCambiarEstado} boton="Cambiar el estado">
            <input type="hidden" name="_id" value={propuesta.id} />
            <input type="hidden" name="_version" value={propuesta.version} />
            <div className="cms-campos">
              <div className="campo">
                <label htmlFor="nuevo-estado">Nuevo estado</label>
                <select id="nuevo-estado" name="estado" defaultValue={propuesta.status}>
                  {ESTADOS_PROPUESTA.map((estado) => (
                    <option key={estado} value={estado}>
                      {NOMBRE_ESTADO_PROPUESTA[estado]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="nota-estado">Motivo (opcional, interno)</label>
                <input id="nota-estado" name="nota" maxLength={500} />
              </div>
            </div>
          </FormularioAccion>
        </Seccion>
      )}

      <Seccion titulo="Historial" id="historial">
        <ul className="historial-lista">
          {propuesta.statusHistory.map((cambio) => (
            <li key={cambio.id}>
              {formatearFechaHora(cambio.changedAt.toISOString())} ·{" "}
              {cambio.fromStatus ? `${NOMBRE_ESTADO_PROPUESTA[cambio.fromStatus]} → ` : "Recibida como "}
              {NOMBRE_ESTADO_PROPUESTA[cambio.toStatus]}
              {cambio.changedBy && ` · ${cambio.changedBy.name}`}
              {cambio.note && <span className="ayuda"> · {cambio.note}</span>}
            </li>
          ))}
        </ul>
      </Seccion>

      {!anonimizada && (
        <Seccion titulo="Notas internas" id="notas">
          {propuesta.notes.length === 0 ? (
            <p className="ayuda">Sin notas.</p>
          ) : (
            <ul className="historial-lista">
              {propuesta.notes.map((nota) => (
                <li key={nota.id}>
                  <strong>{nota.author?.name ?? "Usuario eliminado"}</strong> · {formatearFechaHora(nota.createdAt.toISOString())}
                  <p className="texto-propuesta">{nota.body}</p>
                </li>
              ))}
            </ul>
          )}
          <FormularioAccion accion={accionNota} boton="Añadir la nota" reiniciar>
            <input type="hidden" name="_id" value={propuesta.id} />
            <div className="campo">
              <label htmlFor="nota">Nota nueva</label>
              <textarea id="nota" name="nota" rows={3} maxLength={4000} required />
            </div>
          </FormularioAccion>
        </Seccion>
      )}

      <Seccion titulo="Archivo y datos" id="gestion">
        <FormularioAccion accion={accionArchivar} boton={propuesta.archivedAt ? "Recuperar del archivo" : "Archivar"}>
          <input type="hidden" name="_id" value={propuesta.id} />
          <input type="hidden" name="_version" value={propuesta.version} />
          <input type="hidden" name="_accion" value={propuesta.archivedAt ? "recuperar" : "archivar"} />
        </FormularioAccion>

        {!anonimizada && (
          <FormularioAccion accion={accionAnonimizar} boton="Anonimizar" peligro>
            <p className="ayuda">
              Borra el nombre, la empresa, el email, el teléfono, el texto y las notas. Se conservan el tipo, el estado y
              las fechas. No se puede deshacer.
            </p>
            <input type="hidden" name="_id" value={propuesta.id} />
            <input type="hidden" name="_version" value={propuesta.version} />
            <label className="campo--casilla">
              <input type="checkbox" name="_confirmar" value="si" required /> Entiendo que no se puede deshacer.
            </label>
            <div className="campo">
              <label htmlFor="palabra-anonimizar">Escribe ANONIMIZAR para confirmar</label>
              <input id="palabra-anonimizar" name="palabra" autoComplete="off" required />
            </div>
          </FormularioAccion>
        )}

        <FormularioAccion accion={accionEliminar} boton="Eliminar definitivamente" peligro>
          <p className="ayuda">Borra la propuesta y todo su historial. No se puede deshacer.</p>
          <input type="hidden" name="_id" value={propuesta.id} />
          <input type="hidden" name="_version" value={propuesta.version} />
          <label className="campo--casilla">
            <input type="checkbox" name="_confirmar" value="si" required /> Entiendo que no se puede deshacer.
          </label>
          <div className="campo">
            <label htmlFor="palabra-eliminar">Escribe ELIMINAR para confirmar</label>
            <input id="palabra-eliminar" name="palabra" autoComplete="off" required />
          </div>
        </FormularioAccion>
      </Seccion>
    </>
  );
}
