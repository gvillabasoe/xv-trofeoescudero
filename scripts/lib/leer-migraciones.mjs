import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { analizarSql } from "./migraciones.mjs";

export const CARPETA_MIGRACIONES = path.join(process.cwd(), "prisma", "migrations");

/**
 * Lee las migraciones versionadas (una carpeta con migration.sql por migración) y las analiza.
 * @returns {Promise<{ nombre: string, motivos: string[] }[]>}
 */
export async function leerMigraciones() {
  const entradas = await readdir(CARPETA_MIGRACIONES, { withFileTypes: true });
  const nombres = entradas
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort();

  return Promise.all(
    nombres.map(async (nombre) => {
      const sql = await readFile(path.join(CARPETA_MIGRACIONES, nombre, "migration.sql"), "utf8");
      return { nombre, motivos: analizarSql(sql) };
    }),
  );
}
