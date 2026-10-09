import { Prisma } from "@/generated/prisma/client";
import { leerCampos, type Errores, type Valores } from "@/lib/panel/campos";
import { auditar, marcarCambiosSinPublicar } from "@/server/auditoria";
import type { ClienteBD, ConsultasBD } from "@/server/db";
import { definicion, type DefinicionEntidad, type NombreModelo } from "./registro";

/**
 * Operaciones genéricas del CMS sobre las entidades del registro, todas con control de versión optimista:
 * se guarda solo si la fila sigue en la versión que vio quien edita. Si otra persona la cambió, se avisa
 * y no se pisa nada.
 */

export type ResultadoEdicion = { ok: true; id?: string } | { ok: false; errores?: Errores; mensaje?: string };

export const MENSAJE_CONFLICTO =
  "Otra persona ha guardado cambios aquí mientras editabas. Recarga la página: verás la versión actual (tus cambios no se han guardado).";

/** Interfaz mínima común a los delegados de Prisma que usa el CMS. */
interface Delegado {
  findUnique(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  findMany(args: { where?: Record<string, unknown>; orderBy?: Record<string, string>; select?: Record<string, boolean> }): Promise<
    Array<Record<string, unknown>>
  >;
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<unknown>;
  create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
  aggregate(args: { where?: Record<string, unknown>; _max: Record<string, boolean> }): Promise<{ _max: Record<string, unknown> }>;
}

function delegado(tx: ConsultasBD, modelo: NombreModelo): Delegado {
  return (tx as unknown as Record<NombreModelo, Delegado>)[modelo];
}

function idDe(def: DefinicionEntidad, id: string): string | number | null {
  if (def.idNumerico) return /^\d+$/.test(id) ? Number(id) : null;
  return id.length > 0 && id.length <= 64 ? id : null;
}

function nombreDe(datos: Valores, actual: Record<string, unknown> | null): string {
  const candidato = datos.name ?? datos.label ?? datos.title ?? actual?.name ?? actual?.label ?? actual?.title;
  return typeof candidato === "string" ? ` «${candidato.slice(0, 60)}»` : "";
}

function esErrorDeClave(error: unknown, codigo: "P2002" | "P2003"): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === codigo;
}

export async function guardarEntidad(
  bd: ClienteBD,
  opciones: { clave: string; id: string; version: number; formulario: FormData; actorId: string },
): Promise<ResultadoEdicion> {
  const def = definicion(opciones.clave);
  const id = def ? idDe(def, opciones.id) : null;
  if (!def || id === null) return { ok: false, mensaje: "No se reconoce qué se está guardando." };
  const lectura = leerCampos(def.campos, opciones.formulario);
  if (!lectura.ok) return { ok: false, errores: lectura.errores };

  try {
    return await bd.$transaction(async (tx): Promise<ResultadoEdicion> => {
      const tabla = delegado(tx, def.modelo);
      const actual = await tabla.findUnique({ where: { id } });
      if (!actual) return { ok: false, mensaje: "Este elemento ya no existe. Recarga la página." };
      const errores = (await def.validar?.(lectura.datos, { tx, actual })) ?? {};
      if (Object.keys(errores).length > 0) return { ok: false, errores };

      const { count } = await tabla.updateMany({
        where: { id, version: opciones.version },
        data: { ...lectura.datos, updatedById: opciones.actorId, version: { increment: 1 } },
      });
      if (count === 0) return { ok: false, mensaje: MENSAJE_CONFLICTO };
      if (def.afectaPublicacion !== false) await marcarCambiosSinPublicar(tx);
      await auditar(tx, {
        actorId: opciones.actorId,
        accion: def.accion ?? "CONTENIDO_GUARDADO",
        entidad: def.modelo,
        entidadId: String(id),
        resumen: `Guardado ${def.nombre}${nombreDe(lectura.datos, actual)}`,
      });
      return { ok: true };
    });
  } catch (error) {
    if (esErrorDeClave(error, "P2002")) return { ok: false, mensaje: "Ya existe otro elemento con esos datos." };
    throw error;
  }
}

function hermanos(def: DefinicionEntidad, fila: Record<string, unknown>): Record<string, unknown> {
  const condicion: Record<string, unknown> = {};
  if (def.lista?.padre) condicion[def.lista.padre] = fila[def.lista.padre];
  for (const campo of def.lista?.grupo ?? []) condicion[campo] = fila[campo];
  return condicion;
}

export async function crearEntidad(
  bd: ClienteBD,
  opciones: { clave: string; padreId: string | null; formulario: FormData; actorId: string },
): Promise<ResultadoEdicion> {
  const def = definicion(opciones.clave);
  if (!def?.lista) return { ok: false, mensaje: "Aquí no se pueden añadir elementos." };
  const lectura = leerCampos(def.camposCreacion ?? def.campos, opciones.formulario);
  if (!lectura.ok) return { ok: false, errores: lectura.errores };
  if (def.lista.padre && !opciones.padreId) return { ok: false, mensaje: "Falta el elemento al que pertenece." };

  try {
    return await bd.$transaction(async (tx): Promise<ResultadoEdicion> => {
      const errores = (await def.validar?.(lectura.datos, { tx, actual: null })) ?? {};
      if (Object.keys(errores).length > 0) return { ok: false, errores };
      const tabla = delegado(tx, def.modelo);
      const base: Record<string, unknown> = { ...lectura.datos };
      if (def.lista?.padre) base[def.lista.padre] = opciones.padreId;
      const { _max } = await tabla.aggregate({ where: hermanos(def, base), _max: { sortOrder: true } });
      const ultimo = typeof _max.sortOrder === "number" ? _max.sortOrder : 0;
      const extra = (await def.preparar?.(lectura.datos, tx)) ?? {};
      const creada = await tabla.create({
        data: { ...base, ...extra, sortOrder: ultimo + 1, updatedById: opciones.actorId },
      });
      if (def.afectaPublicacion !== false) await marcarCambiosSinPublicar(tx);
      await auditar(tx, {
        actorId: opciones.actorId,
        accion: def.accion ?? (def.modelo === "sponsor" ? "PATROCINADOR_GUARDADO" : "CONTENIDO_GUARDADO"),
        entidad: def.modelo,
        entidadId: String(creada.id),
        resumen: `Añadido ${def.nombre}${nombreDe(lectura.datos, null)}`,
      });
      return { ok: true, id: String(creada.id) };
    });
  } catch (error) {
    if (esErrorDeClave(error, "P2002")) return { ok: false, mensaje: "Ya existe otro elemento con esos datos." };
    throw error;
  }
}

export async function borrarEntidad(
  bd: ClienteBD,
  opciones: { clave: string; id: string; version: number; actorId: string },
): Promise<ResultadoEdicion> {
  const def = definicion(opciones.clave);
  const id = def ? idDe(def, opciones.id) : null;
  if (!def?.borrable || id === null) return { ok: false, mensaje: "Este elemento no se puede borrar." };
  try {
    return await bd.$transaction(async (tx): Promise<ResultadoEdicion> => {
      const tabla = delegado(tx, def.modelo);
      const actual = await tabla.findUnique({ where: { id } });
      if (!actual) return { ok: true };
      const { count } = await tabla.deleteMany({ where: { id, version: opciones.version } });
      if (count === 0) return { ok: false, mensaje: MENSAJE_CONFLICTO };
      if (def.afectaPublicacion !== false) await marcarCambiosSinPublicar(tx);
      await auditar(tx, {
        actorId: opciones.actorId,
        accion: def.accion ?? "CONTENIDO_GUARDADO",
        entidad: def.modelo,
        entidadId: String(id),
        resumen: `Borrado ${def.nombre}${nombreDe({}, actual)}`,
      });
      return { ok: true };
    });
  } catch (error) {
    if (esErrorDeClave(error, "P2003")) {
      return { ok: false, mensaje: "No se puede borrar: hay otros elementos que dependen de este." };
    }
    throw error;
  }
}

/** Sube o baja un elemento dentro de su lista (intercambia el orden con su vecino). */
export async function moverEntidad(
  bd: ClienteBD,
  opciones: { clave: string; id: string; direccion: "arriba" | "abajo"; actorId: string },
): Promise<ResultadoEdicion> {
  const def = definicion(opciones.clave);
  const id = def ? idDe(def, opciones.id) : null;
  if (!def?.lista || id === null) return { ok: false, mensaje: "Este elemento no se puede reordenar." };
  return bd.$transaction(async (tx): Promise<ResultadoEdicion> => {
    const tabla = delegado(tx, def.modelo);
    const actual = await tabla.findUnique({ where: { id } });
    if (!actual) return { ok: false, mensaje: "Este elemento ya no existe. Recarga la página." };
    const lista = await tabla.findMany({ where: hermanos(def, actual), orderBy: { sortOrder: "asc" } });
    const posicion = lista.findIndex((fila) => fila.id === id);
    const vecino = lista[opciones.direccion === "arriba" ? posicion - 1 : posicion + 1];
    if (posicion < 0 || !vecino) return { ok: true };
    const ordenActual = Number(actual.sortOrder);
    const ordenVecino = Number(vecino.sortOrder);
    // Intercambio en tres pasos: el orden es único dentro de la lista (valor temporal negativo).
    await tabla.update({ where: { id }, data: { sortOrder: -1 - ordenActual, version: { increment: 1 } } });
    await tabla.update({ where: { id: vecino.id }, data: { sortOrder: ordenActual, version: { increment: 1 } } });
    await tabla.update({ where: { id }, data: { sortOrder: ordenVecino, updatedById: opciones.actorId } });
    if (def.afectaPublicacion !== false) await marcarCambiosSinPublicar(tx);
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "CONTENIDO_GUARDADO",
      entidad: def.modelo,
      entidadId: String(id),
      resumen: `Reordenado ${def.nombre}${nombreDe({}, actual)}`,
    });
    return { ok: true };
  });
}
