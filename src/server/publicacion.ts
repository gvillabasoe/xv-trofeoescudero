import type { Prisma } from "@/generated/prisma/client";
import {
  ErrorPublicacion,
  esPatrocinadorPublicable,
  motivoMedioNoPublicable,
  prepararPublicacion,
  type PermisoLogo,
} from "@/lib/snapshot/construir";
import { VERSION_ESQUEMA_SNAPSHOT, esquemaSnapshot, type ImagenPublica, type SnapshotPublico } from "@/lib/snapshot/esquema";
import { hashContenido } from "@/lib/snapshot/hash";
import { leerSnapshotGuardado } from "@/lib/snapshot/leer";
import { buscarDatosPrivados } from "@/lib/snapshot/privacidad";
import { leerBorrador } from "@/server/borrador";
import type { ClienteBD, ConsultasBD } from "@/server/db";

/** Otro administrador publicó mientras tanto: hay que revisar antes de volver a publicar. */
export class ConflictoDeVersion extends Error {
  constructor() {
    super("Otro administrador ha publicado mientras tanto. Revisa la versión actual antes de publicar.");
    this.name = "ConflictoDeVersion";
  }
}

export interface OpcionesPublicacion {
  /** Administrador que publica; null si publica el sistema (bootstrap). */
  actorId: string | null;
  comentario?: string | null;
  /** SiteState.version que vio quien publica (control optimista). */
  versionEsperada?: number;
}

export type ResultadoPublicacion =
  | { publicada: true; numero: number; revisionId: string; avisos: string[] }
  | { publicada: false; numero: number; motivo: "identica"; avisos: string[] };

type EstadoSitio = Prisma.SiteStateGetPayload<{
  include: { publishedRevision: { select: { contentHash: true; revisionNumber: true } } };
}>;

async function leerEstado(tx: ConsultasBD, versionEsperada: number | undefined): Promise<EstadoSitio | null> {
  const estado = await tx.siteState.findUnique({
    where: { id: 1 },
    include: { publishedRevision: { select: { contentHash: true, revisionNumber: true } } },
  });
  if (versionEsperada !== undefined && (estado?.version ?? 0) !== versionEsperada) {
    throw new ConflictoDeVersion();
  }
  return estado;
}

/** Crea la revisión, apunta SiteState a ella y registra los medios que usa. Todo dentro de la transacción. */
async function guardarRevision(
  tx: ConsultasBD,
  datos: {
    estado: EstadoSitio | null;
    snapshot: SnapshotPublico;
    contentHash: string;
    medios: string[];
    actorId: string | null;
    comentario: string | null;
    origenId?: string;
    /** Tras restaurar, el borrador sigue siendo distinto de lo publicado. */
    quedanCambios: boolean;
  },
) {
  const ultima = await tx.contentRevision.aggregate({ _max: { revisionNumber: true } });
  const numero = (ultima._max.revisionNumber ?? 0) + 1;
  const ahora = new Date();

  const revision = await tx.contentRevision.create({
    data: {
      revisionNumber: numero,
      schemaVersion: VERSION_ESQUEMA_SNAPSHOT,
      contentHash: datos.contentHash,
      snapshot: datos.snapshot as Prisma.InputJsonValue,
      createdById: datos.actorId,
      publishedAt: ahora,
      publishComment: datos.comentario,
      sourceRevisionId: datos.origenId ?? null,
    },
  });

  if (datos.medios.length > 0) {
    await tx.revisionMediaRef.createMany({
      data: datos.medios.map((mediaId) => ({ revisionId: revision.id, mediaId })),
    });
    // Una imagen autorizada pasa a «publicada» la primera vez que sale en una versión.
    await tx.mediaAsset.updateMany({
      where: { id: { in: datos.medios }, reviewState: "AUTORIZADA" },
      data: { reviewState: "PUBLICADA", version: { increment: 1 } },
    });
  }

  if (datos.estado) {
    const { count } = await tx.siteState.updateMany({
      where: { id: 1, version: datos.estado.version },
      data: {
        publishedRevisionId: revision.id,
        hasUnpublishedChanges: datos.quedanCambios,
        lastPublishedAt: ahora,
        lastPublishedById: datos.actorId,
        version: { increment: 1 },
      },
    });
    if (count === 0) throw new ConflictoDeVersion();
  } else {
    await tx.siteState.create({
      data: {
        id: 1,
        publishedRevisionId: revision.id,
        hasUnpublishedChanges: datos.quedanCambios,
        lastPublishedAt: ahora,
        lastPublishedById: datos.actorId,
      },
    });
  }
  return { revision, numero };
}

/**
 * Publica el borrador como una revisión nueva e inmutable (fase-2 §8), dentro de una transacción existente.
 * La revisión, el estado y la auditoría se escriben juntos o no se escribe nada: no hay publicaciones parciales.
 * No invalida la caché: lo hace quien la llama desde una Server Action (src/server/cache/invalidar-sitio.ts).
 */
export async function publicarEnTransaccion(
  tx: ConsultasBD,
  opciones: OpcionesPublicacion,
): Promise<ResultadoPublicacion> {
  const { actorId, comentario = null, versionEsperada } = opciones;
  const estado = await leerEstado(tx, versionEsperada);

  // Valida el contenido y aplica la lista blanca del snapshot y las reglas de privacidad.
  const { snapshot, avisos, medios } = prepararPublicacion(await leerBorrador(tx));
  const contentHash = hashContenido(snapshot);

  if (estado?.publishedRevision && estado.publishedRevision.contentHash === contentHash) {
    if (estado.hasUnpublishedChanges) {
      await tx.siteState.update({ where: { id: 1 }, data: { hasUnpublishedChanges: false } });
    }
    return { publicada: false, numero: estado.publishedRevision.revisionNumber, motivo: "identica", avisos };
  }

  const { revision, numero } = await guardarRevision(tx, {
    estado,
    snapshot,
    contentHash,
    medios,
    actorId,
    comentario,
    quedanCambios: false,
  });

  await tx.auditLog.create({
    data: {
      actorId,
      actorType: actorId ? "USER" : "SYSTEM",
      action: "PUBLICACION",
      entityType: "ContentRevision",
      entityId: revision.id,
      summary: `Versión nº ${numero} publicada${actorId ? "" : " por el sistema"}`,
    },
  });

  return { publicada: true, numero, revisionId: revision.id, avisos };
}

/** Publica en su propia transacción. */
export async function publicar(bd: ClienteBD, opciones: OpcionesPublicacion): Promise<ResultadoPublicacion> {
  return bd.$transaction((tx) => publicarEnTransaccion(tx, opciones), { timeout: 20_000 });
}

export class RevisionNoEncontrada extends Error {
  constructor(numero: number) {
    super(`No existe la versión nº ${numero}.`);
    this.name = "RevisionNoEncontrada";
  }
}

/**
 * Vuelve a validar una versión antigua con los derechos de HOY antes de restaurarla:
 * - marcas: solo las que hoy cumplen la regla de publicación (y su logo, solo si hoy se puede publicar);
 * - imágenes: solo las que hoy siguen autorizadas, con consentimiento y sin retirar;
 * - contacto: solo los canales que siguen existiendo y activos.
 * Devuelve el snapshot revisado, lo que se ha quitado y los medios que usa.
 */
export async function revalidarSnapshot(
  tx: ConsultasBD,
  original: SnapshotPublico,
): Promise<{ snapshot: SnapshotPublico; retirado: string[]; medios: string[] }> {
  const retirado: string[] = [];
  const medios = new Set<string>();

  const patrocinadores = await tx.sponsor.findMany({
    include: { category: { select: { requiresLegalReview: true, name: true } } },
  });
  const publicables = new Map(
    patrocinadores
      .filter((p) =>
        esPatrocinadorPublicable({
          ...p,
          category: p.category.name,
          categoryRequiresLegalReview: p.category.requiresLegalReview,
        }),
      )
      .map((p) => [p.slug, p]),
  );
  const canales = await tx.contactChannel.findMany({ where: { isActive: true } });

  const todas = recogerImagenes(original);
  const variantes = await tx.mediaVariant.findMany({
    where: { publicPathname: { in: todas.map((imagen) => nombreArchivo(imagen.url)) } },
    include: { media: { include: { variants: { select: { format: true, width: true, publicPathname: true } } } } },
  });
  const porArchivo = new Map(variantes.map((variante) => [variante.publicPathname, variante.media]));

  const revisar = (imagen: ImagenPublica | null, hueco: string, logo?: { permiso: PermisoLogo }): ImagenPublica | null => {
    if (!imagen) return null;
    const medio = porArchivo.get(nombreArchivo(imagen.url));
    const motivo = medio
      ? motivoMedioNoPublicable(
          { ...medio, retirada: medio.retiredAt !== null },
          logo ? { esLogo: true, permisoLogo: logo.permiso } : {},
        )
      : "ya no existe";
    if (!medio || motivo) {
      retirado.push(`Imagen de ${hueco}: ${motivo ?? "ya no existe"}.`);
      return null;
    }
    medios.add(medio.id);
    return imagen;
  };

  const s = structuredClone(original);
  s.sitio.imagenCompartir = revisar(s.sitio.imagenCompartir, "compartir en redes");
  s.hero.imagen = revisar(s.hero.imagen, "la portada");
  if (s.familia) {
    s.familia.segundaGeneracion.imagen = revisar(s.familia.segundaGeneracion.imagen, "la segunda generación");
    s.familia.terceraGeneracion.imagen = revisar(s.familia.terceraGeneracion.imagen, "la 3ª Generación");
    for (const miembro of s.familia.miembros) miembro.foto = revisar(miembro.foto, miembro.nombre);
  }
  if (s.dia) {
    s.dia.norte.imagen = revisar(s.dia.norte.imagen, "el Campo Norte");
    s.dia.sur.imagen = revisar(s.dia.sur.imagen, "el Campo Sur");
    s.dia.despues.imagen = revisar(s.dia.despues.imagen, "después del 18");
  }
  for (const via of s.colaborar.vias) via.imagen = revisar(via.imagen, `la vía «${via.titulo}»`);
  if (s.cierre) {
    s.cierre.imagen = revisar(s.cierre.imagen, "el cierre");
    s.cierre.historial.marcas = s.cierre.historial.marcas.flatMap((marca) => {
      const actual = publicables.get(marca.slug);
      if (!actual) {
        retirado.push(`Marca «${marca.nombre}»: hoy no cumple la regla de publicación.`);
        return [];
      }
      return [{ ...marca, logo: revisar(marca.logo, `el logo de ${marca.nombre}`, { permiso: actual.logoPermission }) }];
    });
  }
  s.contacto = s.contacto.filter((canal) => {
    const sigue = canales.some((actual) => actual.type === canal.tipo && actual.value === canal.valor);
    if (!sigue) retirado.push(`Canal de contacto «${canal.etiqueta}»: ya no está activo.`);
    return sigue;
  });
  s.version = VERSION_ESQUEMA_SNAPSHOT;

  return { snapshot: s, retirado, medios: [...medios] };
}

function nombreArchivo(url: string): string {
  return url.replace(/^\/medios\//, "");
}

function recogerImagenes(s: SnapshotPublico): ImagenPublica[] {
  const lista: Array<ImagenPublica | null> = [
    s.sitio.imagenCompartir,
    s.hero.imagen,
    s.familia?.segundaGeneracion.imagen ?? null,
    s.familia?.terceraGeneracion.imagen ?? null,
    ...(s.familia?.miembros.map((miembro) => miembro.foto) ?? []),
    s.dia?.norte.imagen ?? null,
    s.dia?.sur.imagen ?? null,
    s.dia?.despues.imagen ?? null,
    ...s.colaborar.vias.map((via) => via.imagen),
    s.cierre?.imagen ?? null,
    ...(s.cierre?.historial.marcas.map((marca) => marca.logo) ?? []),
  ];
  return lista.filter((imagen): imagen is ImagenPublica => imagen !== null);
}

export type ResultadoRestauracion = { numero: number; revisionId: string; retirado: string[] };

/**
 * Restaura una versión antigua como una versión NUEVA (la antigua no se toca: es inmutable).
 * Antes la revalida con los derechos de hoy. El borrador editable no cambia: después de restaurar,
 * el panel indica que hay cambios sin publicar.
 */
export async function restaurarRevision(
  bd: ClienteBD,
  opciones: { numero: number; actorId: string; versionEsperada?: number },
): Promise<ResultadoRestauracion> {
  return bd.$transaction(
    async (tx) => {
      const estado = await leerEstado(tx, opciones.versionEsperada);
      const origen = await tx.contentRevision.findUnique({ where: { revisionNumber: opciones.numero } });
      if (!origen) throw new RevisionNoEncontrada(opciones.numero);

      const { snapshot, retirado, medios } = await revalidarSnapshot(tx, leerSnapshotGuardado(origen.snapshot).snapshot);
      const lectura = esquemaSnapshot.safeParse(snapshot);
      if (!lectura.success) throw new ErrorPublicacion(["la versión revisada no cumple el esquema vigente"]);
      const hallazgos = buscarDatosPrivados(lectura.data);
      if (hallazgos.length > 0) throw new ErrorPublicacion(hallazgos.map((h) => `${h.ruta}: ${h.motivo}`));

      const { revision, numero } = await guardarRevision(tx, {
        estado,
        snapshot: lectura.data,
        contentHash: hashContenido(lectura.data),
        medios,
        actorId: opciones.actorId,
        comentario: `Restauración de la versión nº ${origen.revisionNumber}`,
        origenId: origen.id,
        quedanCambios: true,
      });

      await tx.auditLog.create({
        data: {
          actorId: opciones.actorId,
          actorType: "USER",
          action: "RESTAURACION",
          entityType: "ContentRevision",
          entityId: revision.id,
          summary: `Versión nº ${origen.revisionNumber} restaurada como nº ${numero}${retirado.length ? ` (${retirado.length} elementos retirados por la revisión de derechos)` : ""}`,
        },
      });
      return { numero, revisionId: revision.id, retirado };
    },
    { timeout: 20_000 },
  );
}
