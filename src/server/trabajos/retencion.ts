import { POLITICA_POR_DEFECTO, limitesRetencion } from "@/lib/retencion";
import { auditar } from "@/server/auditoria";
import type { ClienteBD } from "@/server/db";
import type { Almacen } from "@/server/medios/almacen";
import { purgarRetiradas } from "@/server/medios/biblioteca";
import { anonimizarEnTransaccion } from "@/server/propuestas/bandeja";

/** Cerrojo de PostgreSQL de la tarea: dos ejecuciones simultáneas (el cron puede repetir) no se pisan. */
export const CERROJO_RETENCION = 4_801_202_703;

export interface ResumenRetencion {
  propuestasAnonimizadas: number;
  contadoresBorrados: number;
  sesionesBorradas: number;
  verificacionesBorradas: number;
  auditoriaBorrada: number;
  mediosPurgados: number;
  omitida?: true;
}

/**
 * Tarea diaria de retención (Vercel Cron, Fase 6). Idempotente: cada ejecución reprocesa lo pendiente.
 * 1. Anonimiza las propuestas sin actividad desde hace `submissionAnonymizeMonths` meses.
 * 2. Borra contadores antiabuso caducados (huellas HMAC, 30 días como máximo).
 * 3. Borra sesiones y verificaciones caducadas de Better Auth.
 * 4. Recorta la auditoría más antigua que `auditRetentionMonths` (el trigger lo permite solo para esas filas).
 * 5. Borra los archivos de las imágenes retiradas hace más de `retiredMediaPurgeDays` días.
 */
export async function ejecutarRetencion(
  bd: ClienteBD,
  opciones: { almacen: Almacen | null; ahora?: Date },
): Promise<ResumenRetencion> {
  const ahora = opciones.ahora ?? new Date();
  const politica = (await bd.policySettings.findUnique({ where: { id: 1 } })) ?? POLITICA_POR_DEFECTO;
  const limites = limitesRetencion(politica, ahora);

  const resumen = await bd.$transaction(
    async (tx): Promise<ResumenRetencion | null> => {
      const filas = await tx.$queryRaw<Array<{ cerrojo: boolean }>>`SELECT pg_try_advisory_xact_lock(${CERROJO_RETENCION}) AS cerrojo`;
      if (!filas[0]?.cerrojo) return null;

      const caducadas = await tx.submission.findMany({
        where: { anonymizedAt: null, lastActivityAt: { lt: limites.propuestas } },
        select: { id: true },
        take: 500,
      });
      for (const { id } of caducadas) await anonimizarEnTransaccion(tx, id, ahora);

      const contadores = await tx.abuseCounter.deleteMany({ where: { expiresAt: { lt: ahora } } });
      const sesiones = await tx.session.deleteMany({ where: { expiresAt: { lt: ahora } } });
      const verificaciones = await tx.verification.deleteMany({ where: { expiresAt: { lt: ahora } } });
      const auditoria = await tx.auditLog.deleteMany({ where: { at: { lt: limites.auditoria } } });

      return {
        propuestasAnonimizadas: caducadas.length,
        contadoresBorrados: contadores.count,
        sesionesBorradas: sesiones.count,
        verificacionesBorradas: verificaciones.count,
        auditoriaBorrada: auditoria.count,
        mediosPurgados: 0,
      };
    },
    { timeout: 60_000 },
  );
  if (!resumen) {
    return {
      propuestasAnonimizadas: 0,
      contadoresBorrados: 0,
      sesionesBorradas: 0,
      verificacionesBorradas: 0,
      auditoriaBorrada: 0,
      mediosPurgados: 0,
      omitida: true,
    };
  }

  resumen.mediosPurgados = await purgarRetiradas(bd, opciones.almacen, { dias: limites.mediosRetirados, ahora });

  await auditar(bd, {
    actorId: null,
    accion: "RETENCION_EJECUTADA",
    entidad: "PolicySettings",
    entidadId: "1",
    resumen: `Retención: ${resumen.propuestasAnonimizadas} propuestas anonimizadas, ${resumen.contadoresBorrados} contadores, ${resumen.sesionesBorradas} sesiones, ${resumen.verificacionesBorradas} verificaciones, ${resumen.auditoriaBorrada} registros de auditoría y ${resumen.mediosPurgados} imágenes purgadas`,
  });
  return resumen;
}
