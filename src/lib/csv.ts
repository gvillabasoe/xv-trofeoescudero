/**
 * CSV para hojas de cálculo en español: separador «;», fin de línea CRLF y BOM UTF-8 (Excel lo abre bien).
 * Protección contra inyección de fórmulas: una celda que empieza por = + - @ (o tabulador/retorno) se
 * antepone con un apóstrofo, para que la hoja la trate como texto.
 */
export const SEPARADOR = ";";
const BOM = "﻿";

export function celdaSegura(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  let texto = valor instanceof Date ? valor.toISOString() : String(valor);
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[";\r\n]/.test(texto) || texto.includes(SEPARADOR)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function generarCsv(cabeceras: readonly string[], filas: ReadonlyArray<readonly unknown[]>): string {
  const lineas = [cabeceras, ...filas].map((fila) => fila.map(celdaSegura).join(SEPARADOR));
  return `${BOM}${lineas.join("\r\n")}\r\n`;
}
