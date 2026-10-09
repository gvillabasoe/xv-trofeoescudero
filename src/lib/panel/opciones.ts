import {
  NOMBRE_CAMPO,
  NOMBRE_CONCURSO,
  NOMBRE_DISPONIBILIDAD,
  NOMBRE_ELEMENTO_VIA,
  NOMBRE_TIPO_COLABORACION,
  NOMBRE_TIPO_CONTACTO,
} from "@/lib/etiquetas";
import type { Opcion } from "./campos";

/** Etiquetas de los valores internos que solo aparecen en el panel. */

export const NOMBRE_GENERACION = {
  PRIMERA: "Primera generación",
  SEGUNDA: "Segunda generación",
  TERCERA: "3ª Generación",
} as const;

export const NOMBRE_RELACION = {
  PATROCINADOR: "Patrocinador",
  COLABORADOR: "Colaborador",
  PATROCINADOR_O_COLABORADOR: "Patrocinador o colaborador (la fuente no lo concreta)",
  COLABORACION_SOLIDARIA: "Colaboración solidaria",
} as const;

export const NOMBRE_TEMPORALIDAD = {
  HISTORICO: "Histórica (ediciones anteriores)",
  ACTUAL: "Actual (esta edición)",
} as const;

export const NOMBRE_FUENTE = {
  INFO_V3: "Información v3",
  GUION: "Guion",
  ORGANIZACION: "Confirmación de la organización",
  OTRA: "Otra (explícala en la nota)",
} as const;

export const NOMBRE_PERMISO_LOGO = {
  PENDIENTE: "Pendiente",
  AUTORIZADO: "Autorizado",
  DENEGADO: "Denegado",
  NO_APLICA: "No aplica",
} as const;

export const NOMBRE_REVISION_JURIDICA = {
  NO_REQUERIDA: "No requerida",
  PENDIENTE: "Pendiente",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
} as const;

export const NOMBRE_ESTADO_MEDIO = {
  SUBIDA: "Subida",
  EN_REVISION: "En revisión",
  AUTORIZADA: "Autorizada",
  PUBLICADA: "Publicada",
  RETIRADA: "Retirada",
} as const;

export const NOMBRE_TIPO_MEDIO = {
  FOTO: "Foto",
  LOGO: "Logo",
  ILUSTRACION: "Ilustración",
} as const;

export const NOMBRE_MOTIVO_RETIRADA = {
  SUSTITUIDA: "Sustituida por otra",
  CONSENTIMIENTO_RETIRADO: "Consentimiento retirado",
  PERMISO_LOGO: "Permiso de logo retirado",
  JURIDICO: "Motivo jurídico",
  OTRO: "Otro motivo",
} as const;

export function aOpciones(registro: Readonly<Record<string, string>>): Opcion[] {
  return Object.entries(registro).map(([valor, etiqueta]) => ({ valor, etiqueta }));
}

export const OPCIONES = {
  generacion: aOpciones(NOMBRE_GENERACION),
  relacion: aOpciones(NOMBRE_RELACION),
  temporalidad: aOpciones(NOMBRE_TEMPORALIDAD),
  fuente: aOpciones(NOMBRE_FUENTE),
  permisoLogo: aOpciones(NOMBRE_PERMISO_LOGO),
  revisionJuridica: aOpciones(NOMBRE_REVISION_JURIDICA),
  tipoColaboracion: aOpciones(NOMBRE_TIPO_COLABORACION),
  disponibilidad: aOpciones(NOMBRE_DISPONIBILIDAD),
  concurso: aOpciones(NOMBRE_CONCURSO),
  campo: aOpciones(NOMBRE_CAMPO),
  tipoContacto: aOpciones(NOMBRE_TIPO_CONTACTO),
  elementoVia: aOpciones(NOMBRE_ELEMENTO_VIA),
  tipoMedio: aOpciones(NOMBRE_TIPO_MEDIO),
  motivoRetirada: aOpciones(NOMBRE_MOTIVO_RETIRADA),
} as const;
