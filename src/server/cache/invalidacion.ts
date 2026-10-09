import { ETIQUETA_SITIO_PUBLICO, RUTAS_SITIO_PUBLICO } from "@/lib/cache";

/** Las dos funciones de Next que necesita la invalidación. Se inyectan para poder probarla sin Next. */
export interface ApiCacheNext {
  updateTag(etiqueta: string): void;
  revalidatePath(ruta: string): void;
}

/**
 * Servicio interno de invalidación del sitio público (D-CACHE-TAG).
 * - updateTag: caduca de inmediato lo cacheado con «site-public»; la siguiente visita ya ve la versión nueva.
 * - revalidatePath: regenera las rutas que dependen de la versión publicada (metadatos y estructura).
 * Solo puede llamarse desde una Server Action (restricción de updateTag en Next 16).
 */
export function crearInvalidador(api: ApiCacheNext) {
  return {
    invalidarSitioPublico(): { etiqueta: string; rutas: string[] } {
      api.updateTag(ETIQUETA_SITIO_PUBLICO);
      for (const ruta of RUTAS_SITIO_PUBLICO) {
        api.revalidatePath(ruta);
      }
      return { etiqueta: ETIQUETA_SITIO_PUBLICO, rutas: [...RUTAS_SITIO_PUBLICO] };
    },
  };
}
