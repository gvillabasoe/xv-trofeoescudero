import type { ConsultasBD } from "@/server/db";

export type AccionLimitada = "LOGIN" | "SETUP" | "BREAKGLASS" | "FORM";

/** Límites por huella y ventana de 15 minutos. */
export const LIMITES: Readonly<Record<AccionLimitada, { max: number; ventanaSegundos: number }>> = {
  LOGIN: { max: 10, ventanaSegundos: 15 * 60 },
  SETUP: { max: 5, ventanaSegundos: 15 * 60 },
  BREAKGLASS: { max: 3, ventanaSegundos: 15 * 60 },
  FORM: { max: 5, ventanaSegundos: 15 * 60 },
};

/**
 * Cuenta un intento en AbuseCounter (una fila por huella, acción y ventana) y dice si se ha superado el límite.
 * La inserción o el incremento es una sola sentencia (ON CONFLICT), así que dos intentos simultáneos no se pierden.
 */
export async function registrarIntento(
  bd: ConsultasBD,
  opciones: { accion: AccionLimitada; huella: string; ahora?: Date },
): Promise<{ permitido: boolean; restantes: number }> {
  const { max, ventanaSegundos } = LIMITES[opciones.accion];
  const ahora = opciones.ahora ?? new Date();
  const ventana = ventanaSegundos * 1000;
  const windowStart = new Date(Math.floor(ahora.getTime() / ventana) * ventana);
  // Caduca al acabar la ventana (más un minuto de margen): muy por debajo del máximo de 30 días.
  const expiresAt = new Date(windowStart.getTime() + ventana + 60_000);

  const contador = await bd.abuseCounter.upsert({
    where: {
      fingerprint_action_windowStart: { fingerprint: opciones.huella, action: opciones.accion, windowStart },
    },
    create: { fingerprint: opciones.huella, action: opciones.accion, windowStart, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  });
  return { permitido: contador.count <= max, restantes: Math.max(0, max - contador.count) };
}
