// `db:bootstrap` (Entrega 4A). Lo ejecuta `vercel-build` con tsx, después de las migraciones y del marcador
// de entorno. Es una operación corta: no hay backfills largos dentro del build.
//   1. Bootstrap de una sola ejecución (initial-content-v1): no-op si ya está registrado.
//   2. Backfills versionados pendientes.
// No crea datos demo: eso solo lo hace `db:seed:demo` o el reset del panel en preview.
import { obtenerPrisma } from "@/server/db";
import { aplicarBackfills } from "@/server/semilla/backfills";
import { bootstrap, CLAVE_CONTENIDO_INICIAL, ErrorBootstrap } from "@/server/semilla/bootstrap";

const entorno = process.env.ENTORNO_DATOS;
if (entorno !== "NONPROD") {
  // Durante la Fase 3 no existe producción: el bootstrap de producción se activa en el lanzamiento (F8).
  console.error("\n✖ Bootstrap: solo se ejecuta con ENTORNO_DATOS=NONPROD durante la Fase 3.\n");
  process.exit(1);
}

const prisma = obtenerPrisma();
try {
  const resultado = await bootstrap(prisma, { entorno });
  if (resultado.accion === "ya-registrado") {
    console.log(`✔ Bootstrap: ${CLAVE_CONTENIDO_INICIAL} ya estaba registrado; no se toca nada.`);
  } else if (resultado.accion === "registrado") {
    console.log(
      `✔ Bootstrap: instalación existente verificada y registrada como ${CLAVE_CONTENIDO_INICIAL}. No se ha creado contenido; se conserva la revisión publicada nº ${resultado.revisionNumero ?? "—"}.`,
    );
  } else {
    const lista = Object.entries(resultado.creados).map(([tipo, total]) => `${tipo} ${total}`);
    console.log(`✔ Bootstrap: base nueva inicializada → ${lista.join(" · ")} · versión publicada nº ${resultado.revisionNumero}.`);
  }

  const backfills = await aplicarBackfills(prisma, { entorno });
  for (const backfill of backfills) {
    console.log(
      backfill.estado === "aplicado"
        ? `✔ Backfill ${backfill.clave}: aplicado · ${JSON.stringify(backfill.metadata)}`
        : `✔ Backfill ${backfill.clave}: ya estaba aplicado.`,
    );
  }
} catch (error) {
  const mensaje =
    error instanceof ErrorBootstrap
      ? `${error.message}\n  Diagnóstico:\n  - ${error.problemas.join("\n  - ")}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error(`\n✖ ${mensaje}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
