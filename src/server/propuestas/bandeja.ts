import type { Prisma } from "@/generated/prisma/client";
import { NOMBRE_ESTADO_PROPUESTA } from "@/lib/etiquetas";
import { auditar } from "@/server/auditoria";
import type { ClienteBD, ConsultasBD } from "@/server/db";

/** Bandeja de propuestas (Fase 6). Privada: solo panel, con sesión, rol admin y TOTP. */

export const ESTADOS_PROPUESTA = ["NUEVA", "REVISADA", "CONTACTADA", "EN_CONVERSACION", "CERRADA", "DESCARTADA"] as const;
export type EstadoPropuesta = (typeof ESTADOS_PROPUESTA)[number];

export const TIPOS_FILTRO = [
  "PATROCINADOR_PRINCIPAL_POLO",
  "WELCOME_PACK",
  "PREMIO_CONCURSO",
  "HOYO",
  "SORTEO_EXPERIENCIA",
  "OTRA",
] as const;

export interface FiltroBandeja {
  estado?: EstadoPropuesta | null;
  tipo?: (typeof TIPOS_FILTRO)[number] | null;
  /** «activas» (por defecto), «archivadas» o «todas». */
  archivo?: "activas" | "archivadas" | "todas";
  /** Busca en nombre, empresa y email. */
  texto?: string | null;
  soloNoLeidas?: boolean;
}

export const POR_PAGINA = 25;

export function condicionesBandeja(filtro: FiltroBandeja): Prisma.SubmissionWhereInput {
  const condiciones: Prisma.SubmissionWhereInput[] = [];
  const archivo = filtro.archivo ?? "activas";
  if (archivo === "activas") condiciones.push({ archivedAt: null });
  if (archivo === "archivadas") condiciones.push({ archivedAt: { not: null } });
  if (filtro.estado) condiciones.push({ status: filtro.estado });
  if (filtro.tipo) condiciones.push({ collaborationType: filtro.tipo });
  if (filtro.soloNoLeidas) condiciones.push({ readAt: null });
  const texto = filtro.texto?.trim();
  if (texto) {
    condiciones.push({
      OR: [
        { name: { contains: texto, mode: "insensitive" } },
        { company: { contains: texto, mode: "insensitive" } },
        { email: { contains: texto, mode: "insensitive" } },
      ],
    });
  }
  return condiciones.length > 0 ? { AND: condiciones } : {};
}

export async function listarPropuestas(bd: ConsultasBD, filtro: FiltroBandeja, pagina = 1) {
  const where = condicionesBandeja(filtro);
  const [total, propuestas] = await Promise.all([
    bd.submission.count({ where }),
    bd.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (Math.max(1, pagina) - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        name: true,
        company: true,
        collaborationType: true,
        status: true,
        createdAt: true,
        readAt: true,
        archivedAt: true,
        anonymizedAt: true,
        isSynthetic: true,
      },
    }),
  ]);
  return { total, propuestas, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}

export async function contarPorEstado(bd: ConsultasBD) {
  const grupos = await bd.submission.groupBy({ by: ["status"], where: { archivedAt: null }, _count: { _all: true } });
  const noLeidas = await bd.submission.count({ where: { archivedAt: null, readAt: null } });
  return { porEstado: Object.fromEntries(grupos.map((grupo) => [grupo.status, grupo._count._all])), noLeidas };
}

export async function leerPropuesta(bd: ConsultasBD, id: string) {
  return bd.submission.findUnique({
    where: { id },
    include: {
      consentLegalVersion: { select: { versionLabel: true, publishedAt: true, legalPage: { select: { title: true } } } },
      statusHistory: { orderBy: { changedAt: "asc" }, include: { changedBy: { select: { name: true } } } },
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
}

export class ConflictoPropuesta extends Error {
  constructor() {
    super("Otra persona ha cambiado esta propuesta mientras tanto. Recarga la página para ver la versión actual.");
    this.name = "ConflictoPropuesta";
  }
}

export class PropuestaNoDisponible extends Error {
  constructor(mensaje = "La propuesta ya no existe.") {
    super(mensaje);
    this.name = "PropuestaNoDisponible";
  }
}

/** Abrir una propuesta la marca como leída (una sola vez). */
export async function marcarLeida(bd: ConsultasBD, id: string) {
  await bd.submission.updateMany({ where: { id, readAt: null }, data: { readAt: new Date() } });
}

async function actualizar(
  tx: ConsultasBD,
  opciones: { id: string; version: number; actorId: string; datos: Prisma.SubmissionUpdateManyMutationInput; aunqueAnonimizada?: boolean },
) {
  const { count } = await tx.submission.updateMany({
    where: { id: opciones.id, version: opciones.version, ...(opciones.aunqueAnonimizada ? {} : { anonymizedAt: null }) },
    data: { ...opciones.datos, updatedById: opciones.actorId, lastActivityAt: new Date(), version: { increment: 1 } },
  });
  if (count === 0) {
    const existe = await tx.submission.findUnique({ where: { id: opciones.id }, select: { anonymizedAt: true } });
    if (!existe) throw new PropuestaNoDisponible();
    if (existe.anonymizedAt) throw new PropuestaNoDisponible("La propuesta está anonimizada: ya no se puede modificar.");
    throw new ConflictoPropuesta();
  }
}

export async function cambiarEstado(
  bd: ClienteBD,
  opciones: { id: string; version: number; estado: EstadoPropuesta; nota: string | null; actorId: string },
) {
  await bd.$transaction(async (tx) => {
    const actual = await tx.submission.findUnique({ where: { id: opciones.id }, select: { status: true } });
    if (!actual) throw new PropuestaNoDisponible();
    if (actual.status === opciones.estado) return;
    await actualizar(tx, { id: opciones.id, version: opciones.version, actorId: opciones.actorId, datos: { status: opciones.estado } });
    await tx.submissionStatusHistory.create({
      data: {
        submissionId: opciones.id,
        fromStatus: actual.status,
        toStatus: opciones.estado,
        changedById: opciones.actorId,
        note: opciones.nota?.trim().slice(0, 500) || null,
      },
    });
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "PROPUESTA_ESTADO",
      entidad: "Submission",
      entidadId: opciones.id,
      resumen: `Estado: ${NOMBRE_ESTADO_PROPUESTA[actual.status]} → ${NOMBRE_ESTADO_PROPUESTA[opciones.estado]}`,
    });
  });
}

export async function anadirNota(bd: ClienteBD, opciones: { id: string; texto: string; actorId: string }) {
  const texto = opciones.texto.trim();
  if (texto.length === 0) throw new PropuestaNoDisponible("Escribe la nota antes de guardarla.");
  await bd.$transaction(async (tx) => {
    const propuesta = await tx.submission.findUnique({ where: { id: opciones.id }, select: { anonymizedAt: true } });
    if (!propuesta) throw new PropuestaNoDisponible();
    if (propuesta.anonymizedAt) throw new PropuestaNoDisponible("La propuesta está anonimizada: ya no admite notas.");
    await tx.submissionNote.create({
      data: { submissionId: opciones.id, authorId: opciones.actorId, updatedById: opciones.actorId, body: texto.slice(0, 4000) },
    });
    await tx.submission.update({ where: { id: opciones.id }, data: { lastActivityAt: new Date() } });
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "PROPUESTA_NOTA",
      entidad: "Submission",
      entidadId: opciones.id,
      resumen: "Nota interna añadida",
    });
  });
}

export async function archivar(bd: ClienteBD, opciones: { id: string; version: number; archivar: boolean; actorId: string }) {
  await bd.$transaction(async (tx) => {
    await actualizar(tx, {
      id: opciones.id,
      version: opciones.version,
      actorId: opciones.actorId,
      datos: { archivedAt: opciones.archivar ? new Date() : null },
      aunqueAnonimizada: true,
    });
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "PROPUESTA_ARCHIVADA",
      entidad: "Submission",
      entidadId: opciones.id,
      resumen: opciones.archivar ? "Propuesta archivada" : "Propuesta recuperada del archivo",
    });
  });
}

/**
 * Anonimiza una propuesta: borra los datos personales y el texto, y las notas internas, que pueden contenerlos.
 * Se conservan el tipo, el estado, las fechas y la versión legal aceptada (sin datos personales).
 * Irreversible.
 */
export async function anonimizarEnTransaccion(tx: ConsultasBD, id: string, ahora = new Date()) {
  await tx.submissionNote.deleteMany({ where: { submissionId: id } });
  await tx.submissionStatusHistory.updateMany({ where: { submissionId: id }, data: { note: null } });
  await tx.submission.update({
    where: { id },
    data: {
      name: "Propuesta anonimizada",
      company: "",
      email: "",
      jobTitle: null,
      phone: null,
      message: "",
      referrer: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmTerm: null,
      utmContent: null,
      anonymizedAt: ahora,
      version: { increment: 1 },
    },
  });
}

export async function anonimizar(bd: ClienteBD, opciones: { id: string; version: number; actorId: string }) {
  await bd.$transaction(async (tx) => {
    const propuesta = await tx.submission.findUnique({ where: { id: opciones.id }, select: { version: true, anonymizedAt: true } });
    if (!propuesta) throw new PropuestaNoDisponible();
    if (propuesta.anonymizedAt) return;
    if (propuesta.version !== opciones.version) throw new ConflictoPropuesta();
    await anonimizarEnTransaccion(tx, opciones.id);
    await tx.submission.update({ where: { id: opciones.id }, data: { updatedById: opciones.actorId } });
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "PROPUESTA_ANONIMIZADA",
      entidad: "Submission",
      entidadId: opciones.id,
      resumen: "Propuesta anonimizada desde el panel",
    });
  });
}

export async function eliminar(bd: ClienteBD, opciones: { id: string; version: number; actorId: string }) {
  await bd.$transaction(async (tx) => {
    const { count } = await tx.submission.deleteMany({ where: { id: opciones.id, version: opciones.version } });
    if (count === 0) {
      const existe = await tx.submission.findUnique({ where: { id: opciones.id }, select: { id: true } });
      if (existe) throw new ConflictoPropuesta();
      return;
    }
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "PROPUESTA_ELIMINADA",
      entidad: "Submission",
      entidadId: opciones.id,
      resumen: "Propuesta eliminada definitivamente",
    });
  });
}
