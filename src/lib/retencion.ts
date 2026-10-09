/** Cálculo de fechas límite de retención (UTC). */

export function restarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha.getTime());
  const dia = resultado.getUTCDate();
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() - meses);
  // Si el mes de destino es más corto (31 → 30/28), se queda en su último día.
  const ultimoDia = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0)).getUTCDate();
  resultado.setUTCDate(Math.min(dia, ultimoDia));
  return resultado;
}

export function restarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() - dias * 86_400_000);
}

export interface PoliticaRetencion {
  submissionAnonymizeMonths: number;
  auditRetentionMonths: number;
  retiredMediaPurgeDays: number;
}

export const POLITICA_POR_DEFECTO: PoliticaRetencion = {
  submissionAnonymizeMonths: 24,
  auditRetentionMonths: 24,
  retiredMediaPurgeDays: 30,
};

/**
 * Límites de una ejecución. La auditoría se recorta con un día de margen: el trigger de la base solo permite
 * borrar registros más antiguos que su propio cálculo, y así nunca se roza el límite.
 */
export function limitesRetencion(politica: PoliticaRetencion, ahora: Date) {
  return {
    propuestas: restarMeses(ahora, politica.submissionAnonymizeMonths),
    auditoria: restarDias(restarMeses(ahora, politica.auditRetentionMonths), 1),
    mediosRetirados: politica.retiredMediaPurgeDays,
  };
}
