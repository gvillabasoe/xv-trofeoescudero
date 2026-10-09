import { esquemaSnapshot } from "@/lib/snapshot/esquema";
import { hashContenido } from "@/lib/snapshot/hash";
import type { ConsultasBD } from "@/server/db";
import { BLOQUES, OPORTUNIDADES_PRINCIPALES, VIAS } from "./datos";

// Tipos (no interfaces) para que el resumen pueda guardarse como JSON en SeedRun.metadata.
export type RevisionVerificada = {
  id: string;
  revisionNumber: number;
  schemaVersion: number;
  contentHash: string;
  createdAt: string;
  publishedAt: string;
};

export type ResumenInstalacion = {
  bloques: number;
  hoyos: number;
  vias: number;
  oportunidades: number;
  entidadesHistoricas: number;
  propuestasSinteticas: number;
  revisionPublicada: RevisionVerificada | null;
};

export type ResultadoVerificacion = {
  problemas: string[];
  /** Resumen no sensible que se guarda en SeedRun.metadata. */
  resumen: ResumenInstalacion;
};

/**
 * Comprueba que una base ya poblada (Entrega 3) es coherente antes de registrar «initial-content-v1».
 * Solo lee: si falta algo, lo describe; nunca rellena huecos.
 */
export async function verificarInstalacionExistente(
  tx: ConsultasBD,
  entorno: "NONPROD" | "PROD",
): Promise<ResultadoVerificacion> {
  const problemas: string[] = [];

  const politica = await tx.policySettings.findUnique({ where: { id: 1 }, select: { environment: true } });
  if (politica?.environment !== entorno) {
    problemas.push(`el marcador de entorno de la base es ${politica?.environment ?? "(ninguno)"} y se esperaba ${entorno}`);
  }

  if (!(await tx.siteSettings.findUnique({ where: { id: 1 }, select: { id: true } }))) {
    problemas.push("falta la configuración general (SiteSettings)");
  }

  const secciones = await tx.pageSection.findMany({
    select: {
      key: true,
      hero: { select: { id: true } },
      family: { select: { id: true } },
      day: { select: { id: true } },
      collaboration: { select: { id: true } },
      closing: { select: { id: true } },
    },
  });
  for (const { key } of BLOQUES) {
    const seccion = secciones.find((s) => s.key === key);
    if (!seccion) {
      problemas.push(`falta el bloque ${key}`);
      continue;
    }
    const contenido = { HERO: seccion.hero, FAMILIA: seccion.family, EL_DIA: seccion.day, COLABORAR: seccion.collaboration, CIERRE: seccion.closing }[key];
    if (!contenido) problemas.push(`falta el contenido del bloque ${key}`);
  }

  const hoyos = await tx.competitionHole.findMany({ select: { number: true } });
  const numeros = new Set(hoyos.map((hoyo) => hoyo.number));
  if (hoyos.length !== 18 || Array.from({ length: 18 }, (_, i) => i + 1).some((n) => !numeros.has(n))) {
    problemas.push(`los hoyos no son exactamente del 1 al 18 (hay ${hoyos.length})`);
  }

  const vias = await tx.collaborationRoute.findMany({ select: { key: true } });
  for (const { key } of VIAS) {
    if (!vias.some((via) => via.key === key)) problemas.push(`falta la vía ${key}`);
  }

  const oportunidades = await tx.opportunity.findMany({ select: { key: true } });
  for (const clave of OPORTUNIDADES_PRINCIPALES) {
    if (!oportunidades.some((oportunidad) => oportunidad.key === clave)) {
      problemas.push(`falta la oportunidad principal «${clave}»`);
    }
  }

  const estado = await tx.siteState.findUnique({
    where: { id: 1 },
    select: { publishedRevisionId: true },
  });
  const primera = await tx.contentRevision.findUnique({ where: { revisionNumber: 1 } });
  let revisionPublicada: RevisionVerificada | null = null;

  if (!estado) {
    problemas.push("falta el estado de publicación (SiteState)");
  } else if (!estado.publishedRevisionId) {
    problemas.push("SiteState no apunta a ninguna revisión publicada");
  }

  if (!primera) {
    problemas.push("falta la revisión publicada nº 1");
  } else {
    if (primera.schemaVersion < 1) problemas.push("la revisión nº 1 no tiene versión de esquema válida");
    const lectura = esquemaSnapshot.safeParse(primera.snapshot);
    if (!lectura.success) {
      problemas.push("el snapshot de la revisión nº 1 no es válido");
    } else if (hashContenido(lectura.data) !== primera.contentHash) {
      problemas.push("la huella (contentHash) de la revisión nº 1 no corresponde a su snapshot");
    }
    revisionPublicada = {
      id: primera.id,
      revisionNumber: primera.revisionNumber,
      schemaVersion: primera.schemaVersion,
      contentHash: primera.contentHash,
      createdAt: primera.createdAt.toISOString(),
      publishedAt: primera.publishedAt.toISOString(),
    };
  }

  if (estado?.publishedRevisionId) {
    const vigente = await tx.contentRevision.findUnique({
      where: { id: estado.publishedRevisionId },
      select: { id: true },
    });
    if (!vigente) problemas.push("SiteState apunta a una revisión que no existe");
  }

  return {
    problemas,
    resumen: {
      bloques: secciones.length,
      hoyos: hoyos.length,
      vias: vias.length,
      oportunidades: oportunidades.length,
      entidadesHistoricas: await tx.sponsor.count(),
      propuestasSinteticas: await tx.submission.count({ where: { isSynthetic: true } }),
      revisionPublicada,
    },
  };
}
