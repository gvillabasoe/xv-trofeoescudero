import { cacheLife } from "next/cache";
import type { EstadoBase } from "@/lib/estado-base";
import { hayBaseDeDatos, obtenerPrisma } from "@/server/db";

/**
 * Lee el estado de la base para la página de estado técnico. Va en caché y se rellena
 * durante el build, así que no hay consultas en cada visita.
 */
export async function leerEstadoBase(): Promise<EstadoBase> {
  "use cache";
  cacheLife("max");

  if (!hayBaseDeDatos()) {
    return { disponible: false };
  }

  const prisma = obtenerPrisma();
  const [politica, migraciones, tablas] = await Promise.all([
    prisma.policySettings.findUnique({ where: { id: 1 }, select: { environment: true } }),
    prisma.$queryRaw<{ total: number; ultima: string | null }[]>`
      SELECT count(*)::int AS "total", max("migration_name") AS "ultima"
      FROM "_prisma_migrations"
      WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`,
    prisma.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS "total"
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'`,
  ]);

  return {
    disponible: true,
    entorno: politica?.environment ?? null,
    migraciones: migraciones[0]?.total ?? 0,
    ultimaMigracion: migraciones[0]?.ultima ?? null,
    tablas: tablas[0]?.total ?? 0,
  };
}
