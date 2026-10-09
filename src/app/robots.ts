import type { MetadataRoute } from "next";
import { sitioIndexable, urlBaseSitio } from "@/lib/sitio";

/** Hasta el lanzamiento (SITIO_PUBLICO=si), nada se indexa. Después: todo menos el panel y las rutas técnicas. */
export default function robots(): MetadataRoute.Robots {
  if (!sitioIndexable()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/estado"] }],
    sitemap: `${urlBaseSitio()}/sitemap.xml`,
  };
}
