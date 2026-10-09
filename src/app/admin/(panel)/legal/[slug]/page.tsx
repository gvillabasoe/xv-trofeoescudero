import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioAccion } from "@/components/panel/formulario-accion";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { TextoLegal } from "@/components/publico/texto-legal";
import { formatearFechaHora } from "@/lib/estado-base";
import { valoresDe } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";
import { accionPublicarLegal } from "../acciones";

export const metadata: Metadata = { title: "Editar un texto legal" };

export default function PaginaLegal({ params }: PageProps<"/admin/legal/[slug]">) {
  return (
    <PaginaPanel titulo="Editar un texto legal" migas={[{ href: "/admin/legal", texto: "Textos legales" }]}>
      <Contenido params={params} />
    </PaginaPanel>
  );
}

async function Contenido({ params }: { params: PageProps<"/admin/legal/[slug]">["params"] }) {
  await requerirAdmin({ exigirTotp: true });
  const { slug } = await params;
  const pagina = await obtenerPrisma().legalPage.findUnique({
    where: { slug },
    include: { versions: { orderBy: { publishedAt: "desc" }, include: { _count: { select: { submissions: true } } } } },
  });
  if (!pagina) notFound();
  const vigente = pagina.versions[0];
  const cambiado = vigente ? vigente.body !== pagina.body.trim() : true;

  return (
    <>
      <Seccion
        titulo={pagina.title}
        id="texto"
        acciones={vigente ? <Chip tono="ok">Vigente: {vigente.versionLabel}</Chip> : <Chip tono="aviso">Sin publicar</Chip>}
      >
        <p className="ayuda">
          Guardar no publica: la web sigue mostrando la versión vigente. Cada publicación crea una versión nueva e
          inmutable; las propuestas guardan la versión exacta que se aceptó.
        </p>
        <FormularioEntidad
          entidad="legal"
          id={pagina.id}
          version={pagina.version}
          campos={REGISTRO.legal.campos}
          valores={valoresDe(pagina, REGISTRO.legal.campos)}
        />
      </Seccion>

      <Seccion titulo="Publicar este texto" id="publicar">
        {!pagina.isComplete ? (
          <p className="nota">Para publicar, marca «Texto completo y revisado» y guarda.</p>
        ) : !cambiado && vigente ? (
          <p className="nota">
            El texto guardado es la versión vigente ({vigente.versionLabel}, publicada el{" "}
            {formatearFechaHora(vigente.publishedAt.toISOString())}): no hay nada nuevo que publicar.
          </p>
        ) : null}
        {/* Siempre montado: así se conserva el mensaje de la última publicación. */}
        <FormularioAccion
          accion={accionPublicarLegal}
          boton="Publicar una versión nueva"
          enviandoTexto="Publicando…"
          deshabilitado={!pagina.isComplete || !cambiado}
        >
          <input type="hidden" name="_id" value={pagina.id} />
          <input type="hidden" name="_version" value={pagina.version} />
          {pagina.isComplete && cambiado && (
            <label className="campo--casilla">
              <input type="checkbox" name="_confirmar" value="si" required /> Confirmo que el texto guardado está revisado
              y quiero publicarlo ya.
            </label>
          )}
        </FormularioAccion>
      </Seccion>

      {pagina.body.trim() && (
        <Seccion titulo="Así se verá (texto guardado)" id="vista">
          <TextoLegal fuente={pagina.body} />
        </Seccion>
      )}

      <Seccion titulo="Versiones publicadas" id="versiones">
        {pagina.versions.length === 0 ? (
          <p className="ayuda">Todavía no hay ninguna.</p>
        ) : (
          <ul className="historial-lista">
            {pagina.versions.map((version) => (
              <li key={version.id}>
                <strong>{version.versionLabel}</strong> · {formatearFechaHora(version.publishedAt.toISOString())} ·{" "}
                {version._count.submissions} propuestas la aceptaron
              </li>
            ))}
          </ul>
        )}
      </Seccion>
    </>
  );
}
