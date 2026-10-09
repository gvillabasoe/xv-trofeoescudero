import { createHmac } from "node:crypto";

/**
 * Huella antiabuso (D12): HMAC-SHA256 de la IP normalizada con FINGERPRINT_HMAC_SECRET.
 * La IP en bruto nunca se guarda: solo esta huella, en AbuseCounter, con caducidad.
 * En Vercel, x-forwarded-for la fija la plataforma con la IP real del cliente.
 */
export function ipDeCabeceras(cabeceras: Headers): string {
  const reenviada = cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (reenviada || cabeceras.get("x-real-ip")?.trim() || "desconocida").toLowerCase();
}

export function huellaDeCabeceras(cabeceras: Headers, secreto: string | undefined): string {
  if (!secreto || secreto.length < 32) {
    throw new Error("Falta FINGERPRINT_HMAC_SECRET (32 caracteres o más) en las variables de Vercel.");
  }
  return createHmac("sha256", secreto).update(ipDeCabeceras(cabeceras)).digest("hex");
}
