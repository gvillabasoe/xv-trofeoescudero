import { Prisma } from "@/generated/prisma/client";
import { hashContenido } from "@/lib/snapshot/hash";
import type { ClienteBD, ConsultasBD } from "@/server/db";
import { publicarEnTransaccion } from "@/server/publicacion";
import { CONTENIDO_INICIAL } from "./datos";
import { crearContenidoInicial } from "./sembrar";
import { verificarInstalacionExistente } from "./verificacion";

/** D-BOOTSTRAP: el contenido inicial se crea una sola vez y queda registrado con esta clave. */
export const CLAVE_CONTENIDO_INICIAL = "initial-content-v1";
export const VERSION_CONTENIDO_INICIAL = 1;

/** Cerrojo de transacción de PostgreSQL compartido por bootstrap y backfills: nunca corren dos a la vez. */
export const CERROJO_DATOS = 4_801_202_701;

export type Entorno = "NONPROD" | "PROD";

/** La base no está en un estado del que el bootstrap pueda partir con seguridad. No se ha cambiado nada. */
export class ErrorBootstrap extends Error {
  readonly problemas: string[];

  constructor(problemas: string[]) {
    super(`Bootstrap detenido sin cambiar nada: ${problemas.join(" · ")}`);
    this.name = "ErrorBootstrap";
    this.problemas = problemas;
  }
}

export type ResultadoBootstrap =
  | { accion: "ya-registrado" }
  | { accion: "registrado"; revisionNumero: number | null }
  | { accion: "creado"; creados: Record<string, number>; revisionNumero: number };

/** SHA-256 del conjunto de datos de initial-content-v1 (datos.ts). */
export function checksumContenidoInicial(): string {
  return hashContenido(CONTENIDO_INICIAL);
}

/** Tablas funcionales: si alguna tiene filas, la base no es nueva. */
async function contarTablasFuncionales(tx: ConsultasBD): Promise<Record<string, number>> {
  return {
    SiteSettings: await tx.siteSettings.count(),
    PageSection: await tx.pageSection.count(),
    CollaborationRoute: await tx.collaborationRoute.count(),
    RouteItem: await tx.routeItem.count(),
    Opportunity: await tx.opportunity.count(),
    CompetitionHole: await tx.competitionHole.count(),
    SponsorCategory: await tx.sponsorCategory.count(),
    Sponsor: await tx.sponsor.count(),
    LegalPage: await tx.legalPage.count(),
    LegalVersion: await tx.legalVersion.count(),
    ContentRevision: await tx.contentRevision.count(),
    SiteState: await tx.siteState.count(),
    Submission: await tx.submission.count(),
  };
}

function esConflictoDeClave(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Bootstrap de una sola ejecución (Entrega 4A).
 * 1. Si «initial-content-v1» ya está registrado: termina sin consultar ni tocar nada más.
 * 2. Si la base ya tiene contenido (instalación de la Entrega 3): verifica que es coherente y solo
 *    registra SeedRun. Si falta algo, falla con el diagnóstico y no rellena nada.
 * 3. Si las tablas funcionales están vacías: crea todo, publica la revisión nº 1, audita y registra
 *    SeedRun en UNA transacción. Si algo falla, no queda nada a medias.
 * Dos ejecuciones simultáneas: el cerrojo las ordena y la clave única de SeedRun impide duplicar.
 */
export async function bootstrap(bd: ClienteBD, opciones: { entorno: Entorno }): Promise<ResultadoBootstrap> {
  const { entorno } = opciones;
  if (await bd.seedRun.findUnique({ where: { key: CLAVE_CONTENIDO_INICIAL }, select: { id: true } })) {
    return { accion: "ya-registrado" };
  }

  try {
    return await bd.$transaction(
      async (tx): Promise<ResultadoBootstrap> => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CERROJO_DATOS})`;
        if (await tx.seedRun.findUnique({ where: { key: CLAVE_CONTENIDO_INICIAL }, select: { id: true } })) {
          return { accion: "ya-registrado" };
        }

        const recuentos = await contarTablasFuncionales(tx);
        const ocupadas = Object.entries(recuentos).filter(([, total]) => total > 0);

        if (ocupadas.length > 0) {
          // Instalación existente: verificar y registrar, sin crear contenido.
          const { problemas, resumen } = await verificarInstalacionExistente(tx, entorno);
          if (problemas.length > 0) {
            throw new ErrorBootstrap([
              `la base ya tiene datos (${ocupadas.map(([tabla, total]) => `${tabla} ${total}`).join(", ")}) pero no es una instalación completa`,
              ...problemas,
            ]);
          }
          await tx.seedRun.create({
            data: {
              key: CLAVE_CONTENIDO_INICIAL,
              kind: "BOOTSTRAP",
              version: VERSION_CONTENIDO_INICIAL,
              checksum: checksumContenidoInicial(),
              environment: entorno,
              completedAt: new Date(),
              metadata: {
                modo: "registro-instalacion-existente",
                nota: "Contenido creado por el seed de la Entrega 3; verificado y registrado sin recrear nada.",
                ...resumen,
              },
            },
          });
          await tx.auditLog.create({
            data: {
              actorType: "SYSTEM",
              action: "BOOTSTRAP_REGISTRADO",
              entityType: "SeedRun",
              entityId: CLAVE_CONTENIDO_INICIAL,
              summary: `Instalación existente verificada y registrada como ${CLAVE_CONTENIDO_INICIAL}; revisión publicada nº ${resumen.revisionPublicada?.revisionNumber ?? "—"} conservada`,
            },
          });
          return { accion: "registrado", revisionNumero: resumen.revisionPublicada?.revisionNumber ?? null };
        }

        // Base nueva: todo o nada.
        const creados = await crearContenidoInicial(tx);
        const publicacion = await publicarEnTransaccion(tx, {
          actorId: null,
          comentario: "Versión inicial publicada por el bootstrap",
        });
        await tx.seedRun.create({
          data: {
            key: CLAVE_CONTENIDO_INICIAL,
            kind: "BOOTSTRAP",
            version: VERSION_CONTENIDO_INICIAL,
            checksum: checksumContenidoInicial(),
            environment: entorno,
            completedAt: new Date(),
            metadata: { modo: "base-nueva", creados, revisionNumero: publicacion.numero },
          },
        });
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            action: "BOOTSTRAP_INICIAL",
            entityType: "SeedRun",
            entityId: CLAVE_CONTENIDO_INICIAL,
            summary: `Contenido inicial creado y versión nº ${publicacion.numero} publicada`,
          },
        });
        return { accion: "creado", creados, revisionNumero: publicacion.numero };
      },
      { timeout: 120_000, maxWait: 60_000 },
    );
  } catch (error) {
    // Otra ejecución simultánea lo registró primero.
    if (esConflictoDeClave(error)) {
      return { accion: "ya-registrado" };
    }
    throw error;
  }
}
