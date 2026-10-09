import type { Metadata } from "next";
import Link from "next/link";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { valoresDe } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Vías y hoyos" };

export default function PaginaColaboraciones() {
  return (
    <PaginaPanel
      titulo="Vías y hoyos"
      descripcion="Las cuatro vías de colaboración, sus textos de detalle, las oportunidades (con su estado comercial privado) y los 18 hoyos."
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const bd = obtenerPrisma();
  const vias = await bd.collaborationRoute.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true, opportunities: true } } },
  });
  const concursos = await bd.competitionHole.count({ where: { contestType: { not: null } } });

  return (
    <>
      {vias.map((via) => (
        <Seccion
          key={via.id}
          id={`via-${via.key.toLowerCase()}`}
          titulo={`${String(via.number).padStart(2, "0")} · ${via.title}`}
          acciones={
            <span className="cms-en-linea">
              {via.isVisible ? <Chip tono="ok">Visible</Chip> : <Chip tono="aviso">Oculta</Chip>}
              <Link className="boton boton--secundario" href={`/admin/colaboraciones/${via.key.toLowerCase()}`}>
                Detalle y oportunidades ({via._count.items} textos · {via._count.opportunities} oportunidades)
              </Link>
            </span>
          }
        >
          <FormularioEntidad
            entidad="via"
            id={via.id}
            version={via.version}
            campos={REGISTRO.via.campos}
            valores={valoresDe(via, REGISTRO.via.campos)}
          />
        </Seccion>
      ))}
      <Seccion
        titulo="Los 18 hoyos"
        id="hoyos"
        acciones={
          <Link className="boton boton--secundario" href="/admin/colaboraciones/hoyos">
            Editar los hoyos
          </Link>
        }
      >
        <p>
          {concursos} hoyos con concurso. El campo (Norte, Sur o ambos) solo se muestra cuando lo confirmes y actives su
          interruptor.
        </p>
      </Seccion>
    </>
  );
}
