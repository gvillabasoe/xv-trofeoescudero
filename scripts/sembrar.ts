// Seed del build de Vercel (Entrega 3). Lo ejecuta `vercel-build` con tsx, después de las migraciones
// y del marcador de entorno, que ya se han comprobado. Es idempotente: en cada despliegue solo crea lo que falte.
import { obtenerPrisma } from "@/server/db";
import { sembrar } from "@/server/semilla/sembrar";

const entorno = process.env.ENTORNO_DATOS;
if (entorno !== "NONPROD") {
  // Durante la Fase 3 no existe producción: el seed de producción se activa en el lanzamiento (F8).
  console.error("\n✖ Seed: solo se ejecuta con ENTORNO_DATOS=NONPROD durante la Fase 3.\n");
  process.exit(1);
}

const prisma = obtenerPrisma();
try {
  const { creados, publicada } = await sembrar(prisma, { entorno });
  const lista = Object.entries(creados).map(([tipo, cantidad]) => `${tipo} ${cantidad}`);
  console.log(lista.length > 0 ? `✔ Seed: creados → ${lista.join(" · ")}` : "✔ Seed: no faltaba nada.");
  console.log(
    publicada !== null
      ? `✔ Seed: publicada la versión nº ${publicada}.`
      : "✔ Seed: ya había una versión publicada; no se publica otra.",
  );
} catch (error) {
  console.error(`\n✖ Seed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
