"use server";

import { revalidatePath } from "next/cache";
import { auditar, marcarCambiosSinPublicar } from "@/server/auditoria";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { MENSAJE_CONFLICTO } from "@/server/panel/entidades";
import type { EstadoEdicion } from "@/server/panel/acciones";

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

/** Archivar o recuperar una entidad. Nunca se borra: el hecho histórico se conserva. */
export async function accionArchivarPatrocinador(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const id = texto(formulario, "_id");
  const version = Number(texto(formulario, "_version"));
  const archivar = texto(formulario, "_accion") === "archivar";
  const bd = obtenerPrisma();
  const resultado = await bd.$transaction(async (tx) => {
    const { count } = await tx.sponsor.updateMany({
      where: { id, version },
      data: { lifecycle: archivar ? "ARCHIVADO" : "ACTIVO", updatedById: usuario.id, version: { increment: 1 } },
    });
    if (count === 0) return false;
    await marcarCambiosSinPublicar(tx);
    await auditar(tx, {
      actorId: usuario.id,
      accion: "PATROCINADOR_ARCHIVADO",
      entidad: "sponsor",
      entidadId: id,
      resumen: archivar ? "Entidad archivada (deja de publicarse)" : "Entidad recuperada del archivo",
    });
    return true;
  });
  if (!resultado) return { ok: false, mensaje: MENSAJE_CONFLICTO };
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje: archivar ? "Archivada." : "Recuperada.", marca: Date.now() };
}
