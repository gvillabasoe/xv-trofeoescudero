"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import type { EstadoEdicion } from "@/server/panel/acciones";
import {
  ConflictoPropuesta,
  ESTADOS_PROPUESTA,
  PropuestaNoDisponible,
  anadirNota,
  anonimizar,
  archivar,
  cambiarEstado,
  eliminar,
  type EstadoPropuesta,
} from "@/server/propuestas/bandeja";

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

async function ejecutar(operacion: () => Promise<void>, mensaje: string): Promise<EstadoEdicion> {
  try {
    await operacion();
  } catch (error) {
    if (error instanceof ConflictoPropuesta || error instanceof PropuestaNoDisponible) return { ok: false, mensaje: error.message };
    throw error;
  }
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje, marca: Date.now() };
}

export async function accionCambiarEstado(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const estado = texto(formulario, "estado");
  if (!(ESTADOS_PROPUESTA as readonly string[]).includes(estado)) return { ok: false, mensaje: "Elige un estado." };
  return ejecutar(
    () =>
      cambiarEstado(obtenerPrisma(), {
        id: texto(formulario, "_id"),
        version: Number(texto(formulario, "_version")),
        estado: estado as EstadoPropuesta,
        nota: texto(formulario, "nota") || null,
        actorId: usuario.id,
      }),
    "Estado actualizado.",
  );
}

export async function accionNota(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  return ejecutar(
    () => anadirNota(obtenerPrisma(), { id: texto(formulario, "_id"), texto: texto(formulario, "nota"), actorId: usuario.id }),
    "Nota guardada.",
  );
}

export async function accionArchivar(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const archivarla = texto(formulario, "_accion") === "archivar";
  return ejecutar(
    () =>
      archivar(obtenerPrisma(), {
        id: texto(formulario, "_id"),
        version: Number(texto(formulario, "_version")),
        archivar: archivarla,
        actorId: usuario.id,
      }),
    archivarla ? "Archivada." : "Recuperada del archivo.",
  );
}

/** Doble confirmación: casilla + escribir la palabra exacta. */
export async function accionAnonimizar(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (texto(formulario, "_confirmar") !== "si" || texto(formulario, "palabra").trim() !== "ANONIMIZAR") {
    return { ok: false, mensaje: "Marca la casilla y escribe ANONIMIZAR, en mayúsculas, para confirmar." };
  }
  return ejecutar(
    () => anonimizar(obtenerPrisma(), { id: texto(formulario, "_id"), version: Number(texto(formulario, "_version")), actorId: usuario.id }),
    "Propuesta anonimizada.",
  );
}

export async function accionEliminar(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (texto(formulario, "_confirmar") !== "si" || texto(formulario, "palabra").trim() !== "ELIMINAR") {
    return { ok: false, mensaje: "Marca la casilla y escribe ELIMINAR, en mayúsculas, para confirmar." };
  }
  const resultado = await ejecutar(
    () => eliminar(obtenerPrisma(), { id: texto(formulario, "_id"), version: Number(texto(formulario, "_version")), actorId: usuario.id }),
    "Eliminada.",
  );
  if (resultado.ok) redirect("/admin/propuestas");
  return resultado;
}
