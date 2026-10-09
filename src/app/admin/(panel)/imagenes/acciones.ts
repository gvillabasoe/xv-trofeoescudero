"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirAdmin } from "@/server/auth/guardas";
import { invalidarSitioPublico } from "@/server/cache/invalidar-sitio";
import { obtenerPrisma } from "@/server/db";
import { obtenerAlmacen } from "@/server/medios/almacen";
import {
  ErrorMedio,
  asignarMedio,
  cambiarEstadoMedio,
  guardarMetadatos,
  quitarAsignacion,
  retirarMedio,
  subirMedio,
  type CambioEstadoMedio,
  type MotivoRetirada,
  type TipoMedio,
} from "@/server/medios/biblioteca";
import { ImagenRechazada } from "@/server/medios/procesar";
import type { EstadoEdicion } from "@/server/panel/acciones";
import { restaurarRevision } from "@/server/publicacion";

const TIPOS: readonly TipoMedio[] = ["FOTO", "LOGO", "ILUSTRACION"];
const MOTIVOS: readonly MotivoRetirada[] = ["SUSTITUIDA", "CONSENTIMIENTO_RETIRADO", "PERMISO_LOGO", "JURIDICO", "OTRO"];

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor.trim() : "";
}

function ok(mensaje: string): EstadoEdicion {
  revalidatePath("/admin", "layout");
  return { ok: true, mensaje, marca: Date.now() };
}

function fallo(error: unknown): EstadoEdicion {
  if (error instanceof ErrorMedio || error instanceof ImagenRechazada) return { ok: false, mensaje: error.message };
  throw error;
}

export async function accionSubirImagen(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const almacen = obtenerAlmacen();
  if (!almacen) return { ok: false, mensaje: "No hay ningún almacén de imágenes conectado (ver Configuración)." };
  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Elige una imagen." };
  const tipo = texto(formulario, "tipo") as TipoMedio;
  let id: string;
  try {
    ({ id } = await subirMedio(obtenerPrisma(), almacen, {
      datos: Buffer.from(await archivo.arrayBuffer()),
      tipo: TIPOS.includes(tipo) ? tipo : "FOTO",
      actorId: usuario.id,
    }));
  } catch (error) {
    return fallo(error);
  }
  revalidatePath("/admin", "layout");
  redirect(`/admin/imagenes/${id}`);
}

function porcentaje(formulario: FormData, campo: string): number {
  const valor = Number(texto(formulario, campo));
  return Number.isFinite(valor) ? Math.min(100, Math.max(0, valor)) / 100 : 0.5;
}

export async function accionGuardarImagen(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const tipo = texto(formulario, "kind") as TipoMedio;
  const corto = (campo: string, maximo: number) => texto(formulario, campo).slice(0, maximo) || null;
  try {
    await guardarMetadatos(obtenerPrisma(), {
      id: texto(formulario, "_id"),
      version: Number(texto(formulario, "_version")),
      actorId: usuario.id,
      datos: {
        kind: TIPOS.includes(tipo) ? tipo : "FOTO",
        altText: corto("altText", 250),
        caption: corto("caption", 160),
        description: corto("description", 1000),
        focalX: porcentaje(formulario, "focalX"),
        focalY: porcentaje(formulario, "focalY"),
        hasIdentifiablePeople: formulario.get("hasIdentifiablePeople") === "si",
        includesMinors: formulario.get("includesMinors") === "si",
        consentConfirmed: formulario.get("consentConfirmed") === "si",
        guardianConsentConfirmed: formulario.get("guardianConsentConfirmed") === "si",
      },
    });
  } catch (error) {
    return fallo(error);
  }
  return ok("Datos guardados.");
}

export async function accionEstadoImagen(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  const cambio = texto(formulario, "_cambio") as CambioEstadoMedio;
  if (!["enviar-a-revision", "autorizar", "volver-a-revision"].includes(cambio)) return { ok: false, mensaje: "Acción no válida." };
  try {
    await cambiarEstadoMedio(obtenerPrisma(), {
      id: texto(formulario, "_id"),
      version: Number(texto(formulario, "_version")),
      cambio,
      actorId: usuario.id,
    });
  } catch (error) {
    return fallo(error);
  }
  return ok(cambio === "autorizar" ? "Autorizada: se publicará con la próxima publicación." : "Enviada a revisión.");
}

/**
 * Retirar. Con «quitar ya de la web», además se publica al momento una copia de la versión vigente revisada
 * con los derechos de hoy (la imagen deja de aparecer), sin publicar el resto del borrador.
 */
export async function accionRetirarImagen(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (texto(formulario, "_confirmar") !== "si") return { ok: false, mensaje: "Marca la casilla para confirmar." };
  const motivo = texto(formulario, "motivo") as MotivoRetirada;
  const id = texto(formulario, "_id");
  const bd = obtenerPrisma();
  try {
    await retirarMedio(bd, {
      id,
      version: Number(texto(formulario, "_version")),
      motivo: MOTIVOS.includes(motivo) ? motivo : "OTRO",
      actorId: usuario.id,
    });
  } catch (error) {
    return fallo(error);
  }
  if (formulario.get("quitarDeLaWeb") === "si") {
    const estado = await bd.siteState.findUnique({
      where: { id: 1 },
      select: { publishedRevision: { select: { revisionNumber: true, mediaRefs: { where: { mediaId: id }, select: { mediaId: true } } } } },
    });
    const revision = estado?.publishedRevision;
    if (revision && revision.mediaRefs.length > 0) {
      const resultado = await restaurarRevision(bd, { numero: revision.revisionNumber, actorId: usuario.id });
      invalidarSitioPublico();
      return ok(`Retirada y quitada de la web: publicada la versión nº ${resultado.numero} sin ella.`);
    }
  }
  return ok("Retirada. Ya no se sirve en la web.");
}

export async function accionAsignarImagen(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  try {
    await asignarMedio(obtenerPrisma(), { mediaId: texto(formulario, "_id"), destino: texto(formulario, "destino"), actorId: usuario.id });
  } catch (error) {
    return fallo(error);
  }
  return ok("Asignada. Se verá en la web con la próxima publicación, si está autorizada.");
}

export async function accionQuitarUso(_previo: EstadoEdicion, formulario: FormData): Promise<EstadoEdicion> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  await quitarAsignacion(obtenerPrisma(), { usoId: texto(formulario, "_uso"), actorId: usuario.id });
  return ok("Quitada de ese hueco.");
}
