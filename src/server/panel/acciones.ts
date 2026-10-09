"use server";

import { revalidatePath } from "next/cache";
import type { Errores } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { borrarEntidad, crearEntidad, guardarEntidad, moverEntidad, type ResultadoEdicion } from "./entidades";

/** Estado que devuelven los formularios del CMS. `marca` cambia en cada envío correcto. */
export type EstadoEdicion = { ok?: boolean; errores?: Errores; mensaje?: string; marca?: number };

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

function aEstado(resultado: ResultadoEdicion, mensajeOk: string): EstadoEdicion {
  if (resultado.ok) return { ok: true, mensaje: mensajeOk, marca: Date.now() };
  return { ok: false, errores: resultado.errores, mensaje: resultado.mensaje ?? "Revisa los campos marcados." };
}

/** Guardar cualquier entidad del registro (hidden: _entidad, _id, _version). */
export async function accionGuardarEntidad(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const resultado = await guardarEntidad(obtenerPrisma(), {
    clave: texto(formulario, "_entidad"),
    id: texto(formulario, "_id"),
    version: Number(texto(formulario, "_version")),
    formulario,
    actorId: usuario.id,
  });
  if (resultado.ok) revalidatePath("/admin", "layout");
  return aEstado(resultado, "Guardado. Los cambios están en el borrador hasta que publiques.");
}

/** Añadir un elemento a una lista (hidden: _entidad, _padre). */
export async function accionCrearEntidad(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const resultado = await crearEntidad(obtenerPrisma(), {
    clave: texto(formulario, "_entidad"),
    padreId: texto(formulario, "_padre") || null,
    formulario,
    actorId: usuario.id,
  });
  if (resultado.ok) revalidatePath("/admin", "layout");
  return aEstado(resultado, "Añadido.");
}

export async function accionBorrarEntidad(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (texto(formulario, "_confirmar") !== "si") return { ok: false, mensaje: "Confirma el borrado." };
  const resultado = await borrarEntidad(obtenerPrisma(), {
    clave: texto(formulario, "_entidad"),
    id: texto(formulario, "_id"),
    version: Number(texto(formulario, "_version")),
    actorId: usuario.id,
  });
  if (resultado.ok) revalidatePath("/admin", "layout");
  return aEstado(resultado, "Borrado.");
}

export async function accionMoverEntidad(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const resultado = await moverEntidad(obtenerPrisma(), {
    clave: texto(formulario, "_entidad"),
    id: texto(formulario, "_id"),
    direccion: texto(formulario, "_direccion") === "arriba" ? "arriba" : "abajo",
    actorId: usuario.id,
  });
  if (resultado.ok) revalidatePath("/admin", "layout");
  return aEstado(resultado, "Orden actualizado.");
}
