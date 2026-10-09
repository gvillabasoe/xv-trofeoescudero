import type { ClienteBD } from "@/server/db";
import { auditarSeguridad } from "./auditoria";
import type { Auth } from "./config";
import { registrarIntento } from "./limite";

/**
 * Inicio de sesión del panel, sin Next: lo usan las Server Actions y los tests.
 * Las cookies las aplica el plugin nextCookies en las Server Actions; aquí se devuelven también
 * (setCookies) para que los tests puedan seguir la sesión.
 */

/** Credenciales o código no válidos, o demasiados intentos. El mensaje se puede mostrar. */
export class AccesoRechazado extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "AccesoRechazado";
  }
}

/** Siguiente pantalla después de un paso correcto. */
export type DestinoAcceso = "panel" | "seguridad" | "segundo-factor";

export interface ResultadoAcceso {
  destino: DestinoAcceso;
  setCookies: string[];
}

interface Contexto {
  cabeceras: Headers;
  huella: string;
}

async function comprobarLimite(bd: ClienteBD, huella: string) {
  const limite = await registrarIntento(bd, { accion: "LOGIN", huella });
  if (!limite.permitido) {
    await auditarSeguridad(bd, { actorId: null, accion: "LIMITE_INTENTOS", resumen: "Acceso al panel: límite de intentos alcanzado" });
    throw new AccesoRechazado("Demasiados intentos. Espera 15 minutos y vuelve a probar.");
  }
}

/** Solo un administrador activo puede entrar; si no lo es, se cierra la sesión recién creada. */
async function destinoDeUsuario(bd: ClienteBD, auth: Auth, userId: string, setCookies: string[]): Promise<DestinoAcceso> {
  const usuario = await bd.user.findUnique({
    where: { id: userId },
    select: { role: true, banned: true, twoFactorEnabled: true },
  });
  if (!usuario || usuario.role !== "admin" || usuario.banned) {
    const cookies = setCookies.map((linea) => linea.split(";")[0]).join("; ");
    await auth.api.signOut({ headers: new Headers({ cookie: cookies }) }).catch(() => undefined);
    throw new AccesoRechazado("Esta cuenta no tiene acceso al panel.");
  }
  return usuario.twoFactorEnabled ? "panel" : "seguridad";
}

/** Paso 1: email y contraseña. Con TOTP activo, Better Auth deja un reto pendiente (segundo-factor). */
export async function iniciarSesionConContrasena(
  bd: ClienteBD,
  auth: Auth,
  datos: { email: string; contrasena: string } & Contexto,
): Promise<ResultadoAcceso> {
  await comprobarLimite(bd, datos.huella);

  const respuesta = await auth.api
    .signInEmail({
      body: { email: datos.email.trim().toLowerCase(), password: datos.contrasena },
      headers: datos.cabeceras,
      returnHeaders: true,
    })
    .catch(async () => {
      // Sin email en la auditoría: solo que hubo un intento fallido.
      await auditarSeguridad(bd, { actorId: null, accion: "INICIO_SESION_FALLIDO", resumen: "Acceso al panel: credenciales incorrectas" });
      throw new AccesoRechazado("El email o la contraseña no son correctos.");
    });

  const setCookies = respuesta.headers.getSetCookie();
  const cuerpo: unknown = respuesta.response;
  if (cuerpo && typeof cuerpo === "object" && "twoFactorRedirect" in cuerpo && cuerpo.twoFactorRedirect) {
    return { destino: "segundo-factor", setCookies };
  }

  const userId = respuesta.response.user.id;
  const destino = await destinoDeUsuario(bd, auth, userId, setCookies);
  await auditarSeguridad(bd, {
    actorId: userId,
    accion: "INICIO_SESION",
    resumen: destino === "seguridad" ? "Acceso con contraseña; TOTP pendiente de activar" : "Acceso con contraseña",
  });
  return { destino, setCookies };
}

/** Paso 2: código TOTP o código de recuperación (de un solo uso). */
export async function verificarSegundoFactor(
  bd: ClienteBD,
  auth: Auth,
  datos: { codigo: string; tipo: "totp" | "recuperacion" } & Contexto,
): Promise<ResultadoAcceso> {
  await comprobarLimite(bd, datos.huella);
  const codigo = datos.codigo.replace(/\s+/g, "");

  const rechazar = async (): Promise<never> => {
    await auditarSeguridad(bd, { actorId: null, accion: "INICIO_SESION_FALLIDO", resumen: "Acceso al panel: segundo factor incorrecto" });
    throw new AccesoRechazado("El código no es correcto o ha caducado. Vuelve a probar.");
  };
  const peticion = { body: { code: codigo, trustDevice: false }, headers: datos.cabeceras, returnHeaders: true } as const;
  const { headers, userId } =
    datos.tipo === "totp"
      ? await auth.api
          .verifyTOTP(peticion)
          .then((r) => ({ headers: r.headers, userId: r.response.user.id }))
          .catch(rechazar)
      : await auth.api
          .verifyBackupCode(peticion)
          .then((r) => ({ headers: r.headers, userId: r.response.user.id }))
          .catch(rechazar);

  const setCookies = headers.getSetCookie();
  const destino = await destinoDeUsuario(bd, auth, userId, setCookies);
  await auditarSeguridad(bd, {
    actorId: userId,
    accion: "INICIO_SESION",
    resumen: datos.tipo === "totp" ? "Acceso con TOTP" : "Acceso con un código de recuperación",
  });
  return { destino, setCookies };
}
