import { createHash, timingSafeEqual } from "node:crypto";
import { hayBaseDeDatos, obtenerPrisma } from "@/server/db";
import { obtenerAlmacen } from "@/server/medios/almacen";
import { ejecutarRetencion } from "@/server/trabajos/retencion";

/**
 * Tarea diaria de retención, invocada por Vercel Cron (vercel.json). Vercel envía «Authorization: Bearer
 * <CRON_SECRET>»; sin CRON_SECRET configurado, la ruta no hace nada (401).
 */
export const maxDuration = 60;

function autorizada(cabecera: string | null, secreto: string | undefined): boolean {
  if (!secreto || secreto.length < 16 || !cabecera) return false;
  const esperado = createHash("sha256").update(`Bearer ${secreto}`).digest();
  const recibido = createHash("sha256").update(cabecera).digest();
  return timingSafeEqual(esperado, recibido);
}

export async function GET(peticion: Request) {
  if (!autorizada(peticion.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("No autorizada", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!hayBaseDeDatos()) {
    return Response.json({ ok: false, motivo: "sin base de datos" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const resumen = await ejecutarRetencion(obtenerPrisma(), { almacen: obtenerAlmacen() });
  console.info("[retencion]", JSON.stringify(resumen));
  return Response.json({ ok: true, resumen }, { headers: { "Cache-Control": "no-store" } });
}
