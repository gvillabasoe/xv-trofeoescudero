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

export interface DocumentoLegal {
  /** Id de la LegalVersion: es lo que se acepta en el formulario. */
  id: string;
  slug: string;
  titulo: string;
  etiquetaVersion: string;
  cuerpo: string;
  publicadoEn: string;
}

export interface LegalesPublicos {
  privacidad: DocumentoLegal | null;
  avisoLegal: DocumentoLegal | null;
}

/**
 * Última versión publicada de cada texto legal (LegalVersion, inmutable). Misma etiqueta de caché: publicar
 * una versión legal invalida «site-public». Sin versión publicada, la página no existe (404) y, en el caso de
 * la privacidad, el formulario de /proponer permanece cerrado.
 */
export async function leerLegales(): Promise<LegalesPublicos> {
  "use cache";
  cacheTag(ETIQUETA_SITIO_PUBLICO);
  cacheLife("max");

  if (!hayBaseDeDatos()) return { privacidad: null, avisoLegal: null };
  const versiones = await obtenerPrisma().legalVersion.findMany({
    where: { legalPage: { slug: { in: ["privacidad", "aviso-legal"] } } },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      versionLabel: true,
      body: true,
      publishedAt: true,
      legalPage: { select: { slug: true, title: true } },
    },
  });
  const ultima = (slug: string): DocumentoLegal | null => {
    const version = versiones.find((candidata) => candidata.legalPage.slug === slug);
    return version
      ? {
          id: version.id,
          slug,
          titulo: version.legalPage.title,
          etiquetaVersion: version.versionLabel,
          cuerpo: version.body,
          publicadoEn: version.publishedAt.toISOString(),
        }
      : null;
  };
  return { privacidad: ultima("privacidad"), avisoLegal: ultima("aviso-legal") };
}

/** ¿Hay enlace a cada texto legal en el pie? */
export function legalesPublicados(legales: LegalesPublicos) {
  return { privacidad: legales.privacidad !== null, avisoLegal: legales.avisoLegal !== null };
}
