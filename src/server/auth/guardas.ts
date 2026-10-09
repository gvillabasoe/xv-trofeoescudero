import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { obtenerPrisma } from "@/server/db";
import { obtenerAuth } from "./instancia";

export interface SesionAdmin {
  sesionId: string;
  cabeceras: Headers;
  usuario: { id: string; name: string; email: string; twoFactorEnabled: boolean };
}

/**
 * Autorización real del panel (el proxy solo hace una redirección optimista).
 * Comprueba la sesión en Neon, el rol admin y que la cuenta no esté bloqueada.
 * Lee las cabeceras antes que nada: durante el build, la página se detiene aquí y no crea Better Auth.
 */
export async function obtenerSesionAdmin(): Promise<SesionAdmin | null> {
  const cabeceras = await headers();
  const sesion = await obtenerAuth().api.getSession({ headers: cabeceras });
  if (!sesion) return null;

  const usuario = await obtenerPrisma().user.findUnique({
    where: { id: sesion.user.id },
    select: { id: true, name: true, email: true, role: true, banned: true, twoFactorEnabled: true },
  });
  if (!usuario || usuario.role !== "admin" || usuario.banned) return null;

  return {
    sesionId: sesion.session.id,
    cabeceras,
    usuario: {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      twoFactorEnabled: usuario.twoFactorEnabled === true,
    },
  };
}

/**
 * Para páginas y Server Actions del panel. Sin sesión de administrador → /admin/login.
 * TOTP obligatorio: sin TOTP activo, solo se puede entrar en /admin/seguridad.
 */
export async function requerirAdmin(opciones: { exigirTotp: boolean }): Promise<SesionAdmin> {
  const sesion = await obtenerSesionAdmin();
  if (!sesion) redirect("/admin/login");
  if (opciones.exigirTotp && !sesion.usuario.twoFactorEnabled) redirect("/admin/seguridad");
  return sesion;
}
