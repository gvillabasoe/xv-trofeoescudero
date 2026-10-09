import { cacheLife, cacheTag } from "next/cache";
import { esquemaSnapshot, type SnapshotPublico } from "@/lib/snapshot/esquema";
import { hayBaseDeDatos, obtenerPrisma } from "@/server/db";

/** Etiqueta de caché de todo lo público. Al publicar se invalida con updateTag(ETIQUETA_SITIO_PUBLICO). */
export const ETIQUETA_SITIO_PUBLICO = "site-public";

export interface VersionPublicada {
  numero: number;
  publicadaEn: string;
  snapshot: SnapshotPublico;
  /** Cuándo se leyó de la base. Mientras la caché sea válida, no cambia entre visitas. */
  leidaEn: string;
}

/**
 * La web pública solo lee esto: el snapshot de la versión publicada, en caché (fase-2 §8, paso 7).
 * No consulta Neon en cada visita: la página se genera en el build y se regenera solo al invalidar la etiqueta.
 */
export async function leerVersionPublicada(): Promise<VersionPublicada | null> {
  "use cache";
  cacheTag(ETIQUETA_SITIO_PUBLICO);
  cacheLife("max");

  if (!hayBaseDeDatos()) {
    return null;
  }

  const estado = await obtenerPrisma().siteState.findUnique({
    where: { id: 1 },
    select: { publishedRevision: { select: { revisionNumber: true, publishedAt: true, snapshot: true } } },
  });
  const revision = estado?.publishedRevision;
  if (!revision) {
    return null;
  }

  return {
    numero: revision.revisionNumber,
    publicadaEn: revision.publishedAt.toISOString(),
    snapshot: esquemaSnapshot.parse(revision.snapshot),
    leidaEn: new Date().toISOString(),
  };
}
