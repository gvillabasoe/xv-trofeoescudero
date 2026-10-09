import type { MetadataRoute } from "next";
import { urlBaseSitio } from "@/lib/sitio";
import { leerLegales } from "@/server/snapshot-publico";

/** Rutas públicas (fase-1 §7). Los textos legales, solo si tienen una versión publicada. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlBaseSitio();
  const legales = await leerLegales();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/proponer`, changeFrequency: "monthly", priority: 0.8 },
    ...(legales.privacidad ? [{ url: `${base}/privacidad`, changeFrequency: "yearly" as const, priority: 0.2 }] : []),
    ...(legales.avisoLegal ? [{ url: `${base}/aviso-legal`, changeFrequency: "yearly" as const, priority: 0.2 }] : []),
  ];
}
