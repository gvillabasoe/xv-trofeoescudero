import { createHmac } from "node:crypto";

// Código TOTP (RFC 6238: HMAC-SHA1, 6 cifras, 30 segundos), como lo calcula una app de autenticación.
// Solo para los tests: permite completar el flujo de TOTP sin un móvil.

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32(texto: string): Buffer {
  const limpio = texto.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const caracter of limpio) {
    const valor = ALFABETO.indexOf(caracter);
    if (valor < 0) throw new Error(`Carácter base32 no válido: ${caracter}`);
    bits += valor.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

export function secretoDeUri(totpURI: string): string {
  const secreto = new URL(totpURI).searchParams.get("secret");
  if (!secreto) throw new Error("La URI TOTP no tiene secreto.");
  return secreto;
}

export function codigoTotp(secretoBase32: string, ahora = Date.now()): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(ahora / 1000 / 30)));
  const hmac = createHmac("sha1", base32(secretoBase32)).update(contador).digest();
  const desplazamiento = (hmac[hmac.length - 1] ?? 0) & 0x0f;
  const binario =
    (((hmac[desplazamiento] ?? 0) & 0x7f) << 24) |
    ((hmac[desplazamiento + 1] ?? 0) << 16) |
    ((hmac[desplazamiento + 2] ?? 0) << 8) |
    (hmac[desplazamiento + 3] ?? 0);
  return String(binario % 1_000_000).padStart(6, "0");
}
