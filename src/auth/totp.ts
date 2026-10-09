import { renderSVG } from "uqr";

/** Datos para mostrar al activar TOTP: el QR (como imagen SVG) y la clave para escribirla a mano. */
export function presentarTotp(totpURI: string): { qrDataUri: string; clave: string } {
  const clave = new URL(totpURI).searchParams.get("secret") ?? "";
  const svg = renderSVG(totpURI);
  return {
    qrDataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    // En grupos de 4 para leerla mejor; las apps la aceptan con o sin espacios.
    clave: clave.replace(/(.{4})/g, "$1 ").trim(),
  };
}
