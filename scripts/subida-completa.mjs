// ¿Está completa la subida? (D-SUBIDA-POR-LOTES)
//
// La web de GitHub admite 100 archivos por subida, así que una entrega grande llega en varios commits.
// `manifiesto-subida.json` lista todos los archivos de la entrega con su huella SHA-256. Mientras falte alguno
// o no coincida, ni Vercel despliega ni CI ejecuta las pruebas: así nunca se construye un repositorio a medias.
//
//   node scripts/subida-completa.mjs          → Vercel (ignoreCommand): sale con 1 si está completa (se despliega)
//                                               y con 0 si no (Vercel omite el despliegue).
//   node scripts/subida-completa.mjs --ci     → GitHub Actions: escribe completa=true|false en GITHUB_OUTPUT.
//   node scripts/subida-completa.mjs --informe → solo informa; sale con 0 si está completa y con 2 si no.
//
// Sin dependencias: se ejecuta antes de instalar nada.
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modo = process.argv[2] ?? "--vercel";

/** @returns {{ entrega: string, archivos: Record<string, string> } | null} */
function leerManifiesto() {
  const ruta = path.join(raiz, "manifiesto-subida.json");
  if (!existsSync(ruta)) return null;
  return JSON.parse(readFileSync(ruta, "utf8"));
}

/** Huella con fin de línea normalizado (LF): igual en Windows, en Linux y en GitHub. */
function huella(ruta) {
  const contenido = readFileSync(ruta);
  const normalizado = contenido.includes(13) ? Buffer.from(contenido.toString("binary").replace(/\r\n/g, "\n"), "binary") : contenido;
  return createHash("sha256").update(normalizado).digest("hex");
}

const manifiesto = leerManifiesto();
const pendientes = [];
if (manifiesto) {
  for (const [archivo, esperada] of Object.entries(manifiesto.archivos)) {
    const ruta = path.join(raiz, ...archivo.split("/"));
    if (!existsSync(ruta)) pendientes.push(`falta ${archivo}`);
    else if (huella(ruta) !== esperada) pendientes.push(`no coincide ${archivo}`);
  }
}

const completa = manifiesto !== null && pendientes.length === 0;
const total = manifiesto ? Object.keys(manifiesto.archivos).length : 0;

if (completa) {
  console.log(`✔ Subida completa: entrega «${manifiesto.entrega}», ${total} archivos verificados.`);
} else if (!manifiesto) {
  console.log("✖ Falta manifiesto-subida.json: no se puede comprobar la subida.");
} else {
  console.log(`⏸ Subida incompleta (entrega «${manifiesto.entrega}»): ${pendientes.length} de ${total} archivos pendientes.`);
  for (const linea of pendientes.slice(0, 20)) console.log(`  · ${linea}`);
  if (pendientes.length > 20) console.log(`  · … y ${pendientes.length - 20} más`);
  console.log("  Sube el resto de los lotes: el despliegue y las pruebas se ejecutan en cuanto esté todo.");
}

if (modo === "--ci") {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `completa=${completa}\n`);
  process.exit(0);
}
if (modo === "--informe") process.exit(completa ? 0 : 2);
// Vercel: 1 = continuar con el build; 0 = omitirlo.
process.exit(completa ? 1 : 0);
