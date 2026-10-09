"use server";

import { revalidatePath } from "next/cache";
import { ErrorPublicacion } from "@/lib/snapshot/construir";
import { requerirAdmin } from "@/server/auth/guardas";
import { invalidarSitioPublico } from "@/server/cache/invalidar-sitio";
import { obtenerPrisma } from "@/server/db";
import type { EstadoEdicion } from "@/server/panel/acciones";
import { ConflictoDeVersion, RevisionNoEncontrada, restaurarRevision } from "@/server/publicacion";

/** Restaura una versión antigua como versión nueva, revisada con los derechos de hoy. */
export async function accionRestaurar(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (formulario.get("_confirmar") !== "si") return { ok: false, mensaje: "Marca la casilla para confirmar la restauración." };
  try {
    const resultado = await restaurarRevision(obtenerPrisma(), {
      numero: Number(formulario.get("_numero")),
      actorId: usuario.id,
      versionEsperada: Number(formulario.get("_version")),
    });
    invalidarSitioPublico();
    revalidatePath("/admin", "layout");
    return {
      ok: true,
      mensaje: `Restaurada como versión nº ${resultado.numero}.${
        resultado.retirado.length ? ` Se han quitado ${resultado.retirado.length} elementos que hoy no se pueden publicar.` : ""
      } El borrador no cambia: revísalo antes de la próxima publicación.`,
      marca: Date.now(),
    };
  } catch (error) {
    if (error instanceof ConflictoDeVersion || error instanceof RevisionNoEncontrada) return { ok: false, mensaje: error.message };
    if (error instanceof ErrorPublicacion) return { ok: false, mensaje: `No se puede restaurar: ${error.motivos.join(" · ")}` };
    throw error;
  }
}
