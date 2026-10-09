import type { Metadata } from "next";
import Link from "next/link";
import { Chip, PaginaPanel } from "@/components/panel/pagina";
import { formatearFechaHora } from "@/lib/estado-base";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";

export const metadata: Metadata = { title: "Versiones" };

export default function PaginaVersiones() {
  return (
    <PaginaPanel
      titulo="Versiones publicadas"
      descripcion="Cada publicación es una versión inmutable. Se puede restaurar cualquiera: se publica como una versión nueva, revisada con los derechos de hoy."
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const bd = obtenerPrisma();
  const [revisiones, estado] = await Promise.all([
    bd.contentRevision.findMany({
      orderBy: { revisionNumber: "desc" },
      take: 200,
      select: {
        id: true,
        revisionNumber: true,
        schemaVersion: true,
        publishedAt: true,
        publishComment: true,
        createdBy: { select: { name: true } },
        sourceRevision: { select: { revisionNumber: true } },
        _count: { select: { mediaRefs: true } },
      },
    }),
    bd.siteState.findUnique({ where: { id: 1 }, select: { publishedRevisionId: true } }),
  ]);
  return (
    <div className="tabla-contenedor">
      <table className="tabla">
        <caption className="visually-hidden">Versiones publicadas</caption>
        <thead>
          <tr>
            <th scope="col">Nº</th>
            <th scope="col">Publicada</th>
            <th scope="col">Por</th>
            <th scope="col">Comentario</th>
            <th scope="col">Imágenes</th>
          </tr>
        </thead>
        <tbody>
          {revisiones.map((revision) => (
            <tr key={revision.id}>
              <td>
                <Link href={`/admin/versiones/${revision.revisionNumber}`}>nº {revision.revisionNumber}</Link>{" "}
                {revision.id === estado?.publishedRevisionId && <Chip tono="ok">En la web</Chip>}
              </td>
              <td>{formatearFechaHora(revision.publishedAt.toISOString())}</td>
              <td>{revision.createdBy?.name ?? "Sistema"}</td>
              <td>
                {revision.publishComment ?? "—"}
                {revision.sourceRevision && <span className="ayuda"> · restaura la nº {revision.sourceRevision.revisionNumber}</span>}
              </td>
              <td>{revision._count.mediaRefs}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
