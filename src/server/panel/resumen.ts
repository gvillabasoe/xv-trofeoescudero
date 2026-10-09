import type { ConsultasBD } from "@/server/db";
import { leerVersionPublicadaDe } from "@/server/version-publicada";

/** Datos del inicio del panel: solo identificadores, recuentos y fechas (sin datos personales). */
export async function leerResumenPanel(bd: ConsultasBD) {
  const version = await leerVersionPublicadaDe(bd);
  const estado = await bd.siteState.findUnique({ where: { id: 1 }, select: { hasUnpublishedChanges: true } });
  const propuestasSinteticas = await bd.submission.count({ where: { isSynthetic: true } });
  const ejecuciones = await bd.seedRun.findMany({
    orderBy: { completedAt: "asc" },
    select: { key: true, kind: true, completedAt: true },
  });
  const nuevas = await bd.submission.count({ where: { status: "NUEVA", archivedAt: null } });
  const sinLeer = await bd.submission.count({ where: { readAt: null, archivedAt: null } });
  const canalesActivos = await bd.contactChannel.count({ where: { isActive: true } });
  const privacidad = await bd.legalVersion.count({ where: { legalPage: { slug: "privacidad" } } });
  const avisoLegal = await bd.legalVersion.count({ where: { legalPage: { slug: "aviso-legal" } } });
  const imagenesPendientes = await bd.mediaAsset.count({ where: { reviewState: { in: ["SUBIDA", "EN_REVISION"] } } });
  const titular = await bd.siteSettings.findUnique({ where: { id: 1 }, select: { legalOwnerName: true } });

  return {
    revision: version && {
      numero: version.numero,
      id: version.revisionId,
      contentHash: version.contentHash,
      publicadaEn: version.publicadaEn,
    },
    cambiosSinPublicar: estado?.hasUnpublishedChanges ?? false,
    propuestasSinteticas,
    propuestas: { nuevas, sinLeer },
    pendientes: {
      contacto: canalesActivos === 0,
      privacidad: privacidad === 0,
      avisoLegal: avisoLegal === 0,
      titular: !titular?.legalOwnerName,
      imagenes: imagenesPendientes,
    },
    ejecuciones: ejecuciones.map((ejecucion) => ({
      clave: ejecucion.key,
      tipo: ejecucion.kind,
      completadaEn: ejecucion.completedAt.toISOString(),
    })),
  };
}
