import { cacheLife, cacheTag } from "next/cache";
import { ETIQUETA_SITIO_PUBLICO } from "@/lib/cache";
import { hayBaseDeDatos, obtenerPrisma } from "@/server/db";
import { leerVersionPublicadaDe, type VersionPublicada } from "@/server/version-publicada";

export type { VersionPublicada };

/**
 * La web pública solo lee esto: el snapshot de la versión publicada, en caché (fase-2 §8, paso 7).
 * - cacheTag("site-public"): una publicación la invalida con updateTag desde una Server Action.
 * - cacheLife("max"): el contenido solo cambia al publicar; no hace falta caducidad por tiempo.
 * - No consulta Neon en cada visita: la página se genera en el build y se regenera al invalidar la etiqueta.
 */
export async function leerVersionPublicada(): Promise<VersionPublicada | null> {
  "use cache";
  cacheTag(ETIQUETA_SITIO_PUBLICO);
  cacheLife("max");

  if (!hayBaseDeDatos()) {
    return null;
  }

  const version = await leerVersionPublicadaDe(obtenerPrisma());
  // Instrumentación no sensible: aparece en los logs de Vercel (build o regeneración) cada vez que la
  // consulta se ejecuta de verdad. Si una visita no deja esta línea, se ha servido desde la caché.
  console.info(
    version
      ? `[cache:${ETIQUETA_SITIO_PUBLICO}] Lectura real de Neon · revisión nº ${version.numero} · lectura ${version.lecturaId}`
      : `[cache:${ETIQUETA_SITIO_PUBLICO}] Lectura real de Neon · sin versión publicada`,
  );
  return version;
}
