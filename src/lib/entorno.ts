/**
 * Utilidades puras para la página de comprobación del PR-1.
 * No leen variables de entorno: reciben los valores como argumento para poder probarse.
 */

export function describirEntorno(valor: string | undefined): string {
  switch (valor) {
    case "production":
      return "Producción";
    case "preview":
      return "Preview";
    case "development":
      return "Desarrollo";
    default:
      return "Local o CI";
  }
}

export function abreviarCommit(sha: string | undefined): string {
  if (sha && /^[0-9a-f]{7,40}$/i.test(sha)) {
    return sha.slice(0, 7);
  }
  return "sin commit";
}
