import { obtenerSesionAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { obtenerAlmacen } from "@/server/medios/almacen";

/** Vista privada de una imagen para el panel (cualquier estado). Solo administradores con TOTP. */
export async function GET(_peticion: Request, contexto: { params: Promise<{ id: string }> }) {
  const sesion = await obtenerSesionAdmin();
  if (!sesion || !sesion.usuario.twoFactorEnabled) return new Response("No autorizado", { status: 401 });
  const { id } = await contexto.params;
  const variante = await obtenerPrisma().mediaVariant.findFirst({
    where: { mediaId: id, format: "WEBP" },
    orderBy: { width: "asc" },
    select: { publicPathname: true },
  });
  const almacen = obtenerAlmacen();
  const contenido = variante && almacen ? await almacen.leer(`variantes/${variante.publicPathname}`) : null;
  if (!contenido) return new Response("No encontrada", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(contenido.cuerpo, {
    headers: {
      "Content-Type": contenido.tipo,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
