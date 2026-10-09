import { PATRON_URL_MEDIO } from "./esquema";

/**
 * Inspección recursiva del snapshot público (D-SNAPSHOT-WHITELIST).
 * El snapshot ya se construye por lista blanca y se valida con Zod en modo estricto; esto es una
 * segunda barrera, independiente, que recorre nombres de propiedad, textos, objetos y arrays.
 */

/** Nombres de propiedad que nunca pueden aparecer en lo público (comparación sin mayúsculas). */
export const CLAVES_PROHIBIDAS = [
  "email",
  "phone",
  "telefono",
  "message",
  "mensaje",
  "legalReview",
  "requiresLegalReview",
  "internalNotes",
  "internalSource",
  "source",
  "sourceNote",
  "logoPermission",
  "publicVisibility",
  "availability",
  "showStatusPublicly",
  "privateStatus",
  "status",
  "fingerprint",
  "abuseFingerprint",
  "password",
  "token",
  "secret",
  "session",
  "sessions",
  "user",
  "users",
  "userId",
  "actorId",
  "createdById",
  "updatedById",
  "ipAddress",
  "userAgent",
  "notes",
  "note",
  "auditLog",
  "isSynthetic",
  "confirmed",
  "lifecycle",
  "consentText",
  "company",
  "jobTitle",
] as const;

const CLAVES = new Set(CLAVES_PROHIBIDAS.map((clave) => clave.toLowerCase()));

const PATRON_EMAIL = /[^\s@«»"']+@[^\s@«»"']+\.[a-z]{2,}/i;
/** Nueve dígitos o más, con separadores sueltos: parece un teléfono. */
const PATRON_TELEFONO = /(?:\+?\d[\s.-]?){9,}/;
const PATRON_PENDIENTE = /\[\s*pendiente\s*\]/i;

/** Rutas donde un email o un teléfono son públicos por diseño: los canales de contacto activos (P1). */
const RUTAS_CONTACTO = /^contacto\.\d+\.(valor|url)$/;

export interface Hallazgo {
  ruta: string;
  motivo: string;
}

export interface OpcionesInspeccion {
  /** Textos que no pueden aparecer (sin mayúsculas), por ejemplo, entidades ocultas. */
  textosProhibidos?: readonly string[];
}

export function buscarDatosPrivados(valor: unknown, opciones: OpcionesInspeccion = {}): Hallazgo[] {
  const hallazgos: Hallazgo[] = [];
  const prohibidos = (opciones.textosProhibidos ?? []).map((texto) => texto.toLowerCase());

  const visitar = (actual: unknown, ruta: string) => {
    if (typeof actual === "string") {
      // Rutas de imágenes publicadas (/medios/…): identificadores generados, no datos personales.
      const enContacto = RUTAS_CONTACTO.test(ruta) || PATRON_URL_MEDIO.test(actual);
      if (!enContacto && PATRON_EMAIL.test(actual)) hallazgos.push({ ruta, motivo: "contiene un email" });
      if (!enContacto && PATRON_TELEFONO.test(actual)) hallazgos.push({ ruta, motivo: "contiene un teléfono" });
      if (PATRON_PENDIENTE.test(actual)) hallazgos.push({ ruta, motivo: "contiene «[PENDIENTE]»" });
      const minusculas = actual.toLowerCase();
      for (const texto of prohibidos) {
        if (minusculas.includes(texto)) hallazgos.push({ ruta, motivo: `contiene un texto prohibido («${texto}»)` });
      }
      return;
    }
    if (Array.isArray(actual)) {
      actual.forEach((elemento, indice) => visitar(elemento, ruta ? `${ruta}.${indice}` : String(indice)));
      return;
    }
    if (actual !== null && typeof actual === "object") {
      for (const [clave, contenido] of Object.entries(actual)) {
        const rutaHija = ruta ? `${ruta}.${clave}` : clave;
        if (CLAVES.has(clave.toLowerCase())) hallazgos.push({ ruta: rutaHija, motivo: `propiedad prohibida «${clave}»` });
        visitar(contenido, rutaHija);
      }
    }
  };

  visitar(valor, "");
  return hallazgos;
}
