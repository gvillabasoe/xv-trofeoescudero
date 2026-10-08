// Informe de migraciones destructivas para CI (informativo: siempre termina en 0).
// La puerta real está en el build de Vercel (scripts/desplegar-base.mjs), que no aplica una
// migración destructiva sin CONFIRMAR_MIGRACION_DESTRUCTIVA.
import { leerMigraciones } from "./lib/leer-migraciones.mjs";

const migraciones = await leerMigraciones();

for (const { nombre, motivos } of migraciones) {
  if (motivos.length === 0) {
    console.log(`✔ ${nombre}: no destructiva`);
  } else {
    console.log(`::warning title=Migración destructiva::${nombre} — ${motivos.join("; ")}. Necesitará confirmación en Vercel.`);
  }
}

console.log(`${migraciones.length} migraciones revisadas.`);
