type Variables = Readonly<Record<string, string | undefined>>;

/**
 * Lanzamiento (F8). Mientras SITIO_PUBLICO no valga exactamente «si», nada se indexa: cabecera X-Robots-Tag,
 * metadatos robots y robots.txt dicen «noindex». Esta variable solo la activa la organización al lanzar.
 */
export function sitioIndexable(env: Variables = process.env): boolean {
  return env.SITIO_PUBLICO === "si";
}

/** URL base del sitio: dominio propio (URL_PUBLICA, P3) o el dominio de producción de Vercel. */
export function urlBaseSitio(env: Variables = process.env): string {
  const propia = env.URL_PUBLICA?.trim().replace(/\/+$/, "");
  if (propia && /^https:\/\/[a-z0-9.-]+$/i.test(propia)) return propia;
  if (env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
