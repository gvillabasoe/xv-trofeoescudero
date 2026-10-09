import type { Metadata } from "next";
import { ListaElementos } from "@/components/panel/lista-elementos";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { valoresDe } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Categorías de marcas" };

export default function PaginaCategorias() {
  return (
    <PaginaPanel
      titulo="Categorías de marcas"
      descripcion="Categorías comerciales. Las que exigen revisión jurídica (p. ej., bodega / vino) solo se publican con la revisión aprobada."
      migas={[{ href: "/admin/patrocinadores", texto: "Marcas" }]}
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const categorias = await obtenerPrisma().sponsorCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { sponsors: true } } },
  });
  return (
    <Seccion titulo="Categorías" id="categorias">
      <p className="ayuda">Solo se puede borrar una categoría sin entidades.</p>
      <ListaElementos
        entidad="categoria"
        campos={REGISTRO.categoria.campos}
        valoresCreacion={{}}
        tituloAnadir="Añadir una categoría"
        elementos={categorias.map((categoria) => ({
          id: categoria.id,
          version: categoria.version,
          resumen: `${categoria.name} (${categoria._count.sponsors})`,
          detalle: categoria.requiresLegalReview ? <Chip tono="aviso">Revisión jurídica</Chip> : null,
          valores: valoresDe(categoria, REGISTRO.categoria.campos),
        }))}
      />
    </Seccion>
  );
}
