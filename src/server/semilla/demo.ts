import { createHash } from "node:crypto";
import type { ClienteBD, ConsultasBD } from "@/server/db";
import {
  MENSAJE_FICTICIO,
  PROPUESTAS_FICTICIAS,
  TEXTO_CONSENTIMIENTO,
  VERSION_LEGAL_SINTETICA,
} from "./demo-datos";

/**
 * Datos demo (D-DEMO): separados del bootstrap, nunca automáticos y no autorreparables.
 * - No se crean en ningún despliegue. Si se borran, no vuelven: solo con una acción explícita
 *   (`db:seed:demo` o el reset del panel en preview).
 * - Solo en desarrollo o preview de Vercel, con ENTORNO_DATOS y el marcador de la base en NONPROD.
 * - El reset solo borra y recrea propuestas con isSynthetic = true: nunca toca contenido editorial
 *   ni la revisión publicada.
 */

export class DemoNoPermitida extends Error {
  constructor(motivo: string) {
    super(`Datos demo no permitidos: ${motivo}`);
    this.name = "DemoNoPermitida";
  }
}

type Variables = Readonly<Record<string, string | undefined>>;

/** Comprobaciones de entorno sin base de datos. Devuelve el motivo del bloqueo o null. */
export function motivoDemoNoPermitida(env: Variables): string | null {
  // VERCEL_ENV ausente = desarrollo local o CI.
  const entornoVercel = env.VERCEL_ENV ?? "development";
  if (entornoVercel !== "development" && entornoVercel !== "preview") {
    return `el entorno de Vercel es «${entornoVercel}»; solo se admiten development y preview`;
  }
  if (env.ENTORNO_DATOS !== "NONPROD") {
    return "ENTORNO_DATOS no es NONPROD";
  }
  // Defensa adicional: si se configura el host de la base de producción, la conexión no puede apuntar a él.
  const hostProduccion = env.PRODUCCION_DB_HOST?.trim().toLowerCase();
  if (hostProduccion && env.DATABASE_URL) {
    try {
      const host = new URL(env.DATABASE_URL).hostname.toLowerCase().replace("-pooler", "");
      if (host === hostProduccion.replace("-pooler", "")) return "DATABASE_URL apunta a la base de producción";
    } catch {
      return "DATABASE_URL no es una URL válida";
    }
  }
  return null;
}

async function comprobarEntorno(tx: ConsultasBD, env: Variables) {
  const motivo = motivoDemoNoPermitida(env);
  if (motivo) throw new DemoNoPermitida(motivo);
  const politica = await tx.policySettings.findUnique({ where: { id: 1 }, select: { environment: true } });
  if (politica?.environment !== "NONPROD") {
    throw new DemoNoPermitida(`el marcador de la base es ${politica?.environment ?? "(ninguno)"}, no NONPROD`);
  }
}

async function crearPropuestasDemo(tx: ConsultasBD): Promise<number> {
  const privacidad = await tx.legalPage.findUnique({ where: { slug: "privacidad" } });
  if (!privacidad) throw new DemoNoPermitida("falta la página legal «privacidad» del contenido inicial");

  let versionLegal = await tx.legalVersion.findUnique({
    where: {
      legalPageId_versionLabel: { legalPageId: privacidad.id, versionLabel: VERSION_LEGAL_SINTETICA.versionLabel },
    },
  });
  if (!versionLegal) {
    versionLegal = await tx.legalVersion.create({
      data: {
        legalPageId: privacidad.id,
        ...VERSION_LEGAL_SINTETICA,
        bodyHash: createHash("sha256").update(VERSION_LEGAL_SINTETICA.body).digest("hex"),
        publishedAt: new Date(),
      },
    });
  }

  const ahora = new Date();
  for (const { archivada, leida, nota, status, ...propuesta } of PROPUESTAS_FICTICIAS) {
    await tx.submission.create({
      data: {
        ...propuesta,
        message: MENSAJE_FICTICIO,
        consentAt: ahora,
        consentLegalVersionId: versionLegal.id,
        consentText: TEXTO_CONSENTIMIENTO,
        status,
        readAt: leida ? ahora : null,
        archivedAt: archivada ? ahora : null,
        isSynthetic: true,
        statusHistory: {
          create:
            status === "NUEVA"
              ? [{ fromStatus: null, toStatus: "NUEVA" as const }]
              : [
                  { fromStatus: null, toStatus: "NUEVA" as const },
                  { fromStatus: "NUEVA" as const, toStatus: status, note: "Cambio de estado ficticio" },
                ],
        },
        ...(nota ? { notes: { create: [{ body: nota }] } } : {}),
      },
    });
  }
  return PROPUESTAS_FICTICIAS.length;
}

/** `db:seed:demo`: crea las propuestas demo solo si no hay ninguna. */
export async function sembrarDemo(
  bd: ClienteBD,
  opciones: { env: Variables },
): Promise<{ creadas: number; existentes: number }> {
  return bd.$transaction(
    async (tx) => {
      await comprobarEntorno(tx, opciones.env);
      const existentes = await tx.submission.count({ where: { isSynthetic: true } });
      if (existentes > 0) return { creadas: 0, existentes };
      const creadas = await crearPropuestasDemo(tx);
      await tx.auditLog.create({
        data: {
          actorType: "SYSTEM",
          action: "DEMO_CREADO",
          entityType: "Submission",
          summary: `${creadas} propuestas demo creadas (isSynthetic)`,
        },
      });
      return { creadas, existentes: 0 };
    },
    { timeout: 60_000 },
  );
}

/** Reset demo (panel, solo preview): borra y recrea únicamente las propuestas con isSynthetic = true. */
export async function reiniciarDemo(
  bd: ClienteBD,
  opciones: { env: Variables; actorId: string },
): Promise<{ borradas: number; creadas: number }> {
  return bd.$transaction(
    async (tx) => {
      await comprobarEntorno(tx, opciones.env);
      // Notas e historial se borran en cascada con su propuesta.
      const { count: borradas } = await tx.submission.deleteMany({ where: { isSynthetic: true } });
      const creadas = await crearPropuestasDemo(tx);
      await tx.auditLog.create({
        data: {
          actorId: opciones.actorId,
          actorType: "USER",
          action: "RESET_NO_PRODUCTIVO",
          entityType: "Submission",
          summary: `Reset demo: ${borradas} propuestas sintéticas borradas y ${creadas} recreadas`,
        },
      });
      return { borradas, creadas };
    },
    { timeout: 60_000 },
  );
}
