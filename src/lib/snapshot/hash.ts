import { createHash } from "node:crypto";

/**
 * JSON canónico: claves ordenadas en todos los niveles; los arrays conservan su orden.
 * Dos snapshots con el mismo contenido producen exactamente el mismo texto.
 */
export function jsonCanonico(valor: unknown): string {
  return JSON.stringify(ordenarClaves(valor));
}

function ordenarClaves(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    return valor.map(ordenarClaves);
  }
  if (valor !== null && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor)
        .filter(([, contenido]) => contenido !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([clave, contenido]) => [clave, ordenarClaves(contenido)]),
    );
  }
  return valor;
}

/** SHA-256 del JSON canónico (ContentRevision.contentHash). */
export function hashContenido(valor: unknown): string {
  return createHash("sha256").update(jsonCanonico(valor)).digest("hex");
}
