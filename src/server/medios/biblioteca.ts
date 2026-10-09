import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { HUECOS, motivoMedioNoPublicable } from "@/lib/snapshot/construir";
import { auditar, marcarCambiosSinPublicar } from "@/server/auditoria";
import type { ClienteBD, ConsultasBD } from "@/server/db";
import type { Almacen } from "./almacen";
import { procesarImagen } from "./procesar";

/**
 * Biblioteca de imágenes (Fase 5). Flujo: SUBIDA → EN_REVISION → AUTORIZADA → (al publicar) PUBLICADA.
 * RETIRADA en cualquier momento: deja de servirse al instante (/medios comprueba el estado en cada petición).
 */

export class ErrorMedio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorMedio";
  }
}

export type TipoMedio = "FOTO" | "LOGO" | "ILUSTRACION";
export type Hueco =
  | "OG_IMAGEN"
  | "HERO_IMAGEN"
  | "FAMILIA_IMAGEN"
  | "MIEMBRO_FOTO"
  | "DIA_IMAGEN"
  | "VIA_IMAGEN"
  | "PATROCINADOR_LOGO"
  | "CIERRE_IMAGEN";

/** Campo de MediaUsage que apunta al contenido de cada hueco. */
const CAMPO_DESTINO = {
  OG_IMAGEN: "siteSettingsId",
  HERO_IMAGEN: "heroContentId",
  FAMILIA_IMAGEN: "familyContentId",
  MIEMBRO_FOTO: "familyMemberId",
  DIA_IMAGEN: "dayContentId",
  VIA_IMAGEN: "routeId",
  PATROCINADOR_LOGO: "sponsorId",
  CIERRE_IMAGEN: "closingContentId",
} as const satisfies Record<Hueco, string>;

export interface Destino {
  /** «HUECO:id:orden», el valor que usa el formulario. */
  clave: string;
  hueco: Hueco;
  destinoId: string;
  orden: number;
  nombre: string;
}

export function claveDestino(hueco: Hueco, destinoId: string | number, orden = 0): string {
  return `${hueco}:${destinoId}:${orden}`;
}

export function leerClaveDestino(clave: string): { hueco: Hueco; destinoId: string; orden: number } | null {
  const [hueco, destinoId, orden] = clave.split(":");
  if (!hueco || !(hueco in CAMPO_DESTINO) || !destinoId || !/^\d+$/.test(orden ?? "")) return null;
  return { hueco: hueco as Hueco, destinoId, orden: Number(orden) };
}

/** Todos los huecos de imagen de la web, con un nombre legible para el panel. */
export async function listarDestinos(bd: ConsultasBD): Promise<Destino[]> {
  const destinos: Destino[] = [];
  const anadir = (hueco: Hueco, destinoId: string | number, nombre: string, orden = 0) =>
    destinos.push({ clave: claveDestino(hueco, destinoId, orden), hueco, destinoId: String(destinoId), orden, nombre });

  const sitio = await bd.siteSettings.findUnique({ where: { id: 1 }, select: { id: true } });
  if (sitio) anadir("OG_IMAGEN", sitio.id, "Compartir en redes (imagen OG)");
  const hero = await bd.heroContent.findFirst({ select: { id: true } });
  if (hero) anadir("HERO_IMAGEN", hero.id, "Portada · imagen de fondo");
  const familia = await bd.familyContent.findFirst({
    select: { id: true, members: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } },
  });
  if (familia) {
    for (const miembro of familia.members) anadir("MIEMBRO_FOTO", miembro.id, `La familia · ${miembro.name}`);
    anadir("FAMILIA_IMAGEN", familia.id, "La familia · segunda generación", HUECOS.familia.segunda);
    anadir("FAMILIA_IMAGEN", familia.id, "La familia · 3ª Generación", HUECOS.familia.tercera);
  }
  const dia = await bd.dayContent.findFirst({ select: { id: true } });
  if (dia) {
    anadir("DIA_IMAGEN", dia.id, "El día · Campo Norte", HUECOS.dia.norte);
    anadir("DIA_IMAGEN", dia.id, "El día · Campo Sur", HUECOS.dia.sur);
    anadir("DIA_IMAGEN", dia.id, "El día · Hoyo 19", HUECOS.dia.despues);
  }
  const vias = await bd.collaborationRoute.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, title: true } });
  for (const via of vias) anadir("VIA_IMAGEN", via.id, `Colaborar · ${via.title}`);
  const cierre = await bd.closingContent.findFirst({ select: { id: true } });
  if (cierre) anadir("CIERRE_IMAGEN", cierre.id, "Cierre");
  const marcas = await bd.sponsor.findMany({
    where: { lifecycle: "ACTIVO" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  for (const marca of marcas) anadir("PATROCINADOR_LOGO", marca.id, `Logo · ${marca.name}`);
  return destinos;
}

/** Nombre de archivo público de una variante: solo el identificador y el ancho. */
export function nombreVariante(mediaId: string, ancho: number, extension: "webp" | "jpg" = "webp"): string {
  return `${mediaId}-${ancho}.${extension}`;
}

export async function subirMedio(
  bd: ClienteBD,
  almacen: Almacen,
  opciones: { datos: Buffer; tipo: TipoMedio; actorId: string },
): Promise<{ id: string; duplicada: boolean }> {
  const imagen = await procesarImagen(opciones.datos);
  const existente = await bd.mediaAsset.findUnique({ where: { sha256: imagen.sha256 }, select: { id: true } });
  if (existente) return { id: existente.id, duplicada: true };

  const id = randomUUID().replace(/-/g, "");
  const rutaOriginal = `originales/${id}.${imagen.maestro.extension}`;
  // Primero los archivos; después, en una transacción, los registros. Si algo falla a medias, solo quedan
  // archivos huérfanos (sin registro), que la tarea de mantenimiento puede listar y borrar.
  await almacen.guardar(rutaOriginal, imagen.maestro.datos, imagen.maestro.mime);
  for (const variante of imagen.variantes) {
    await almacen.guardar(`variantes/${nombreVariante(id, variante.ancho)}`, variante.datos, "image/webp");
  }
  await almacen.guardar(`variantes/${nombreVariante(id, imagen.compartir.ancho, "jpg")}`, imagen.compartir.datos, "image/jpeg");

  await bd.$transaction(async (tx) => {
    await tx.mediaAsset.create({
      data: {
        id,
        kind: opciones.tipo,
        reviewState: "SUBIDA",
        privatePathname: rutaOriginal,
        sourceMime: imagen.mime,
        sizeBytes: opciones.datos.byteLength,
        width: imagen.ancho,
        height: imagen.alto,
        megapixels: imagen.megapixeles,
        sha256: imagen.sha256,
        uploadedById: opciones.actorId,
        updatedById: opciones.actorId,
        variants: {
          create: [
            ...imagen.variantes.map((variante) => ({
              format: "WEBP" as const,
              width: variante.ancho,
              publicPathname: nombreVariante(id, variante.ancho),
              publicUrl: `/medios/${nombreVariante(id, variante.ancho)}`,
              sizeBytes: variante.datos.byteLength,
            })),
            {
              format: "JPEG" as const,
              width: imagen.compartir.ancho,
              publicPathname: nombreVariante(id, imagen.compartir.ancho, "jpg"),
              publicUrl: `/medios/${nombreVariante(id, imagen.compartir.ancho, "jpg")}`,
              sizeBytes: imagen.compartir.datos.byteLength,
            },
          ],
        },
      },
    });
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "MEDIO_SUBIDO",
      entidad: "MediaAsset",
      entidadId: id,
      resumen: `Imagen subida (${imagen.ancho}×${imagen.alto}, ${opciones.tipo.toLowerCase()})`,
    });
  });
  return { id, duplicada: false };
}

export interface MetadatosMedio {
  kind: TipoMedio;
  altText: string | null;
  caption: string | null;
  description: string | null;
  focalX: number;
  focalY: number;
  hasIdentifiablePeople: boolean;
  includesMinors: boolean;
  consentConfirmed: boolean;
  guardianConsentConfirmed: boolean;
}

export class ConflictoMedio extends ErrorMedio {
  constructor() {
    super("Otra persona ha cambiado esta imagen mientras tanto. Recarga la página y revisa los datos.");
    this.name = "ConflictoMedio";
  }
}

export async function guardarMetadatos(
  bd: ClienteBD,
  opciones: { id: string; version: number; datos: MetadatosMedio; actorId: string },
) {
  await bd.$transaction(async (tx) => {
    const actual = await tx.mediaAsset.findUnique({ where: { id: opciones.id } });
    if (!actual) throw new ErrorMedio("La imagen ya no existe.");
    if (actual.reviewState === "RETIRADA") throw new ErrorMedio("Una imagen retirada no se puede editar.");
    const { datos } = opciones;
    const confirmaAhora = datos.consentConfirmed && !actual.consentConfirmed;
    // Si cambian los datos de derechos de una imagen ya autorizada, vuelve a revisión.
    const cambianDerechos =
      datos.hasIdentifiablePeople !== actual.hasIdentifiablePeople ||
      datos.includesMinors !== actual.includesMinors ||
      datos.consentConfirmed !== actual.consentConfirmed ||
      datos.guardianConsentConfirmed !== actual.guardianConsentConfirmed;
    const { count } = await tx.mediaAsset.updateMany({
      where: { id: opciones.id, version: opciones.version },
      data: {
        ...datos,
        ...(confirmaAhora ? { consentConfirmedAt: new Date(), consentConfirmedById: opciones.actorId } : {}),
        ...(!datos.consentConfirmed ? { consentConfirmedAt: null, consentConfirmedById: null } : {}),
        ...(cambianDerechos && (actual.reviewState === "AUTORIZADA" || actual.reviewState === "PUBLICADA")
          ? { reviewState: "EN_REVISION" as const }
          : {}),
        updatedById: opciones.actorId,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConflictoMedio();
    await marcarCambiosSinPublicar(tx);
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "MEDIO_REVISADO",
      entidad: "MediaAsset",
      entidadId: opciones.id,
      resumen: cambianDerechos ? "Datos de la imagen guardados (derechos modificados: vuelve a revisión)" : "Datos de la imagen guardados",
    });
  });
}

export type CambioEstadoMedio = "enviar-a-revision" | "autorizar" | "volver-a-revision";

export async function cambiarEstadoMedio(
  bd: ClienteBD,
  opciones: { id: string; version: number; cambio: CambioEstadoMedio; actorId: string },
) {
  await bd.$transaction(async (tx) => {
    const actual = await tx.mediaAsset.findUnique({ where: { id: opciones.id }, include: { variants: true } });
    if (!actual) throw new ErrorMedio("La imagen ya no existe.");
    if (actual.reviewState === "RETIRADA") throw new ErrorMedio("La imagen está retirada.");
    let estado: "EN_REVISION" | "AUTORIZADA";
    if (opciones.cambio === "autorizar") {
      const motivo = motivoMedioNoPublicable({ ...actual, retirada: false, reviewState: "AUTORIZADA" });
      if (motivo) throw new ErrorMedio(`No se puede autorizar: ${motivo}.`);
      estado = "AUTORIZADA";
    } else {
      estado = "EN_REVISION";
    }
    const { count } = await tx.mediaAsset.updateMany({
      where: { id: opciones.id, version: opciones.version },
      data: { reviewState: estado, updatedById: opciones.actorId, version: { increment: 1 } },
    });
    if (count === 0) throw new ConflictoMedio();
    await marcarCambiosSinPublicar(tx);
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "MEDIO_REVISADO",
      entidad: "MediaAsset",
      entidadId: opciones.id,
      resumen: estado === "AUTORIZADA" ? "Imagen autorizada para publicar" : "Imagen enviada a revisión",
    });
  });
}

export type MotivoRetirada = "SUSTITUIDA" | "CONSENTIMIENTO_RETIRADO" | "PERMISO_LOGO" | "JURIDICO" | "OTRO";

/**
 * Retira una imagen: deja de servirse al instante y sale del borrador (se quitan sus asignaciones).
 * La versión publicada que la usaba sigue igual hasta que se vuelva a publicar o se ejecute
 * «Retirar y quitar de la web» (que publica una copia revisada de la versión vigente).
 */
export async function retirarMedio(
  bd: ClienteBD,
  opciones: { id: string; version: number; motivo: MotivoRetirada; actorId: string },
) {
  await bd.$transaction(async (tx) => {
    const { count } = await tx.mediaAsset.updateMany({
      where: { id: opciones.id, version: opciones.version, reviewState: { not: "RETIRADA" } },
      data: {
        reviewState: "RETIRADA",
        retiredAt: new Date(),
        retiredReason: opciones.motivo,
        updatedById: opciones.actorId,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConflictoMedio();
    const { count: usos } = await tx.mediaUsage.deleteMany({ where: { mediaId: opciones.id } });
    await marcarCambiosSinPublicar(tx);
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "MEDIO_RETIRADO",
      entidad: "MediaAsset",
      entidadId: opciones.id,
      resumen: `Imagen retirada (${opciones.motivo.toLowerCase().replace(/_/g, " ")}); ${usos} asignaciones quitadas del borrador`,
    });
  });
}

/** Asigna una imagen a un hueco. Cada hueco tiene una sola imagen: la anterior se sustituye. */
export async function asignarMedio(
  bd: ClienteBD,
  opciones: { mediaId: string; destino: string; actorId: string },
) {
  const destino = leerClaveDestino(opciones.destino);
  if (!destino) throw new ErrorMedio("Elige dónde se usa la imagen.");
  await bd.$transaction(async (tx) => {
    const medio = await tx.mediaAsset.findUnique({ where: { id: opciones.mediaId }, select: { reviewState: true, kind: true } });
    if (!medio || medio.reviewState === "RETIRADA") throw new ErrorMedio("La imagen no existe o está retirada.");
    if (destino.hueco === "PATROCINADOR_LOGO" && medio.kind !== "LOGO") {
      throw new ErrorMedio("En el muro de marcas solo se pueden usar imágenes de tipo «logo».");
    }
    // Exactamente una FK de destino (CHECK en SQL): la del hueco elegido.
    const referencia = {
      [CAMPO_DESTINO[destino.hueco]]: destino.hueco === "OG_IMAGEN" ? Number(destino.destinoId) : destino.destinoId,
    };
    await tx.mediaUsage.deleteMany({
      where: { slot: destino.hueco, sortOrder: destino.orden, ...referencia } as Prisma.MediaUsageWhereInput,
    });
    await tx.mediaUsage.create({
      data: {
        mediaId: opciones.mediaId,
        slot: destino.hueco,
        sortOrder: destino.orden,
        ...referencia,
      } as Prisma.MediaUsageUncheckedCreateInput,
    });
    await marcarCambiosSinPublicar(tx);
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "CONTENIDO_GUARDADO",
      entidad: "MediaUsage",
      entidadId: opciones.mediaId,
      resumen: `Imagen asignada a ${destino.hueco.toLowerCase().replace(/_/g, " ")}`,
    });
  });
}

export async function quitarAsignacion(bd: ClienteBD, opciones: { usoId: string; actorId: string }) {
  await bd.$transaction(async (tx) => {
    const uso = await tx.mediaUsage.findUnique({ where: { id: opciones.usoId } });
    if (!uso) return;
    await tx.mediaUsage.delete({ where: { id: uso.id } });
    await marcarCambiosSinPublicar(tx);
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "CONTENIDO_GUARDADO",
      entidad: "MediaUsage",
      entidadId: uso.mediaId,
      resumen: `Imagen quitada de ${uso.slot.toLowerCase().replace(/_/g, " ")}`,
    });
  });
}

/**
 * Mantenimiento: borra los archivos de las imágenes retiradas hace más de `dias` días.
 * - Si ninguna versión publicada la usó, se borra también el registro.
 * - Si alguna la usó, se conserva el registro (las versiones son inmutables) sin archivos ni variantes.
 */
export async function purgarRetiradas(bd: ClienteBD, almacen: Almacen | null, opciones: { dias: number; ahora?: Date }) {
  const limite = new Date((opciones.ahora ?? new Date()).getTime() - opciones.dias * 86_400_000);
  const retiradas = await bd.mediaAsset.findMany({
    where: { reviewState: "RETIRADA", retiredAt: { lt: limite } },
    include: { variants: true, _count: { select: { revisionRefs: true } } },
  });
  let purgadas = 0;
  for (const medio of retiradas) {
    if (medio.variants.length === 0 && medio._count.revisionRefs > 0) continue; // ya purgada
    if (!almacen) break;
    await almacen.borrar([medio.privatePathname, ...medio.variants.map((variante) => `variantes/${variante.publicPathname}`)]);
    await bd.$transaction(async (tx) => {
      await tx.mediaVariant.deleteMany({ where: { mediaId: medio.id } });
      if (medio._count.revisionRefs === 0) await tx.mediaAsset.delete({ where: { id: medio.id } });
      await auditar(tx, {
        actorId: null,
        accion: "MEDIO_PURGADO",
        entidad: "MediaAsset",
        entidadId: medio.id,
        resumen: "Archivos de una imagen retirada borrados por la tarea de mantenimiento",
      });
    });
    purgadas += 1;
  }
  return purgadas;
}
