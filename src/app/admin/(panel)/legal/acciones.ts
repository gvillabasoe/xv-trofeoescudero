"use server";

import { revalidatePath } from "next/cache";
import { requerirAdmin } from "@/server/auth/guardas";
import { invalidarSitioPublico } from "@/server/cache/invalidar-sitio";
import { obtenerPrisma } from "@/server/db";
import { ErrorLegal, publicarVersionLegal } from "@/server/legal";
import type { EstadoEdicion } from "@/server/panel/acciones";

export async function accionPublicarLegal(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (formulario.get("_confirmar") !== "si") return { ok: false, mensaje: "Marca la casilla para confirmar la publicación." };
  try {
    const resultado = await publicarVersionLegal(obtenerPrisma(), {
      paginaId: String(formulario.get("_id") ?? ""),
      version: Number(formulario.get("_version")),
      actorId: usuario.id,
    });
    if (resultado.nueva) invalidarSitioPublico();
    revalidatePath("/admin", "layout");
    return {
      ok: true,
      mensaje: resultado.nueva
        ? `Publicada la versión ${resultado.etiqueta}. Ya está en la web.`
        : `El texto no ha cambiado: sigue vigente la versión ${resultado.etiqueta}.`,
      marca: Date.now(),
    };
  } catch (error) {
    if (error instanceof ErrorLegal) return { ok: false, mensaje: error.message };
    throw error;
  }
}
