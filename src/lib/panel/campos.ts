/**
 * Formularios del panel: descripción de los campos y lectura/validación de FormData.
 * Se usa en el navegador (para pintar el formulario) y en el servidor (para validar). Sin dependencias.
 */

export type TipoCampo = "texto" | "area" | "numero" | "casilla" | "seleccion" | "fecha" | "url";

export interface Opcion {
  valor: string;
  etiqueta: string;
}

export interface Campo {
  /** Nombre del campo en la base de datos (Prisma). */
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  opcional?: boolean;
  /** Texto: longitud máxima. Número: valor máximo. */
  max?: number;
  /** Número: valor mínimo. */
  min?: number;
  ayuda?: string;
  opciones?: readonly Opcion[];
  filas?: number;
  /** Se muestra pero no se puede cambiar. */
  soloLectura?: boolean;
  /** Dato interno: nunca se publica (se indica en el formulario). */
  privado?: boolean;
  /** Ocupa toda la fila. */
  ancho?: boolean;
}

export type ValorCampo = string | number | boolean | Date | null;
export type Valores = Record<string, ValorCampo>;
export type Errores = Record<string, string>;

export type Lectura = { ok: true; datos: Valores } | { ok: false; errores: Errores };

const LONGITUD_POR_DEFECTO = { texto: 300, area: 4000, url: 500 } as const;

export const MENSAJES_CAMPO = {
  vacio: "Este campo no puede quedar vacío.",
  largo: (maximo: number) => `Como máximo, ${maximo} caracteres.`,
  numero: "Escribe un número entero.",
  minimo: (minimo: number) => `El mínimo es ${minimo}.`,
  maximo: (maximo: number) => `El máximo es ${maximo}.`,
  opcion: "Elige una de las opciones.",
  fecha: "Escribe una fecha válida.",
  url: "Escribe una dirección completa que empiece por https://",
} as const;

function texto(formulario: FormData, nombre: string): string {
  const valor = formulario.get(nombre);
  return typeof valor === "string" ? valor.trim() : "";
}

/** Lee y valida los campos editables. Los textos vacíos opcionales se guardan como null. */
export function leerCampos(campos: readonly Campo[], formulario: FormData): Lectura {
  const datos: Valores = {};
  const errores: Errores = {};

  for (const campo of campos) {
    if (campo.soloLectura) continue;
    const bruto = texto(formulario, campo.nombre);

    switch (campo.tipo) {
      case "casilla":
        datos[campo.nombre] = formulario.get(campo.nombre) === "si";
        break;
      case "numero": {
        if (bruto === "") {
          if (campo.opcional) datos[campo.nombre] = null;
          else errores[campo.nombre] = MENSAJES_CAMPO.vacio;
          break;
        }
        if (!/^-?\d+$/.test(bruto)) {
          errores[campo.nombre] = MENSAJES_CAMPO.numero;
          break;
        }
        const numero = Number(bruto);
        if (campo.min !== undefined && numero < campo.min) errores[campo.nombre] = MENSAJES_CAMPO.minimo(campo.min);
        else if (campo.max !== undefined && numero > campo.max) errores[campo.nombre] = MENSAJES_CAMPO.maximo(campo.max);
        else datos[campo.nombre] = numero;
        break;
      }
      case "seleccion": {
        if (bruto === "") {
          if (campo.opcional) datos[campo.nombre] = null;
          else errores[campo.nombre] = MENSAJES_CAMPO.opcion;
          break;
        }
        // Sin lista de opciones (p. ej., categorías): la comprueba el servidor contra la base de datos.
        if (campo.opciones && !campo.opciones.some((opcion) => opcion.valor === bruto)) {
          errores[campo.nombre] = MENSAJES_CAMPO.opcion;
          break;
        }
        datos[campo.nombre] = bruto;
        break;
      }
      case "fecha": {
        if (bruto === "") {
          if (campo.opcional) datos[campo.nombre] = null;
          else errores[campo.nombre] = MENSAJES_CAMPO.vacio;
          break;
        }
        const fecha = /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? new Date(`${bruto}T00:00:00.000Z`) : null;
        if (!fecha || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== bruto) {
          errores[campo.nombre] = MENSAJES_CAMPO.fecha;
          break;
        }
        datos[campo.nombre] = fecha;
        break;
      }
      default: {
        const maximo = campo.max ?? LONGITUD_POR_DEFECTO[campo.tipo];
        if (bruto === "") {
          if (campo.opcional) datos[campo.nombre] = null;
          else errores[campo.nombre] = MENSAJES_CAMPO.vacio;
          break;
        }
        if (bruto.length > maximo) {
          errores[campo.nombre] = MENSAJES_CAMPO.largo(maximo);
          break;
        }
        if (campo.tipo === "url" && !/^https:\/\/[^\s]+$/i.test(bruto)) {
          errores[campo.nombre] = MENSAJES_CAMPO.url;
          break;
        }
        datos[campo.nombre] = bruto;
      }
    }
  }

  return Object.keys(errores).length > 0 ? { ok: false, errores } : { ok: true, datos };
}

/** Solo los valores de los campos del formulario (lo que viaja al navegador). */
export function valoresDe(fila: object, campos: readonly Campo[]): Record<string, ValorCampo> {
  const registro = fila as Record<string, unknown>;
  return Object.fromEntries(
    campos.map((campo) => {
      const valor = registro[campo.nombre];
      const seguro =
        typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean" || valor instanceof Date
          ? valor
          : null;
      return [campo.nombre, seguro];
    }),
  );
}

/** Valor para pintar en el formulario (fechas como AAAA-MM-DD). */
export function valorParaFormulario(valor: ValorCampo | undefined): string | boolean {
  if (valor === null || valor === undefined) return "";
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "boolean") return valor;
  return String(valor);
}

/** Convierte un texto en un identificador legible (slug): «Julius Bär» → «julius-bar». */
export function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
