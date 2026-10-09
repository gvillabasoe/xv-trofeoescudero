import { createHash } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import type { ClienteBD, ConsultasBD } from "@/server/db";
import { CERROJO_DATOS, CLAVE_CONTENIDO_INICIAL, type Entorno } from "./bootstrap";
import { CATEGORIAS, CLASIFICACION_V3 } from "./datos";

/**
 * Backfills de datos: explícitos, versionados, idempotentes, reanudables y auditados.
 * - Cada uno se aplica una sola vez y queda registrado en SeedRun (kind BACKFILL) con su clave.
 * - Cada uno corre en su propia transacción, con el registro dentro: si falla, no queda nada y se
 *   reintenta en el siguiente despliegue.
 * - Nunca crea contenido borrado, nunca reactiva contenido oculto y nunca toca registros editados
 *   desde el panel (updatedById no nulo): esos casos se anotan en la metadata y se dejan como están.
 * - Son operaciones cortas. Los backfills largos irían por lotes en una función aparte, no en el build.
 */
export interface Backfill {
  clave: string;
  version: number;
  descripcion: string;
  aplicar(tx: ConsultasBD): Promise<Prisma.InputJsonObject>;
}

/** D-HISTORICAL-RELATION: clasifica dalecandELA y Luz de Mar en una instalación de la Entrega 3. */
const entidadesHistoricasV1: Backfill = {
  clave: "entidades-historicas-v1",
  version: 1,
  descripcion:
    "Categorías «AfterParty oficial» y «Colaboración solidaria»; Luz de Mar con su papel actual (AfterParty oficial) y dalecandELA como colaboración solidaria de la X edición. No cambia la visibilidad ni textos.",
  async aplicar(tx) {
    const cambios: string[] = [];
    const omitidos: string[] = [];

    for (const categoria of CATEGORIAS) {
      if (await tx.sponsorCategory.findUnique({ where: { slug: categoria.slug }, select: { id: true } })) continue;
      await tx.sponsorCategory.create({ data: { ...categoria } });
      cambios.push(`categoría creada: ${categoria.slug}`);
    }

    for (const [slug, objetivo] of Object.entries(CLASIFICACION_V3)) {
      if (!objetivo) continue;
      const entidad = await tx.sponsor.findUnique({ where: { slug }, include: { category: true } });
      if (!entidad) {
        omitidos.push(`${slug}: no existe (no se recrea)`);
        continue;
      }
      if (entidad.updatedById) {
        omitidos.push(`${slug}: editada desde el panel (no se toca)`);
        continue;
      }
      const categoria = await tx.sponsorCategory.findUniqueOrThrow({ where: { slug: objetivo.categorySlug } });
      const datos: Prisma.SponsorUncheckedUpdateInput = {};
      if (entidad.categoryId !== categoria.id) datos.categoryId = categoria.id;
      if (entidad.relationshipType !== objetivo.relationshipType) datos.relationshipType = objetivo.relationshipType;
      // Solo se rellena lo que está vacío: nunca se sustituye un texto existente.
      if (entidad.currentRoleLabel === null && objetivo.currentRoleLabel) datos.currentRoleLabel = objetivo.currentRoleLabel;
      if (entidad.editionsNote === null && objetivo.editionsNote) datos.editionsNote = objetivo.editionsNote;
      if (Object.keys(datos).length === 0) continue;
      await tx.sponsor.update({ where: { id: entidad.id }, data: { ...datos, version: { increment: 1 } } });
      cambios.push(`${slug}: ${Object.keys(datos).join(", ")}`);
    }

    // Los cambios quedan en el borrador: la portada sigue mostrando la revisión publicada.
    if (cambios.some((cambio) => !cambio.startsWith("categoría creada"))) {
      await tx.siteState.updateMany({ where: { id: 1 }, data: { hasUnpublishedChanges: true } });
    }
    return { cambios, omitidos };
  },
};

/** Backfills en orden de aplicación. Nunca se borra ni se cambia uno ya publicado: se añade otro nuevo. */
export const BACKFILLS: readonly Backfill[] = [entidadesHistoricasV1];

export function checksumBackfill(backfill: Backfill): string {
  return createHash("sha256").update(`${backfill.clave}:${backfill.version}:${backfill.descripcion}`).digest("hex");
}

export interface ResultadoBackfill {
  clave: string;
  estado: "aplicado" | "ya-aplicado";
  metadata?: Prisma.InputJsonObject;
}

/** Aplica los backfills pendientes. Requiere que el contenido inicial esté registrado. */
export async function aplicarBackfills(
  bd: ClienteBD,
  opciones: { entorno: Entorno },
  backfills: readonly Backfill[] = BACKFILLS,
): Promise<ResultadoBackfill[]> {
  if (!(await bd.seedRun.findUnique({ where: { key: CLAVE_CONTENIDO_INICIAL }, select: { id: true } }))) {
    throw new Error(`Backfills: falta ${CLAVE_CONTENIDO_INICIAL}. Ejecuta antes el bootstrap.`);
  }

  const resultados: ResultadoBackfill[] = [];
  for (const backfill of backfills) {
    const resultado = await bd.$transaction(
      async (tx): Promise<ResultadoBackfill> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CERROJO_DATOS})`;
        if (await tx.seedRun.findUnique({ where: { key: backfill.clave }, select: { id: true } })) {
          return { clave: backfill.clave, estado: "ya-aplicado" };
        }
        const metadata = await backfill.aplicar(tx);
        await tx.seedRun.create({
          data: {
            key: backfill.clave,
            kind: "BACKFILL",
            version: backfill.version,
            checksum: checksumBackfill(backfill),
            environment: opciones.entorno,
            completedAt: new Date(),
            metadata: { descripcion: backfill.descripcion, ...metadata },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            action: "BACKFILL_APLICADO",
            entityType: "SeedRun",
            entityId: backfill.clave,
            summary: `Backfill ${backfill.clave} (v${backfill.version}) aplicado`,
          },
        });
        return { clave: backfill.clave, estado: "aplicado", metadata };
      },
      { timeout: 60_000, maxWait: 60_000 },
    );
    resultados.push(resultado);
  }
  return resultados;
}
