import type { Metadata } from "next";
import Link from "next/link";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";

export const metadata: Metadata = { title: "Textos legales" };

export default function PaginaLegales() {
  return (
    <PaginaPanel
      titulo="Textos legales"
      descripcion="Política de privacidad y aviso legal (P2). Los redacta la organización: el panel no genera textos legales. Mientras no haya una política de privacidad publicada, el formulario de /proponer permanece cerrado."
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const paginas = await obtenerPrisma().legalPage.findMany({
    orderBy: { slug: "desc" },
    include: { versions: { orderBy: { publishedAt: "desc" }, take: 1 } },
  });
  return (
    <div className="cms-elementos">
      {paginas.map((pagina) => {
        const vigente = pagina.versions[0];
        return (
          <Seccion
            key={pagina.id}
            titulo={pagina.title}
            id={`legal-${pagina.slug}`}
            acciones={
              <Link className="boton boton--secundario" href={`/admin/legal/${pagina.slug}`}>
                Editar y publicar
              </Link>
            }
          >
            <p className="cms-en-linea">
              {vigente ? (
                <Chip tono="ok">
                  Publicada {vigente.versionLabel} · {formatearFechaHora(vigente.publishedAt.toISOString())}
                </Chip>
              ) : (
                <Chip tono="aviso">Sin publicar</Chip>
              )}
              {pagina.isComplete ? <Chip tono="ok">Texto completo</Chip> : <Chip tono="aviso">Texto incompleto</Chip>}
              {pagina.slug === "privacidad" && !vigente && <Chip tono="error">El formulario está cerrado</Chip>}
            </p>
          </Seccion>
        );
      })}
    </div>
  );
}
