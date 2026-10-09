import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioAccion } from "@/components/panel/formulario-accion";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { formatearFechaHora } from "@/lib/estado-base";
import { intentarLeerSnapshot } from "@/lib/snapshot/leer";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { accionRestaurar } from "../acciones";

export const metadata: Metadata = { title: "Versión publicada" };

export default function PaginaVersion({ params }: PageProps<"/admin/versiones/[numero]">) {
  return (
    <PaginaPanel titulo="Versión publicada" migas={[{ href: "/admin/versiones", texto: "Versiones" }]}>
      <Contenido params={params} />
    </PaginaPanel>
  );
}

async function Contenido({ params }: { params: PageProps<"/admin/versiones/[numero]">["params"] }) {
  await requerirAdmin({ exigirTotp: true });
  const { numero } = await params;
  if (!/^\d+$/.test(numero)) notFound();
  const bd = obtenerPrisma();
  const [revision, estado] = await Promise.all([
    bd.contentRevision.findUnique({
      where: { revisionNumber: Number(numero) },
      include: { createdBy: { select: { name: true } } },
    }),
    bd.siteState.findUnique({ where: { id: 1 }, select: { publishedRevisionId: true, version: true } }),
  ]);
  if (!revision) notFound();
  const lectura = intentarLeerSnapshot(revision.snapshot);
  const snapshot = lectura?.snapshot;
  const vigente = revision.id === estado?.publishedRevisionId;

  return (
    <>
      <Seccion
        titulo={`Versión nº ${revision.revisionNumber}`}
        id="version"
        acciones={vigente ? <Chip tono="ok">Es la que está en la web</Chip> : undefined}
      >
        <dl className="dl-datos">
          <dt>Publicada</dt>
          <dd>{formatearFechaHora(revision.publishedAt.toISOString())}</dd>
          <dt>Por</dt>
          <dd>{revision.createdBy?.name ?? "Sistema"}</dd>
          <dt>Comentario</dt>
          <dd>{revision.publishComment ?? "—"}</dd>
          <dt>Esquema</dt>
          <dd>versión {revision.schemaVersion}</dd>
          <dt>Huella</dt>
          <dd>
            <code>{revision.contentHash}</code>
          </dd>
        </dl>
      </Seccion>

      {snapshot ? (
        <Seccion titulo="Contenido" id="contenido">
          <dl className="dl-datos">
            <dt>Hero</dt>
            <dd>
              {snapshot.hero.tituloLinea1} {snapshot.hero.tituloLinea2}
            </dd>
            <dt>Bloques visibles</dt>
            <dd>
              {["Hero", snapshot.familia && "La familia", snapshot.dia && "El día", "Colaborar", snapshot.cierre && "Cierre"]
                .filter(Boolean)
                .join(" · ")}
            </dd>
            <dt>Vías</dt>
            <dd>{snapshot.colaborar.vias.map((via) => via.titulo).join(" · ")}</dd>
            <dt>Hoyos con concurso</dt>
            <dd>{snapshot.colaborar.concursos.hoyos.map((hoyo) => hoyo.numero).join(", ") || "—"}</dd>
            <dt>Marcas en el muro</dt>
            <dd>{snapshot.cierre?.historial.marcas.map((marca) => marca.nombre).join(", ") || "—"}</dd>
            <dt>Canales de contacto</dt>
            <dd>{snapshot.contacto.map((canal) => canal.etiqueta).join(", ") || "—"}</dd>
          </dl>
        </Seccion>
      ) : (
        <p className="nota nota--error">Esta versión no se puede leer con el esquema actual.</p>
      )}

      {!vigente && snapshot && estado && (
        <Seccion titulo="Restaurar esta versión" id="restaurar">
          <p className="ayuda">
            Se publica como una versión nueva. Antes se revisa con los derechos de hoy: se quitan las marcas que ya no
            cumplen la regla, las imágenes retiradas o sin consentimiento y los canales inactivos. El borrador no cambia.
          </p>
          <FormularioAccion accion={accionRestaurar} boton="Restaurar y publicar" enviandoTexto="Restaurando…">
            <input type="hidden" name="_numero" value={revision.revisionNumber} />
            <input type="hidden" name="_version" value={estado.version} />
            <label className="campo--casilla">
              <input type="checkbox" name="_confirmar" value="si" required /> Quiero publicar de nuevo esta versión.
            </label>
          </FormularioAccion>
        </Seccion>
      )}
    </>
  );
}
