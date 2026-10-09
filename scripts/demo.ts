// `db:seed:demo` (Entrega 4A): crea las propuestas demo si no hay ninguna.
// Solo en desarrollo o preview con la base NONPROD. Nunca se ejecuta automáticamente en un despliegue.
import { obtenerPrisma } from "@/server/db";
import { sembrarDemo } from "@/server/semilla/demo";

const prisma = obtenerPrisma();
try {
  const { creadas, existentes } = await sembrarDemo(prisma, { env: process.env });
  console.log(
    creadas > 0
      ? `✔ Demo: ${creadas} propuestas ficticias creadas.`
      : `✔ Demo: ya hay ${existentes} propuestas ficticias; no se crea ninguna. Para recrearlas, usa el reset del panel.`,
  );
} catch (error) {
  console.error(`\n✖ ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
