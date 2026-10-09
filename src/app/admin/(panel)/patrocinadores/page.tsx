import type { Metadata } from "next";
import Link from "next/link";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { NOMBRE_PERMISO_LOGO, NOMBRE_RELACION, NOMBRE_REVISION_JURIDICA } from "@/lib/panel/opciones";
import { esPatrocinadorPublicable } from "@/lib/snapshot/construir";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Marcas" };

export default function PaginaPatrocinadores({ searchParams }: PageProps<"/admin/patrocinadores">) {
  return (
    <PaginaPanel
      titulo="Marcas: patrocinadores y colaboradores"
      descripcion="Solo relaciones reales y confirmadas. La visibilidad en el muro es un interruptor aparte: activarlo no cambia el hecho histórico."
    >
      <Contenido searchParams={searchParams} />
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/patrocinadores">["searchParams"] }) {
  await requerirAdmin({ exigirTotp: true });
  const archivadas = (await searchParams).ver === "archivadas";
  const bd = obtenerPrisma();
  const [entidades, categorias] = await Promise.all([
    bd.sponsor.findMany({
      where: { lifecycle: archivadas ? "ARCHIVADO" : "ACTIVO" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { category: true, _count: { select: { mediaUsages: true } } },
    }),
    bd.sponsorCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const opcionesCategoria = categorias.map((categoria) => ({ valor: categoria.id, etiqueta: categoria.name }));

  return (
    <>
      <p className="cms-en-linea">
        <Link className="boton boton--secundario" href={archivadas ? "/admin/patrocinadores" : "/admin/patrocinadores?ver=archivadas"}>
          {archivadas ? "Ver las activas" : "Ver las archivadas"}
        </Link>
        <Link className="boton boton--secundario" href="/admin/patrocinadores/categorias">
          Categorías
        </Link>
      </p>
      <div className="tabla-contenedor">
        <table className="tabla">
          <caption className="visually-hidden">Entidades {archivadas ? "archivadas" : "activas"}</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Relación</th>
              <th scope="col">Categoría</th>
              <th scope="col">En el muro</th>
              <th scope="col">Logo</th>
              <th scope="col">Revisión jurídica</th>
            </tr>
          </thead>
          <tbody>
            {entidades.map((entidad) => {
              const publicable = esPatrocinadorPublicable({
                ...entidad,
                category: entidad.category.name,
                categoryRequiresLegalReview: entidad.category.requiresLegalReview,
              });
              return (
                <tr key={entidad.id}>
                  <td>
                    <Link href={`/admin/patrocinadores/${entidad.id}`}>{entidad.name}</Link>
                    {entidad.currentRoleLabel && <span className="ayuda"> · {entidad.currentRoleLabel}</span>}
                  </td>
                  <td>
                    {NOMBRE_RELACION[entidad.relationshipType]}
                    {!entidad.confirmed && <Chip tono="error">Sin confirmar</Chip>}
                  </td>
                  <td>{entidad.category.name}</td>
                  <td>{publicable ? <Chip tono="ok">Se publica</Chip> : <Chip tono="aviso">No se publica</Chip>}</td>
                  <td>
                    {NOMBRE_PERMISO_LOGO[entidad.logoPermission]}
                    {entidad._count.mediaUsages > 0 && " · logo asignado"}
                  </td>
                  <td>{NOMBRE_REVISION_JURIDICA[entidad.legalReview]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!archivadas && (
        <Seccion titulo="Registrar una entidad" id="nueva">
          <p className="ayuda">
            Solo patrocinadores o colaboradores reales con la relación confirmada. Nunca marcas candidatas, prospección ni
            datos de contacto de marcas.
          </p>
          <FormularioEntidad
            modo="crear"
            entidad="patrocinador"
            campos={REGISTRO.patrocinador.campos}
            opcionesDinamicas={{ categoryId: opcionesCategoria }}
            valores={{
              relationshipType: "PATROCINADOR",
              temporalRelation: "ACTUAL",
              source: "ORGANIZACION",
              logoPermission: "PENDIENTE",
              legalReview: "PENDIENTE",
              categoryId: categorias[0]?.id ?? "",
            }}
            boton="Registrar"
          />
        </Seccion>
      )}
    </>
  );
}
