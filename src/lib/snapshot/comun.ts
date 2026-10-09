import { z } from "zod";

/** Piezas comunes a todas las versiones del snapshot. */

export const texto = z.string().trim().min(1);
export const textoOpcional = texto.nullable();

export const TIPOS_CONTACTO = ["EMAIL", "TELEFONO", "WHATSAPP", "INSTAGRAM", "LINKEDIN", "WEB", "OTRO"] as const;
export const GENERACIONES = ["PRIMERA", "SEGUNDA", "TERCERA"] as const;
export const CLAVES_VIA = ["PECHO", "BOLSA", "JUEGO", "DESPUES"] as const;
export const TIPOS_ELEMENTO_VIA = ["NECESITAMOS", "PUEDES_APORTAR", "RECIBES", "CONDICION", "EJEMPLO"] as const;
export const TIPOS_COLABORACION = [
  "PATROCINADOR_PRINCIPAL_POLO",
  "WELCOME_PACK",
  "PREMIO_CONCURSO",
  "HOYO",
  "SORTEO_EXPERIENCIA",
  "OTRA",
] as const;
export const DISPONIBILIDADES = ["DISPONIBLE", "RESERVADO", "CERRADO"] as const;
export const TIPOS_CONCURSO = ["BOLA_MAS_CERCANA", "DRIVE_MAS_LARGO"] as const;
export const CAMPOS = ["NORTE", "SUR", "AMBOS"] as const;

export type TipoColaboracion = (typeof TIPOS_COLABORACION)[number];
export type ClaveVia = (typeof CLAVES_VIA)[number];
