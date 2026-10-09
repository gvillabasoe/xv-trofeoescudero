"use server";

import { redirect } from "next/navigation";
import { auditarSeguridad } from "@/server/auth/auditoria";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerAuth } from "@/server/auth/instancia";
import { presentarTotp } from "@/server/auth/totp";
import { obtenerPrisma } from "@/server/db";

export type EstadoTotp =
  | { paso: "inicio"; error?: string }
  | { paso: "verificar"; qrDataUri: string; clave: string; codigos: string[] };

export type EstadoConfirmacion = { error?: string };

export type EstadoCodigos = { codigos?: string[]; error?: string };

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** Paso 1 de la activación: con la contraseña, Better Auth crea el secreto TOTP y los códigos de recuperación. */
export async function accionIniciarTotp(_previo: EstadoTotp, formulario: FormData): Promise<EstadoTotp> {
  const { usuario, cabeceras } = await requerirAdmin({ exigirTotp: false });
  if (usuario.twoFactorEnabled) redirect("/admin/seguridad");
  try {
    const { totpURI, backupCodes } = await obtenerAuth().api.enableTwoFactor({
      body: { password: texto(formulario, "contrasena") },
      headers: cabeceras,
    });
    // Los códigos se muestran una sola vez: viajan en esta respuesta y no se guardan en ningún otro sitio.
    return { paso: "verificar", ...presentarTotp(totpURI), codigos: backupCodes };
  } catch {
    return { paso: "inicio", error: "La contraseña no es correcta." };
  }
}

/** Paso 2: el primer código de la app confirma la activación. Hasta entonces, el TOTP no está activo. */
export async function accionConfirmarTotp(_previo: EstadoConfirmacion, formulario: FormData): Promise<EstadoConfirmacion> {
  const { usuario, cabeceras } = await requerirAdmin({ exigirTotp: false });
  try {
    await obtenerAuth().api.verifyTOTP({
      body: { code: texto(formulario, "codigo").replace(/\s+/g, ""), trustDevice: false },
      headers: cabeceras,
    });
  } catch {
    return { error: "El código no es correcto. Escribe el que muestra ahora la app." };
  }
  await auditarSeguridad(obtenerPrisma(), { actorId: usuario.id, accion: "TOTP_ACTIVADO", resumen: "Verificación en dos pasos (TOTP) activada" });
  redirect("/admin");
}

export async function accionRegenerarCodigos(_previo: EstadoCodigos, formulario: FormData): Promise<EstadoCodigos> {
  const { usuario, cabeceras } = await requerirAdmin({ exigirTotp: true });
  try {
    const { backupCodes } = await obtenerAuth().api.generateBackupCodes({
      body: { password: texto(formulario, "contrasena") },
      headers: cabeceras,
    });
    await auditarSeguridad(obtenerPrisma(), {
      actorId: usuario.id,
      accion: "CODIGOS_RECUPERACION_REGENERADOS",
      resumen: "Códigos de recuperación regenerados; los anteriores dejan de valer",
    });
    return { codigos: backupCodes };
  } catch {
    return { error: "La contraseña no es correcta." };
  }
}

/** Cierra una sesión propia. Se busca por id y se comprueba que es del usuario: el token nunca llega al navegador. */
export async function accionRevocarSesion(formulario: FormData): Promise<void> {
  const { usuario, cabeceras, sesionId } = await requerirAdmin({ exigirTotp: false });
  const id = texto(formulario, "sesion");
  const sesion = await obtenerPrisma().session.findFirst({ where: { id, userId: usuario.id }, select: { token: true } });
  if (!sesion) return;
  await obtenerAuth().api.revokeSession({ body: { token: sesion.token }, headers: cabeceras });
  await auditarSeguridad(obtenerPrisma(), { actorId: usuario.id, accion: "SESION_REVOCADA", resumen: "Sesión cerrada desde Seguridad" });
  if (id === sesionId) redirect("/admin/login");
  redirect("/admin/seguridad");
}

export async function accionRevocarOtras(): Promise<void> {
  const { usuario, cabeceras } = await requerirAdmin({ exigirTotp: false });
  await obtenerAuth().api.revokeOtherSessions({ headers: cabeceras });
  await auditarSeguridad(obtenerPrisma(), { actorId: usuario.id, accion: "SESION_REVOCADA", resumen: "Cerradas todas las demás sesiones" });
  redirect("/admin/seguridad");
}
