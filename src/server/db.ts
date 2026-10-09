import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

// Único punto de la aplicación que crea el cliente de Prisma y elige el adaptador (ESLint lo impone).
// En tiempo de ejecución se usa DATABASE_URL, con pool de conexiones; las migraciones usan DIRECT_URL a
// través de prisma.config.ts.
// - Neon (Vercel): adaptador de Neon.
// - PostgreSQL local (localhost / 127.0.0.1): adaptador de PostgreSQL. Solo lo usan las pruebas de extremo a
//   extremo de CI y la comprobación local, con bases desechables y datos de prueba.

/** Cliente completo (permite transacciones). El resto del código recibe el cliente como argumento. */
export type ClienteBD = PrismaClient;
/** Cliente dentro de una transacción, o el cliente completo. */
export type ConsultasBD = Prisma.TransactionClient;

const globalConPrisma = globalThis as typeof globalThis & { prismaTrofeo?: PrismaClient };

export function hayBaseDeDatos(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** true si la URL apunta a un PostgreSQL de esta misma máquina. */
export function esBaseLocal(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function obtenerPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL: la base de datos solo está disponible en Vercel.");
  }
  globalConPrisma.prismaTrofeo ??= new PrismaClient({
    adapter: esBaseLocal(connectionString)
      ? new PrismaPg({ connectionString })
      : new PrismaNeon({ connectionString }),
  });
  return globalConPrisma.prismaTrofeo;
}
