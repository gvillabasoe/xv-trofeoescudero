import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioAccion } from "@/components/panel/formulario-accion";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { valoresDe } from "@/lib/panel/campos";
import { esPatrocinadorPublicable } from "@/lib/snapshot/construir";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";
import { accionArchivarPatrocinador } from "../acciones";

export const metadata: Metadata = { title: "Editar una entidad" };

export default function PaginaPatrocinador({ params }: PageProps<"/admin/patrocinadores/[id]">) {
  return (
    <PaginaPanel titulo="Editar una entidad" migas={[{ href: "/admin/patrocinadores", texto: "Marcas" }]}>
      <Contenido params={params} />
    </PaginaPanel>
  );
}

async function Contenido({ params }: { params: PageProps<"/admin/patrocinadores/[id]">["params"] }) {
  await requerirAdmin({ exigirTotp: true });
  const { id } = await params;
  const bd = obtenerPrisma();
  const entidad = await bd.sponsor.findUnique({
    where: { id },
    include: { category: true, mediaUsages: { include: { media: { select: { id: true, reviewState: true } } } } },
  });
  if (!entidad) notFound();
  const categorias = await bd.sponsorCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const publicable = esPatrocinadorPublicable({
    ...entidad,
    category: entidad.category.name,
    categoryRequiresLegalReview: entidad.category.requiresLegalReview,
  });
  const motivos: string[] = [];
  if (!entidad.confirmed) motivos.push("la relación no está confirmada");
  if (!entidad.publicVisibility) motivos.push("el interruptor «Mostrar en el muro de marcas» está apagado");
  if (entidad.lifecycle !== "ACTIVO") motivos.push("está archivada");
  if (entidad.category.requiresLegalReview && entidad.legalReview !== "APROBADA") {
    motivos.push("su categoría exige revisión jurídica aprobada");
  } else if (entidad.legalReview === "PENDIENTE" || entidad.legalReview === "RECHAZADA") {
    motivos.push("la revisión jurídica está pendiente o rechazada");
  }

  return (
    <>
      <Seccion
        titulo={entidad.name}
        id="entidad"
        acciones={publicable ? <Chip tono="ok">Se publica en el muro</Chip> : <Chip tono="aviso">No se publica</Chip>}
      >
        {!publicable && motivos.length > 0 && <p className="nota">No se publica porque {motivos.join(", ")}.</p>}
        <FormularioEntidad
          entidad="patrocinador"
          id={entidad.id}
          version={entidad.version}
          campos={REGISTRO.patrocinador.campos}
          valores={valoresDe(entidad, REGISTRO.patrocinador.campos)}
          opcionesDinamicas={{ categoryId: categorias.map((categoria) => ({ valor: categoria.id, etiqueta: categoria.name })) }}
        />
      </Seccion>

      <Seccion titulo="Logo" id="logo">
        <p>
          {entidad.mediaUsages.length > 0
            ? "Tiene un logo asignado. "
            : "Sin logo: el muro muestra el nombre en tipografía. "}
          El logo solo se publica con el permiso «Autorizado» y la imagen autorizada en la biblioteca.
        </p>
        <p>
          <Link className="boton boton--secundario" href="/admin/imagenes">
            Ir a Imágenes
          </Link>
        </p>
      </Seccion>

      <Seccion titulo={entidad.lifecycle === "ACTIVO" ? "Archivar" : "Recuperar"} id="archivo">
        <p className="ayuda">
          Archivar la retira del muro sin borrar el hecho histórico. Se puede recuperar en cualquier momento.
        </p>
        <FormularioAccion
          accion={accionArchivarPatrocinador}
          boton={entidad.lifecycle === "ACTIVO" ? "Archivar la entidad" : "Recuperar la entidad"}
        >
          <input type="hidden" name="_id" value={entidad.id} />
          <input type="hidden" name="_version" value={entidad.version} />
          <input type="hidden" name="_accion" value={entidad.lifecycle === "ACTIVO" ? "archivar" : "recuperar"} />
        </FormularioAccion>
      </Seccion>
    </>
  );
}
