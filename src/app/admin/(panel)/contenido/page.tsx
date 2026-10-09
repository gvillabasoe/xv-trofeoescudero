import type { Metadata } from "next";
import Link from "next/link";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { BLOQUES_PANEL } from "@/lib/panel/bloques";
import { valoresDe } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Textos de la web" };

export default function PaginaContenido() {
  return (
    <PaginaPanel
      titulo="Textos de la web"
      descripcion="Los cinco bloques de la portada. Lo que guardas aquí queda en el borrador: la web no cambia hasta que publiques."
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const bloques = await obtenerPrisma().pageSection.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div className="cms-elementos">
      {bloques.map((bloque) => {
        const info = BLOQUES_PANEL[bloque.key];
        const obligatorio = bloque.key === "HERO" || bloque.key === "COLABORAR";
        return (
          <Seccion
            key={bloque.id}
            id={`bloque-${info.slug}`}
            titulo={info.nombre}
            acciones={
              <span className="cms-en-linea">
                {bloque.isVisible ? <Chip tono="ok">Visible</Chip> : <Chip tono="aviso">Oculto</Chip>}
                <Link className="boton boton--secundario" href={`/admin/contenido/${info.slug}`}>
                  Editar los textos
                </Link>
              </span>
            }
          >
            <FormularioEntidad
              entidad="bloque"
              id={bloque.id}
              version={bloque.version}
              campos={REGISTRO.bloque.campos}
              valores={valoresDe(bloque, REGISTRO.bloque.campos)}
              bloqueados={obligatorio ? ["isVisible"] : []}
            />
            {obligatorio && <p className="ayuda">Este bloque es obligatorio: siempre está visible.</p>}
          </Seccion>
        );
      })}
    </div>
  );
}
