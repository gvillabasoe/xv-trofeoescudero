import { obtenerSesionAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { exportarPropuestas } from "@/server/propuestas/csv";
import { filtroDesdeParametros } from "../filtro";

/** Exportación CSV de la bandeja (con el filtro de la URL). Solo administradores con TOTP. Queda auditada. */
export async function GET(peticion: Request) {
  const sesion = await obtenerSesionAdmin();
  if (!sesion || !sesion.usuario.twoFactorEnabled) {
    return new Response("No autorizado", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const filtro = filtroDesdeParametros(new URL(peticion.url).searchParams);
  const { csv } = await exportarPropuestas(obtenerPrisma(), { filtro, actorId: sesion.usuario.id });
  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="propuestas-${fecha}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
