import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

// Único punto de la aplicación que crea el cliente de Prisma y usa el adaptador de Neon
// (ESLint lo impone). En tiempo de ejecución se usa DATABASE_URL, con pool de conexiones;
// las migraciones usan DIRECT_URL a través de prisma.config.ts.

/** Cliente completo (permite transacciones). El resto del código recibe el cliente como argumento. */
export type ClienteBD = PrismaClient;
/** Cliente dentro de una transacción, o el cliente completo. */
export type ConsultasBD = Prisma.TransactionClient;

const globalConPrisma = globalThis as typeof globalThis & { prismaTrofeo?: PrismaClient };

export function hayBaseDeDatos(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function obtenerPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL: la base de datos solo está disponible en Vercel.");
  }
  globalConPrisma.prismaTrofeo ??= new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  return globalConPrisma.prismaTrofeo;
}
