/**
 * Caché pública (D-CACHE-TAG). Etiqueta única de todo lo que lee la web pública: la versión publicada.
 * Al publicar, una Server Action la invalida con updateTag(ETIQUETA_SITIO_PUBLICO).
 */
export const ETIQUETA_SITIO_PUBLICO = "site-public";

/** Rutas que dependen de la versión publicada y se revalidan al publicar. */
export const RUTAS_SITIO_PUBLICO = ["/", "/estado"] as const;
