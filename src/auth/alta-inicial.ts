import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { ClienteBD, ConsultasBD } from "@/server/db";
import { auditarSeguridad } from "./auditoria";
import { LONGITUD_MINIMA_CONTRASENA, type Auth } from "./config";
import { registrarIntento } from "./limite";

/** Cerrojo de transacción propio del alta inicial: dos peticiones simultáneas se ordenan. */
const CERROJO_ALTA = 4_801_202_702;

/** El alta inicial ya no existe (hay un administrador o falta el secreto en Vercel). Se responde 404. */
export class AltaInicialNoDisponible extends Error {
  constructor() {
    super("El alta inicial no está disponible.");
    this.name = "AltaInicialNoDisponible";
  }
}

/** La petición no es válida; el mensaje se puede mostrar. */
export class AltaInicialRechazada extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "AltaInicialRechazada";
  }
}

const esquemaAlta = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80, "El nombre es demasiado largo."),
  email: z.string().trim().toLowerCase().email("Escribe un email válido."),
  contrasena: z
    .string()
    .min(LONGITUD_MINIMA_CONTRASENA, `La contraseña necesita al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`)
    .max(128, "La contraseña es demasiado larga."),
  secreto: z.string().min(1, "Escribe el secreto de alta."),
});

export async function hayAdministrador(bd: ConsultasBD): Promise<boolean> {
  return (await bd.user.count({ where: { role: "admin" } })) > 0;
}

/** Disponible solo si el secreto está configurado en Vercel y todavía no existe ningún administrador. */
export async function altaInicialDisponible(bd: ConsultasBD, secretoEsperado: string | undefined): Promise<boolean> {
  return Boolean(secretoEsperado && secretoEsperado.length >= 32) && !(await hayAdministrador(bd));
}

/** Comparación en tiempo constante (de los SHA-256, para que la longitud no se filtre). */
export function secretoCorrecto(recibido: string, esperado: string | undefined): boolean {
  if (!esperado || esperado.length < 32) return false;
  const a = createHash("sha256").update(recibido).digest();
  const b = createHash("sha256").update(esperado).digest();
  return timingSafeEqual(a, b);
}

/**
 * Alta del primer administrador (§18 del plan de la Fase 3):
 * 1. Limita los intentos por huella.
 * 2. Exige el secreto de bootstrap guardado en Vercel (ADMIN_SETUP_SECRET), comparado en tiempo constante.
 * 3. En una transacción con cerrojo: comprueba que no hay ningún administrador y crea usuario, credencial,
 *    perfil y auditoría. Dos peticiones simultáneas no pueden crear dos administradores.
 * 4. Después, el alta deja de existir (404). El usuario empieza sin TOTP: el panel le obliga a activarlo.
 */
export async function crearPrimerAdministrador(
  bd: ClienteBD,
  auth: Auth,
  datos: Record<string, unknown>,
  opciones: { secretoEsperado: string | undefined; huella: string },
): Promise<{ userId: string; email: string }> {
  if (!opciones.secretoEsperado || opciones.secretoEsperado.length < 32) {
    throw new AltaInicialNoDisponible();
  }

  const limite = await registrarIntento(bd, { accion: "SETUP", huella: opciones.huella });
  if (!limite.permitido) {
    await auditarSeguridad(bd, { actorId: null, accion: "LIMITE_INTENTOS", resumen: "Alta inicial: límite de intentos alcanzado" });
    throw new AltaInicialRechazada("Demasiados intentos. Espera 15 minutos y vuelve a probar.");
  }

  const lectura = esquemaAlta.safeParse(datos);
  if (!lectura.success) {
    throw new AltaInicialRechazada(lectura.error.issues.map((problema) => problema.message).join(" "));
  }
  const { nombre, email, contrasena, secreto } = lectura.data;

  if (!secretoCorrecto(secreto, opciones.secretoEsperado)) {
    await auditarSeguridad(bd, { actorId: null, accion: "ALTA_INICIAL", resumen: "Alta inicial rechazada: secreto incorrecto" });
    throw new AltaInicialRechazada("El secreto de alta no es correcto.");
  }

  // Mismo algoritmo que usa Better Auth para comprobar la contraseña al iniciar sesión.
  const contexto = await auth.$context;
  const hash = await contexto.password.hash(contrasena);

  return bd.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CERROJO_ALTA})`;
      if (await hayAdministrador(tx)) {
        throw new AltaInicialNoDisponible();
      }
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new AltaInicialRechazada("Ya existe un usuario con ese email.");
      }

      const userId = randomBytes(16).toString("hex");
      await tx.user.create({
        data: { id: userId, name: nombre, email, emailVerified: true, role: "admin", twoFactorEnabled: false },
      });
      await tx.account.create({
        data: { id: randomBytes(16).toString("hex"), accountId: userId, providerId: "credential", userId, password: hash },
      });
      await tx.adminProfile.create({ data: { userId, displayName: nombre } });
      await auditarSeguridad(tx, {
        actorId: userId,
        accion: "ALTA_INICIAL",
        resumen: "Primer administrador creado con el alta inicial; TOTP pendiente de activar",
      });
      return { userId, email };
    },
    { timeout: 20_000 },
  );
}
