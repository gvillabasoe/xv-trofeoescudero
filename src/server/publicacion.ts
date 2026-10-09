import type { Prisma } from "@/generated/prisma/client";
import { prepararSnapshot } from "@/lib/snapshot/construir";
import { VERSION_ESQUEMA_SNAPSHOT } from "@/lib/snapshot/esquema";
import { hashContenido } from "@/lib/snapshot/hash";
import { leerBorrador } from "@/server/borrador";
import type { ClienteBD } from "@/server/db";

/** Otro administrador publicó mientras tanto: hay que revisar antes de volver a publicar. */
export class ConflictoDeVersion extends Error {
  constructor() {
    super("Otro administrador ha publicado mientras tanto. Revisa la versión actual antes de publicar.");
    this.name = "ConflictoDeVersion";
  }
}

export interface OpcionesPublicacion {
  /** Administrador que publica; null si publica el seed. */
  actorId: string | null;
  comentario?: string | null;
  /** SiteState.version que vio quien publica (control optimista). */
  versionEsperada?: number;
}

export type ResultadoPublicacion =
  | { publicada: true; numero: number }
  | { publicada: false; numero: number; motivo: "identica" };

/**
 * Publica el borrador como una revisión nueva e inmutable (fase-2 §8).
 * No invalida la caché: lo hace quien la llama desde una Server Action, con updateTag("site-public").
 * El build de Vercel no lo necesita, porque genera la web desde cero.
 */
export async function publicar(bd: ClienteBD, opciones: OpcionesPublicacion): Promise<ResultadoPublicacion> {
  const { actorId, comentario = null, versionEsperada } = opciones;

  return bd.$transaction(
    async (tx) => {
      const estado = await tx.siteState.findUnique({
        where: { id: 1 },
        include: { publishedRevision: { select: { contentHash: true, revisionNumber: true } } },
      });
      if (versionEsperada !== undefined && (estado?.version ?? 0) !== versionEsperada) {
        throw new ConflictoDeVersion();
      }

      // Valida el contenido y aplica las reglas de publicación y privacidad.
      const snapshot = prepararSnapshot(await leerBorrador(tx));
      const contentHash = hashContenido(snapshot);

      if (estado?.publishedRevision && estado.publishedRevision.contentHash === contentHash) {
        return { publicada: false, numero: estado.publishedRevision.revisionNumber, motivo: "identica" } as const;
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
          action: "PUBLICACION",
          entityType: "ContentRevision",
          entityId: revision.id,
          summary: `Versión nº ${numero} publicada${actorId ? "" : " por el seed"}`,
        },
      });

      return { publicada: true, numero } as const;
    },
    { timeout: 20_000 },
  );
}
