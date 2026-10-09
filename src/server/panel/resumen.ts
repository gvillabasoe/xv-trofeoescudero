import type { ConsultasBD } from "@/server/db";
import { leerVersionPublicadaDe } from "@/server/version-publicada";

/** Datos del dashboard técnico provisional: solo identificadores, recuentos y fechas. */
export async function leerResumenPanel(bd: ConsultasBD) {
  const version = await leerVersionPublicadaDe(bd);
  const estado = await bd.siteState.findUnique({ where: { id: 1 }, select: { hasUnpublishedChanges: true } });
  const propuestasSinteticas = await bd.submission.count({ where: { isSynthetic: true } });
  const ejecuciones = await bd.seedRun.findMany({
    orderBy: { completedAt: "asc" },
    select: { key: true, kind: true, completedAt: true },
  });

  return {
    revision: version && {
      numero: version.numero,
      id: version.revisionId,
      contentHash: version.contentHash,
      publicadaEn: version.publicadaEn,
    },
    cambiosSinPublicar: estado?.hasUnpublishedChanges ?? false,
    propuestasSinteticas,
    ejecuciones: ejecuciones.map((ejecucion) => ({
      clave: ejecucion.key,
      tipo: ejecucion.kind,
      completadaEn: ejecucion.completedAt.toISOString(),
    })),
  };
}
