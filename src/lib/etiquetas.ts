import type { ClaveVia, TipoColaboracion } from "@/lib/snapshot/comun";

/** Textos de interfaz para los valores internos. Copy de fase-1/direccion-creativa.md §5–§6. */

export const NOMBRE_TIPO_COLABORACION: Readonly<Record<TipoColaboracion, string>> = {
  PATROCINADOR_PRINCIPAL_POLO: "Patrocinador principal / polo",
  WELCOME_PACK: "Welcome pack",
  PREMIO_CONCURSO: "Premio o concurso",
  HOYO: "Hoyo",
  SORTEO_EXPERIENCIA: "Sorteo o experiencia",
  OTRA: "Otra propuesta",
};

/** Orden de las opciones del formulario (§6). */
export const ORDEN_TIPOS_COLABORACION: readonly TipoColaboracion[] = [
  "PATROCINADOR_PRINCIPAL_POLO",
  "WELCOME_PACK",
  "PREMIO_CONCURSO",
  "HOYO",
  "SORTEO_EXPERIENCIA",
  "OTRA",
];

/** `/proponer?tipo=…` (§2.4): parámetro legible ↔ tipo interno. */
export const PARAMETRO_TIPO: Readonly<Record<TipoColaboracion, string>> = {
  PATROCINADOR_PRINCIPAL_POLO: "principal",
  WELCOME_PACK: "welcome-pack",
  PREMIO_CONCURSO: "premio",
  HOYO: "hoyo",
  SORTEO_EXPERIENCIA: "sorteo",
  OTRA: "otra",
};

export function tipoDesdeParametro(valor: string | null | undefined): TipoColaboracion | null {
  if (!valor) return null;
  const limpio = valor.trim().toLowerCase();
  const encontrado = (Object.entries(PARAMETRO_TIPO) as Array<[TipoColaboracion, string]>).find(
    ([, parametro]) => parametro === limpio,
  );
  return encontrado?.[0] ?? null;
}

export const PARAMETRO_VIA: Readonly<Record<ClaveVia, string>> = {
  PECHO: "pecho",
  BOLSA: "bolsa",
  JUEGO: "juego",
  DESPUES: "despues",
};

export function viaDesdeParametro(valor: string | null | undefined): ClaveVia | null {
  if (!valor) return null;
  const limpio = valor.trim().toLowerCase();
  const encontrado = (Object.entries(PARAMETRO_VIA) as Array<[ClaveVia, string]>).find(([, p]) => p === limpio);
  return encontrado?.[0] ?? null;
}

export function hoyoDesdeParametro(valor: string | null | undefined): number | null {
  if (!valor || !/^\d{1,2}$/.test(valor.trim())) return null;
  const numero = Number(valor.trim());
  return numero >= 1 && numero <= 18 ? numero : null;
}

/** Enlace a /proponer con la preselección (tipo y, si se conoce, la vía y el hoyo de origen). */
export function enlaceProponer(opciones: { tipo?: TipoColaboracion; via?: ClaveVia; hoyo?: number } = {}): string {
  const parametros = new URLSearchParams();
  if (opciones.tipo) parametros.set("tipo", PARAMETRO_TIPO[opciones.tipo]);
  if (opciones.via) parametros.set("via", PARAMETRO_VIA[opciones.via]);
  if (opciones.hoyo) parametros.set("hoyo", String(opciones.hoyo));
  const consulta = parametros.toString();
  return consulta ? `/proponer?${consulta}` : "/proponer";
}

export const NOMBRE_ELEMENTO_VIA = {
  NECESITAMOS: "Qué necesitamos",
  PUEDES_APORTAR: "Qué puedes aportar",
  RECIBES: "Qué recibes",
  CONDICION: "Condiciones",
  EJEMPLO: "Ejemplos",
} as const;

export const NOMBRE_CONCURSO = {
  BOLA_MAS_CERCANA: "Bola más cercana",
  DRIVE_MAS_LARGO: "Drive más largo",
} as const;

export const NOMBRE_CAMPO = {
  NORTE: "Campo Norte",
  SUR: "Campo Sur",
  AMBOS: "Ambos campos",
} as const;

export const NOMBRE_DISPONIBILIDAD = {
  DISPONIBLE: "Disponible",
  RESERVADO: "Reservado",
  CERRADO: "Cerrado",
} as const;

export const NOMBRE_ESTADO_PROPUESTA = {
  NUEVA: "Nueva",
  REVISADA: "Revisada",
  CONTACTADA: "Contactada",
  EN_CONVERSACION: "En conversación",
  CERRADA: "Cerrada",
  DESCARTADA: "Descartada",
} as const;

export const NOMBRE_TIPO_CONTACTO = {
  EMAIL: "Email",
  TELEFONO: "Teléfono",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  WEB: "Web",
  OTRO: "Otro",
} as const;

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/** «2027-08-03» → «3 de agosto de 2027». Sin zonas horarias: es una fecha de calendario. */
export function formatearFechaLarga(fecha: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!coincidencia) return fecha;
  const [, anio, mes, dia] = coincidencia;
  return `${Number(dia)} de ${MESES[Number(mes) - 1] ?? mes} de ${anio}`;
}

/** Enlace de un canal de contacto activo: el configurado o uno estándar según su tipo. */
export function enlaceCanal(canal: { tipo: string; valor: string; url: string | null }): string | null {
  if (canal.url) return canal.url;
  if (canal.tipo === "EMAIL") return `mailto:${canal.valor}`;
  if (canal.tipo === "TELEFONO") return `tel:${canal.valor.replace(/[^\d+]/g, "")}`;
  if (canal.tipo === "WHATSAPP") return `https://wa.me/${canal.valor.replace(/\D/g, "")}`;
  return null;
}
