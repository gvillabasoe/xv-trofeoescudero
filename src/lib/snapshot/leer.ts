import { esquemaSnapshotV1, type SnapshotV1 } from "./esquema-v1";
import { esquemaSnapshot, type SnapshotPublico } from "./esquema";

/**
 * Lectura de una revisión guardada, sea cual sea su versión de esquema.
 * - `guardado`: el objeto tal como se publicó, validado con el esquema de SU versión. Es lo que se usa para
 *   recalcular la huella (contentHash): una revisión nunca se reescribe.
 * - `snapshot`: el mismo contenido en la forma vigente (versión 2), que es la que lee la web.
 */
export type SnapshotGuardado =
  | { version: 1; guardado: SnapshotV1; snapshot: SnapshotPublico }
  | { version: 2; guardado: SnapshotPublico; snapshot: SnapshotPublico };

export class SnapshotIlegible extends Error {
  constructor(motivo: string) {
    super(`El snapshot guardado no es válido: ${motivo}`);
    this.name = "SnapshotIlegible";
  }
}

/** Versión 1 → forma vigente. Sin imágenes: la versión 1 no las tenía. */
export function normalizarV1(v1: SnapshotV1): SnapshotPublico {
  return {
    version: 2,
    sitio: { ...v1.sitio, imagenCompartir: null },
    contacto: v1.contacto,
    hero: { ...v1.hero, imagen: null },
    familia: v1.familia && {
      ...v1.familia,
      segundaGeneracion: { ...v1.familia.segundaGeneracion, imagen: null },
      terceraGeneracion: { ...v1.familia.terceraGeneracion, imagen: null },
      miembros: v1.familia.miembros.map((miembro) => ({ ...miembro, foto: null })),
    },
    dia: v1.dia && {
      ...v1.dia,
      norte: { ...v1.dia.norte, imagen: null },
      sur: { ...v1.dia.sur, imagen: null },
      despues: { ...v1.dia.despues, imagen: null },
    },
    colaborar: { ...v1.colaborar, vias: v1.colaborar.vias.map((via) => ({ ...via, imagen: null })) },
    cierre: v1.cierre && {
      ...v1.cierre,
      historial: {
        ...v1.cierre.historial,
        marcas: v1.cierre.historial.marcas.map((marca) => ({ ...marca, logo: null })),
      },
      imagen: null,
    },
  };
}

export function leerSnapshotGuardado(valor: unknown): SnapshotGuardado {
  const version =
    valor !== null && typeof valor === "object" && "version" in valor ? (valor as { version: unknown }).version : null;
  if (version === 1) {
    const lectura = esquemaSnapshotV1.safeParse(valor);
    if (!lectura.success) throw new SnapshotIlegible(lectura.error.issues[0]?.message ?? "versión 1");
    return { version: 1, guardado: lectura.data, snapshot: normalizarV1(lectura.data) };
  }
  if (version === 2) {
    const lectura = esquemaSnapshot.safeParse(valor);
    if (!lectura.success) throw new SnapshotIlegible(lectura.error.issues[0]?.message ?? "versión 2");
    return { version: 2, guardado: lectura.data, snapshot: lectura.data };
  }
  throw new SnapshotIlegible(`versión de esquema desconocida (${String(version)})`);
}

/** Como leerSnapshotGuardado, sin lanzar errores. */
export function intentarLeerSnapshot(valor: unknown): SnapshotGuardado | null {
  try {
    return leerSnapshotGuardado(valor);
  } catch {
    return null;
  }
}
