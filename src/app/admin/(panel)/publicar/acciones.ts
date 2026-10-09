"use server";

import { revalidatePath } from "next/cache";
import { ErrorPublicacion } from "@/lib/snapshot/construir";
import { requerirAdmin } from "@/server/auth/guardas";
import { invalidarSitioPublico } from "@/server/cache/invalidar-sitio";
import { obtenerPrisma } from "@/server/db";
import type { EstadoEdicion } from "@/server/panel/acciones";
import { ConflictoDeVersion, publicar } from "@/server/publicacion";

/** Publica el borrador: revisión nueva e inmutable, auditoría e invalidación de la caché pública. */
export async function accionPublicar(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (formulario.get("_confirmar") !== "si") return { ok: false, mensaje: "Marca la casilla para confirmar la publicación." };
  const comentario = String(formulario.get("comentario") ?? "").trim().slice(0, 300) || null;
  try {
    const resultado = await publicar(obtenerPrisma(), {
      actorId: usuario.id,
      comentario,
      versionEsperada: Number(formulario.get("_version")),
    });
    revalidatePath("/admin", "layout");
    if (!resultado.publicada) {
      return { ok: true, mensaje: `No hay cambios: sigue publicada la versión nº ${resultado.numero}.`, marca: Date.now() };
    }
    invalidarSitioPublico();
    return { ok: true, mensaje: `Publicada la versión nº ${resultado.numero}. La web ya la muestra.`, marca: Date.now() };
  } catch (error) {
    if (error instanceof ConflictoDeVersion) return { ok: false, mensaje: error.message };
    if (error instanceof ErrorPublicacion) return { ok: false, mensaje: `No se puede publicar: ${error.motivos.join(" · ")}` };
    throw error;
  }
}
