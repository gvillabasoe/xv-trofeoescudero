import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import type { ClienteBD } from "@/server/db";

export const NOMBRE_APLICACION = "Trofeo Escudero";
export const LONGITUD_MINIMA_CONTRASENA = 12;

type Variables = Readonly<Record<string, string | undefined>>;

/** Hosts de este despliegue (Vercel los expone como variables de sistema). Nunca un comodín como *.vercel.app. */
export function hostsPermitidos(env: Variables): string[] {
  const hosts = [env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => host.toLowerCase());
  return [...new Set([...hosts, "localhost:*"])];
}

/**
 * Better Auth (D8): User es la identidad canónica; no hay tabla AdminUser paralela.
 * - Email y contraseña, registro público desactivado, sesiones en Neon y TOTP obligatorio (lo exige el panel).
 * - Ningún camino de Better Auth puede crear usuarios: el hook lo rechaza siempre. El único alta es la
 *   inicial (alta-inicial.ts), que crea el usuario directamente en una transacción.
 * - Rate limiting en base de datos para las peticiones HTTP a /api/auth. Las Server Actions del panel no pasan
 *   por él, así que usan el limitador propio (limite.ts).
 * - IP y user agent de las sesiones: solo seguridad (§16.1). Se borran con la sesión y nunca van a AuditLog.
 */
export function crearAuth(bd: ClienteBD, env: Variables = process.env) {
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Falta BETTER_AUTH_SECRET (32 caracteres o más) en las variables de Vercel.");
  }
  const urlProduccion = env.VERCEL_PROJECT_PRODUCTION_URL;

  return betterAuth({
    appName: NOMBRE_APLICACION,
    secret,
    baseURL: {
      allowedHosts: hostsPermitidos(env),
      fallback: urlProduccion ? `https://${urlProduccion}` : "http://localhost:3000",
    },
    database: prismaAdapter(bd, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
      minPasswordLength: LONGITUD_MINIMA_CONTRASENA,
      maxPasswordLength: 128,
    },
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 60,
      // Sin caché en cookie: una sesión revocada deja de valer en la siguiente petición.
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 5 },
        "/two-factor/verify-backup-code": { window: 60, max: 5 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async () => {
            throw new APIError("FORBIDDEN", {
              message: "Los usuarios del panel solo se crean con el alta inicial.",
            });
          },
        },
      },
    },
    plugins: [twoFactor({ issuer: NOMBRE_APLICACION }), admin({ adminRoles: ["admin"] }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof crearAuth>;
