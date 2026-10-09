import { PATRON_URL_MEDIO } from "@/lib/snapshot/esquema";
import { hayBaseDeDatos, obtenerPrisma } from "@/server/db";
import { obtenerAlmacen } from "@/server/medios/almacen";

/**
 * Variantes web de las imágenes autorizadas (D-MEDIA-PRIVADO). El almacén es privado: esta ruta comprueba en
 * cada petición que la imagen sigue autorizada o publicada y que no se ha retirado. Si se retira (por ejemplo,
 * porque alguien retira su consentimiento), deja de servirse; la caché del CDN dura como mucho una hora.
 */
export async function GET(_peticion: Request, contexto: { params: Promise<{ archivo: string }> }) {
  const { archivo } = await contexto.params;
  if (!PATRON_URL_MEDIO.test(`/medios/${archivo}`) || !hayBaseDeDatos()) return noEncontrada();

  const variante = await obtenerPrisma().mediaVariant.findUnique({
    where: { publicPathname: archivo },
    select: { media: { select: { reviewState: true, retiredAt: true } } },
  });
  const estado = variante?.media.reviewState;
  if (!variante || variante.media.retiredAt || (estado !== "AUTORIZADA" && estado !== "PUBLICADA")) return noEncontrada();

  const almacen = obtenerAlmacen();
  const contenido = almacen ? await almacen.leer(`variantes/${archivo}`) : null;
  if (!contenido) return noEncontrada();

  return new Response(contenido.cuerpo, {
    headers: {
      "Content-Type": contenido.tipo,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Disposition": "inline",
    },
  });
}

function noEncontrada() {
  return new Response("No encontrada", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
