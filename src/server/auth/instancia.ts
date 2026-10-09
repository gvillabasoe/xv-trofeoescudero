import { obtenerPrisma } from "@/server/db";
import { crearAuth, type Auth } from "./config";

const globalConAuth = globalThis as typeof globalThis & { authTrofeo?: Auth };

/**
 * Instancia única de Better Auth para la aplicación. Se crea al usarla por primera vez, nunca al importar:
 * así el build de CI (sin base de datos ni secretos) no la necesita.
 */
export function obtenerAuth(): Auth {
  globalConAuth.authTrofeo ??= crearAuth(obtenerPrisma());
  return globalConAuth.authTrofeo;
}
