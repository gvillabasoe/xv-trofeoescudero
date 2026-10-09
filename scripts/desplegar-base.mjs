// Paso de base de datos del build de Vercel (Entrega 2). Lo ejecuta el script `vercel-build`:
//
//   node scripts/desplegar-base.mjs antes    → comprobaciones previas a `prisma migrate deploy`
//   node scripts/desplegar-base.mjs despues  → fija y verifica el marcador de entorno de la base
//
// Si algo no cuadra, el build falla y Vercel mantiene el despliegue anterior.
// Nunca imprime URLs ni credenciales.
import { neon } from "@neondatabase/serverless";
import pg from "pg";
import { leerMigraciones } from "./lib/leer-migraciones.mjs";
import { calcularPendientes, decidirDestructivas, revisarVariables } from "./lib/migraciones.mjs";

/**
 * @param {string} mensaje
 * @returns {never}
 */
function fallar(mensaje) {
  console.error(`\n✖ Base de datos: ${mensaje}\n`);
  process.exit(1);
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction<false, false>} sql
 * @param {string} tabla
 */
async function existeTabla(sql, tabla) {
  const filas = await sql`SELECT to_regclass(${`public."${tabla}"`}) IS NOT NULL AS "existe"`;
  return filas[0]?.existe === true;
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction<false, false>} sql
 * @returns {Promise<string | null>}
 */
async function leerMarcador(sql) {
  const filas = await sql`SELECT "environment"::text AS "entorno" FROM "PolicySettings" WHERE "id" = 1`;
  return filas[0]?.entorno ?? null;
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction<false, false>} sql
 * @param {string} entorno
 */
async function antes(sql, entorno) {
  const hayMarcador = await existeTabla(sql, "PolicySettings");
  const hayHistorial = await existeTabla(sql, "_prisma_migrations");

  // 1. La base tiene que ser la de este entorno.
  if (hayMarcador) {
    const marcador = await leerMarcador(sql);
    if (marcador && marcador !== entorno) {
      fallar(`la base está marcada como ${marcador} y este despliegue espera ${entorno}. No se migra nada.`);
    }
  } else if (!hayHistorial) {
    const filas = await sql`SELECT count(*)::int AS "total" FROM information_schema.tables WHERE table_schema = 'public'`;
    if ((filas[0]?.total ?? 0) > 0) {
      fallar(
        "la base no está vacía y no tiene ni marcador de entorno ni historial de migraciones de este proyecto. Revisa que DATABASE_URL y DIRECT_URL son de la rama correcta de Neon.",
      );
    }
  }

  // 2. Ninguna migración puede haber quedado a medias.
  /** @type {string[]} */
  let aplicadas = [];
  if (hayHistorial) {
    const filas = await sql`
      SELECT "migration_name" AS "nombre",
             "finished_at" IS NOT NULL AS "terminada",
             "rolled_back_at" IS NOT NULL AS "revertida"
      FROM "_prisma_migrations"`;
    const aMedias = filas.filter((fila) => !fila.terminada && !fila.revertida).map((fila) => String(fila.nombre));
    if (aMedias.length > 0) {
      fallar(`la migración ${aMedias.join(", ")} quedó a medias en un despliegue anterior. No reintentes: avisa para revisarla.`);
    }
    aplicadas = filas.filter((fila) => fila.terminada && !fila.revertida).map((fila) => String(fila.nombre));
  }

  // 3. Las destructivas solo se aplican con confirmación explícita (§13).
  const locales = await leerMigraciones();
  const nombresLocales = locales.map((migracion) => migracion.nombre);
  const nombresPendientes = calcularPendientes(nombresLocales, aplicadas);
  const pendientes = locales.filter((migracion) => nombresPendientes.includes(migracion.nombre));

  const desconocidas = aplicadas.filter((nombre) => !nombresLocales.includes(nombre));
  if (desconocidas.length > 0) {
    console.warn(`⚠ La base tiene migraciones que este código no conoce: ${desconocidas.join(", ")}.`);
  }

  const decision = decidirDestructivas(pendientes, process.env.CONFIRMAR_MIGRACION_DESTRUCTIVA);
  if (!decision.permitido) fallar(decision.mensaje ?? "migración destructiva sin confirmar.");
  if (decision.mensaje) console.warn(`⚠ ${decision.mensaje}`);

  console.log(`✔ Base de datos ${entorno}: ${aplicadas.length} migraciones aplicadas.`);
  console.log(
    nombresPendientes.length === 0
      ? "✔ No hay migraciones pendientes."
      : `→ Pendientes (no destructivas o confirmadas): ${nombresPendientes.join(", ")}.`,
  );
  console.log("→ Punto de recuperación: no aplica en NONPROD (se restaura desde la consola de Neon).");
}

/**
 * @param {import("@neondatabase/serverless").NeonQueryFunction<false, false>} sql
 * @param {string} entorno
 */
async function despues(sql, entorno) {
  // El marcador se fija una sola vez, al crear la base. Después solo se comprueba.
  await sql`
    INSERT INTO "PolicySettings" ("id", "environment")
    VALUES (1, ${entorno}::"DataEnvironment")
    ON CONFLICT ("id") DO NOTHING`;
  const marcador = await leerMarcador(sql);
  if (marcador !== entorno) {
    fallar(`la base está marcada como ${marcador ?? "(sin marcador)"} y este despliegue espera ${entorno}.`);
  }
  console.log(`✔ Marcador de entorno de la base: ${marcador}.`);
}

const modo = process.argv[2];
if (modo !== "antes" && modo !== "despues") {
  fallar("uso: node scripts/desplegar-base.mjs antes | despues");
}

const { errores, avisos, entorno } = revisarVariables(process.env);
for (const aviso of avisos) console.warn(`⚠ ${aviso}`);
if (errores.length > 0 || !entorno) {
  fallar(errores.join("\n  "));
}

/**
 * PostgreSQL local (pruebas de extremo a extremo de CI y comprobación local): misma interfaz que `neon()`.
 * @param {string} url
 */
function sqlLocal(url) {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  /** @param {TemplateStringsArray} partes @param {unknown[]} valores */
  const consulta = async (partes, ...valores) => {
    const texto = partes.reduce((total, parte, indice) => total + parte + (indice < valores.length ? `$${indice + 1}` : ""), "");
    const { rows } = await pool.query(texto, valores);
    return rows;
  };
  return Object.assign(consulta, { cerrar: () => pool.end() });
}

const urlDirecta = /** @type {string} */ (process.env.DIRECT_URL);
const esLocal = ["localhost", "127.0.0.1"].includes(new URL(urlDirecta).hostname);
const local = esLocal ? sqlLocal(urlDirecta) : null;
const sql = /** @type {import("@neondatabase/serverless").NeonQueryFunction<false, false>} */ (
  /** @type {unknown} */ (local ?? neon(urlDirecta))
);
try {
  if (modo === "antes") {
    await antes(sql, entorno);
  } else {
    await despues(sql, entorno);
  }
} catch (error) {
  await local?.cerrar();
  fallar(`no se pudo consultar la base (${error instanceof Error ? error.message : String(error)}).`);
}
await local?.cerrar();
