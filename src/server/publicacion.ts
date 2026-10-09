import type { Prisma } from "@/generated/prisma/client";
import { prepararSnapshot } from "@/lib/snapshot/construir";
import { VERSION_ESQUEMA_SNAPSHOT } from "@/lib/snapshot/esquema";
import { hashContenido } from "@/lib/snapshot/hash";
import { leerBorrador } from "@/server/borrador";
import type { ClienteBD, ConsultasBD } from "@/server/db";

/** Otro administrador publicó mientras tanto: hay que revisar antes de volver a publicar. */
export class ConflictoDeVersion extends Error {
  constructor() {
    super("Otro administrador ha publicado mientras tanto. Revisa la versión actual antes de publicar.");
    this.name = "ConflictoDeVersion";
  }
}

export interface OpcionesPublicacion {
  /** Administrador que publica; null si publica el sistema (bootstrap). */
  actorId: string | null;
  comentario?: string | null;
  /** SiteState.version que vio quien publica (control optimista). */
  versionEsperada?: number;
}

export type ResultadoPublicacion =
  | { publicada: true; numero: number; revisionId: string }
  | { publicada: false; numero: number; motivo: "identica" };

/**
 * Publica el borrador como una revisión nueva e inmutable (fase-2 §8), dentro de una transacción existente.
 * La revisión, el estado y la auditoría se escriben juntos o no se escribe nada: no hay publicaciones parciales.
 * No invalida la caché: lo hace quien la llama desde una Server Action (src/server/cache/invalidar-sitio.ts).
 */
export async function publicarEnTransaccion(
  tx: ConsultasBD,
  opciones: OpcionesPublicacion,
): Promise<ResultadoPublicacion> {
  const { actorId, comentario = null, versionEsperada } = opciones;

  const estado = await tx.siteState.findUnique({
    where: { id: 1 },
    include: { publishedRevision: { select: { contentHash: true, revisionNumber: true } } },
  });
  if (versionEsperada !== undefined && (estado?.version ?? 0) !== versionEsperada) {
    throw new ConflictoDeVersion();
  }

  // Valida el contenido y aplica la lista blanca del snapshot y las reglas de privacidad.
  const snapshot = prepararSnapshot(await leerBorrador(tx));
  const contentHash = hashContenido(snapshot);

  if (estado?.publishedRevision && estado.publishedRevision.contentHash === contentHash) {
    return { publicada: false, numero: estado.publishedRevision.revisionNumber, motivo: "identica" };
  }

  const ultima = await tx.contentRevision.aggregate({ _max: { revisionNumber: true } });
  const numero = (ultima._max.revisionNumber ?? 0) + 1;
  const ahora = new Date();

  const revision = await tx.contentRevision.create({
    data: {
      revisionNumber: numero,
      schemaVersion: VERSION_ESQUEMA_SNAPSHOT,
      contentHash,
      snapshot: snapshot as Prisma.InputJsonValue,
      createdById: actorId,
      publishedAt: ahora,
      publishComment: comentario,
    },
  });

  if (estado) {
    const { count } = await tx.siteState.updateMany({
      where: { id: 1, version: estado.version },
      data: {
        publishedRevisionId: revision.id,
        hasUnpublishedChanges: false,
        lastPublishedAt: ahora,
        lastPublishedById: actorId,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConflictoDeVersion();
  } else {
    await tx.siteState.create({
      data: { id: 1, publishedRevisionId: revision.id, lastPublishedAt: ahora, lastPublishedById: actorId },
    });
  }

  await tx.auditLog.create({
    data: {
      actorId,
      actorType: actorId ? "USER" : "SYSTEM",
      action: "PUBLICACION",
      entityType: "ContentRevision",
      entityId: revision.id,
      summary: `Versión nº ${numero} publicada${actorId ? "" : " por el sistema"}`,
    },
  });

  return { publicada: true, numero, revisionId: revision.id };
}

/** Publica en su propia transacción. */
export async function publicar(bd: ClienteBD, opciones: OpcionesPublicacion): Promise<ResultadoPublicacion> {
  return bd.$transaction((tx) => publicarEnTransaccion(tx, opciones), { timeout: 20_000 });
}
