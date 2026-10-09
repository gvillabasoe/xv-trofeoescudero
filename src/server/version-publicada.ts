import { randomUUID } from "node:crypto";
import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { leerSnapshotGuardado } from "@/lib/snapshot/leer";
import type { ConsultasBD } from "@/server/db";

export interface VersionPublicada {
  revisionId: string;
  numero: number;
  /** Versión de esquema con la que se publicó (1 o 2). */
  versionEsquema: number;
  contentHash: string;
  publicadaEn: string;
  /** Siempre en la forma vigente (versión 2): las revisiones antiguas se normalizan al leerlas. */
  snapshot: SnapshotPublico;
  /** Cuándo se leyó de la base. */
  leidaEn: string;
  /** Identificador aleatorio de esta lectura: si cambia, la consulta se ha vuelto a ejecutar. */
  lecturaId: string;
}

/**
 * Lee la versión publicada vigente (y solo esa): SiteState → ContentRevision.
 * Sin caché: la envuelve leerVersionPublicada (snapshot-publico.ts). Se usa directamente en los tests.
 */
export async function leerVersionPublicadaDe(bd: ConsultasBD): Promise<VersionPublicada | null> {
  const estado = await bd.siteState.findUnique({
    where: { id: 1 },
    select: {
      publishedRevision: {
        select: {
          id: true,
          revisionNumber: true,
          schemaVersion: true,
          contentHash: true,
          publishedAt: true,
          snapshot: true,
        },
      },
    },
  });
  const revision = estado?.publishedRevision;
  if (!revision) {
    return null;
  }

  return {
    revisionId: revision.id,
    numero: revision.revisionNumber,
    versionEsquema: revision.schemaVersion,
    contentHash: revision.contentHash,
    publicadaEn: revision.publishedAt.toISOString(),
    snapshot: leerSnapshotGuardado(revision.snapshot).snapshot,
    leidaEn: new Date().toISOString(),
    lecturaId: randomUUID().slice(0, 8),
  };
}
