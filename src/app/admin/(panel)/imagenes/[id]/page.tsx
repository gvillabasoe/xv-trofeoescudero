import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioAccion } from "@/components/panel/formulario-accion";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { NOMBRE_ESTADO_MEDIO, NOMBRE_MOTIVO_RETIRADA, OPCIONES } from "@/lib/panel/opciones";
import { motivoMedioNoPublicable } from "@/lib/snapshot/construir";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { claveDestino, listarDestinos, type Hueco } from "@/server/medios/biblioteca";
import {
  accionAsignarImagen,
  accionEstadoImagen,
  accionGuardarImagen,
  accionQuitarUso,
  accionRetirarImagen,
} from "../acciones";

export const metadata: Metadata = { title: "Imagen" };

export default function PaginaImagen({ params }: PageProps<"/admin/imagenes/[id]">) {
  return (
    <PaginaPanel titulo="Imagen" migas={[{ href: "/admin/imagenes", texto: "Imágenes" }]}>
      <Contenido params={params} />
    </PaginaPanel>
  );
}

function Casilla({ nombre, etiqueta, marcada, ayuda }: { nombre: string; etiqueta: string; marcada: boolean; ayuda?: string }) {
  return (
    <div className="campo campo--casilla-cms">
      <label className="campo--casilla">
        <input type="checkbox" name={nombre} value="si" defaultChecked={marcada} /> <span>{etiqueta}</span>
      </label>
      {ayuda && <p className="ayuda">{ayuda}</p>}
    </div>
  );
}

async function Contenido({ params }: { params: PageProps<"/admin/imagenes/[id]">["params"] }) {
  await requerirAdmin({ exigirTotp: true });
  const { id } = await params;
  const bd = obtenerPrisma();
  const medio = await bd.mediaAsset.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { width: "asc" } },
      usages: true,
      uploadedBy: { select: { name: true } },
      consentConfirmedBy: { select: { name: true } },
      _count: { select: { revisionRefs: true } },
    },
  });
  if (!medio) notFound();
  const destinos = await listarDestinos(bd);
  const nombreDestino = new Map(destinos.map((destino) => [destino.clave, destino.nombre]));
  const retirada = medio.reviewState === "RETIRADA";
  const motivo = motivoMedioNoPublicable({ ...medio, retirada, reviewState: retirada ? "RETIRADA" : "AUTORIZADA" });
  const destinosPosibles = destinos.filter((destino) => (medio.kind === "LOGO") === (destino.hueco === "PATROCINADOR_LOGO"));

  return (
    <>
      <Seccion
        titulo={medio.altText ?? "Imagen sin texto alternativo"}
        id="imagen"
        acciones={
          <Chip tono={medio.reviewState === "PUBLICADA" || medio.reviewState === "AUTORIZADA" ? "ok" : retirada ? "error" : "aviso"}>
            {NOMBRE_ESTADO_MEDIO[medio.reviewState]}
          </Chip>
        }
      >
        <div className="vista-medio">
          {medio.variants.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element -- vista privada servida por el panel
            <img src={`/admin/imagenes/${medio.id}/vista`} alt={medio.altText ?? ""} />
          ) : (
            <p className="ayuda">Los archivos de esta imagen ya se han borrado.</p>
          )}
        </div>
        <dl className="dl-datos">
          <dt>Medidas</dt>
          <dd>
            {medio.width}×{medio.height} px · {(medio.sizeBytes / 1024 / 1024).toFixed(1)} MB · {medio.sourceMime}
          </dd>
          <dt>Subida</dt>
          <dd>
            {formatearFechaHora(medio.createdAt.toISOString())} · {medio.uploadedBy?.name ?? "—"}
          </dd>
          <dt>Versiones web</dt>
          <dd>{medio.variants.map((variante) => `${variante.format.toLowerCase()} ${variante.width}px`).join(" · ") || "—"}</dd>
          <dt>Usada en versiones publicadas</dt>
          <dd>{medio._count.revisionRefs}</dd>
          {medio.consentConfirmedAt && (
            <>
              <dt>Consentimiento confirmado</dt>
              <dd>
                {formatearFechaHora(medio.consentConfirmedAt.toISOString())} · {medio.consentConfirmedBy?.name ?? "—"}
              </dd>
            </>
          )}
          {retirada && medio.retiredReason && (
            <>
              <dt>Retirada</dt>
              <dd>{NOMBRE_MOTIVO_RETIRADA[medio.retiredReason]}</dd>
            </>
          )}
        </dl>
      </Seccion>

      {!retirada && (
        <Seccion titulo="Datos y derechos" id="datos">
          <FormularioAccion accion={accionGuardarImagen} boton="Guardar">
            <input type="hidden" name="_id" value={medio.id} />
            <input type="hidden" name="_version" value={medio.version} />
            <div className="cms-campos">
              <div className="campo">
                <label htmlFor="kind">Tipo</label>
                <select id="kind" name="kind" defaultValue={medio.kind}>
                  {OPCIONES.tipoMedio.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div className="campo campo--ancho">
                <label htmlFor="altText">Texto alternativo (obligatorio para publicar)</label>
                <input id="altText" name="altText" maxLength={250} defaultValue={medio.altText ?? ""} />
                <p className="ayuda">Describe lo que se ve, sin datos personales que no aparezcan ya en la web.</p>
              </div>
              <div className="campo">
                <label htmlFor="caption">Pie de foto (opcional)</label>
                <input id="caption" name="caption" maxLength={160} defaultValue={medio.caption ?? ""} />
              </div>
              <div className="campo">
                <label htmlFor="description">Notas internas (opcional)</label>
                <input id="description" name="description" maxLength={1000} defaultValue={medio.description ?? ""} />
              </div>
              <div className="campo">
                <label htmlFor="focalX">Punto focal horizontal (%)</label>
                <input id="focalX" name="focalX" type="number" min={0} max={100} defaultValue={Math.round(medio.focalX * 100)} />
              </div>
              <div className="campo">
                <label htmlFor="focalY">Punto focal vertical (%)</label>
                <input id="focalY" name="focalY" type="number" min={0} max={100} defaultValue={Math.round(medio.focalY * 100)} />
              </div>
              <Casilla nombre="hasIdentifiablePeople" etiqueta="Aparecen personas reconocibles" marcada={medio.hasIdentifiablePeople} />
              <Casilla
                nombre="consentConfirmed"
                etiqueta="Tengo su consentimiento para publicarla"
                marcada={medio.consentConfirmed}
              />
              <Casilla nombre="includesMinors" etiqueta="Aparecen menores" marcada={medio.includesMinors} />
              <Casilla
                nombre="guardianConsentConfirmed"
                etiqueta="Tengo la autorización de sus tutores"
                marcada={medio.guardianConsentConfirmed}
                ayuda="Imprescindible si aparecen menores."
              />
            </div>
            <p className="ayuda">Si cambias los datos de derechos de una imagen autorizada, vuelve a revisión.</p>
          </FormularioAccion>
        </Seccion>
      )}

      {!retirada && (
        <Seccion titulo="Revisión" id="revision">
          {medio.reviewState === "AUTORIZADA" || medio.reviewState === "PUBLICADA" ? (
            <>
              <p>Autorizada para publicar.</p>
              <FormularioAccion accion={accionEstadoImagen} boton="Volver a revisión">
                <input type="hidden" name="_id" value={medio.id} />
                <input type="hidden" name="_version" value={medio.version} />
                <input type="hidden" name="_cambio" value="volver-a-revision" />
              </FormularioAccion>
            </>
          ) : (
            <>
              {motivo ? <p className="nota">Todavía no se puede autorizar: {motivo}.</p> : <p>Lista para autorizar.</p>}
              <div className="cms-en-linea">
                {medio.reviewState === "SUBIDA" && (
                  <FormularioAccion accion={accionEstadoImagen} boton="Enviar a revisión">
                    <input type="hidden" name="_id" value={medio.id} />
                    <input type="hidden" name="_version" value={medio.version} />
                    <input type="hidden" name="_cambio" value="enviar-a-revision" />
                  </FormularioAccion>
                )}
                <FormularioAccion accion={accionEstadoImagen} boton="Autorizar para publicar">
                  <input type="hidden" name="_id" value={medio.id} />
                  <input type="hidden" name="_version" value={medio.version} />
                  <input type="hidden" name="_cambio" value="autorizar" />
                </FormularioAccion>
              </div>
            </>
          )}
        </Seccion>
      )}

      {!retirada && (
        <Seccion titulo="Dónde se usa" id="usos">
          {medio.usages.length === 0 ? (
            <p className="ayuda">Todavía no está asignada a ningún hueco.</p>
          ) : (
            <ul className="historial-lista">
              {medio.usages.map((uso) => {
                const destino =
                  uso.heroContentId ?? uso.familyMemberId ?? uso.familyContentId ?? uso.dayContentId ?? uso.routeId ?? uso.sponsorId ?? uso.closingContentId ?? uso.siteSettingsId ?? "";
                return (
                  <li key={uso.id} className="cms-en-linea">
                    <span>{nombreDestino.get(claveDestino(uso.slot as Hueco, destino, uso.sortOrder)) ?? uso.slot}</span>
                    <FormularioAccion accion={accionQuitarUso} boton="Quitar">
                      <input type="hidden" name="_uso" value={uso.id} />
                    </FormularioAccion>
                  </li>
                );
              })}
            </ul>
          )}
          {destinosPosibles.length > 0 && (
            <FormularioAccion accion={accionAsignarImagen} boton="Asignar">
              <input type="hidden" name="_id" value={medio.id} />
              <div className="campo">
                <label htmlFor="destino">Usar en</label>
                <select id="destino" name="destino" required defaultValue="">
                  <option value="" disabled>
                    Elige un hueco
                  </option>
                  {destinosPosibles.map((destino) => (
                    <option key={destino.clave} value={destino.clave}>
                      {destino.nombre}
                    </option>
                  ))}
                </select>
                <p className="ayuda">Si el hueco ya tenía una imagen, esta la sustituye en el borrador.</p>
              </div>
            </FormularioAccion>
          )}
        </Seccion>
      )}

      {/* Siempre montada: tras retirar, se conserva el mensaje con el resultado. */}
      <Seccion titulo={retirada ? "Retirada" : "Retirar"} id="retirar">
        <p className="ayuda">
          {retirada
            ? "Esta imagen ya no se sirve en la web. Sus archivos se borran automáticamente pasado el plazo de Configuración."
            : "Deja de servirse en la web al momento y sale del borrador. Úsalo, por ejemplo, si alguien retira su consentimiento."}
        </p>
        <FormularioAccion accion={accionRetirarImagen} boton="Retirar la imagen" peligro deshabilitado={retirada}>
          <input type="hidden" name="_id" value={medio.id} />
          <input type="hidden" name="_version" value={medio.version} />
          {!retirada && (
            <>
              <div className="campo">
                <label htmlFor="motivo">Motivo</label>
                <select id="motivo" name="motivo" defaultValue="CONSENTIMIENTO_RETIRADO">
                  {OPCIONES.motivoRetirada.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <label className="campo--casilla">
                <input type="checkbox" name="quitarDeLaWeb" value="si" defaultChecked /> Quitarla también de la versión
                publicada ahora (se publica una copia de la versión vigente sin ella; el resto del borrador no se publica).
              </label>
              <label className="campo--casilla">
                <input type="checkbox" name="_confirmar" value="si" required /> Confirmo que quiero retirarla.
              </label>
            </>
          )}
        </FormularioAccion>
      </Seccion>
    </>
  );
}
