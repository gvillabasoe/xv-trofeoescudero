import { createHash } from "node:crypto";
import sharp, { type Metadata } from "sharp";

/** Límites de subida. 4 MB: por debajo del límite de 4,5 MB del cuerpo de las funciones de Vercel. */
export const LIMITES_MEDIO = {
  bytes: 4 * 1024 * 1024,
  megapixeles: 40,
  ladoMinimo: 200,
} as const;

/** Anchos de las variantes web (WebP). Nunca se amplía: solo los anchos menores que el original. */
export const ANCHOS_VARIANTE = [640, 1280, 1920] as const;
export const ANCHO_COMPARTIR = 1200;

export class ImagenRechazada extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = "ImagenRechazada";
  }
}

export interface ImagenProcesada {
  /** Formato detectado por el contenido real del archivo (no por la extensión). */
  mime: "image/jpeg" | "image/png" | "image/webp";
  ancho: number;
  alto: number;
  megapixeles: number;
  /** Huella del archivo subido: evita duplicados en la biblioteca. */
  sha256: string;
  /** Copia maestra sin metadatos (EXIF, GPS…), girada según la orientación de la cámara. */
  maestro: { datos: Buffer; mime: "image/jpeg" | "image/png"; extension: "jpg" | "png" };
  variantes: Array<{ ancho: number; datos: Buffer }>;
  compartir: { ancho: number; datos: Buffer };
}

const FORMATOS = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;

export async function procesarImagen(datos: Buffer): Promise<ImagenProcesada> {
  if (datos.byteLength === 0) throw new ImagenRechazada("El archivo está vacío.");
  if (datos.byteLength > LIMITES_MEDIO.bytes) {
    throw new ImagenRechazada("La imagen pesa más de 4 MB. Redúcela antes de subirla.");
  }

  let metadatos: Metadata;
  try {
    metadatos = await sharp(datos, { limitInputPixels: LIMITES_MEDIO.megapixeles * 1_000_000 }).metadata();
  } catch {
    throw new ImagenRechazada("No es una imagen válida o supera los 40 megapíxeles.");
  }
  const formato = metadatos.format;
  if (formato !== "jpeg" && formato !== "png" && formato !== "webp") {
    throw new ImagenRechazada("Formato no admitido. Sube JPEG, PNG o WebP.");
  }

  // Girada según EXIF (orientaciones 5–8 intercambian ancho y alto): medidas de la imagen tal como se ve.
  const girada = sharp(datos, { limitInputPixels: LIMITES_MEDIO.megapixeles * 1_000_000 }).rotate();
  const intercambia = (metadatos.orientation ?? 1) >= 5;
  const ancho = (intercambia ? metadatos.height : metadatos.width) ?? 0;
  const alto = (intercambia ? metadatos.width : metadatos.height) ?? 0;
  if (Math.min(ancho, alto) < LIMITES_MEDIO.ladoMinimo) {
    throw new ImagenRechazada(`La imagen es demasiado pequeña: necesita al menos ${LIMITES_MEDIO.ladoMinimo} px por lado.`);
  }

  const conTransparencia = metadatos.hasAlpha === true;
  // Sin withMetadata(): sharp descarta EXIF, GPS e ICC salvo que se pida lo contrario.
  const maestro = conTransparencia
    ? { datos: await girada.clone().png({ compressionLevel: 9 }).toBuffer(), mime: "image/png" as const, extension: "png" as const }
    : { datos: await girada.clone().jpeg({ quality: 90, mozjpeg: true }).toBuffer(), mime: "image/jpeg" as const, extension: "jpg" as const };

  const maximo = ANCHOS_VARIANTE[ANCHOS_VARIANTE.length - 1] ?? 1920;
  const unicos = [...new Set([...ANCHOS_VARIANTE.filter((objetivo) => objetivo < ancho), Math.min(ancho, maximo)])].sort(
    (a, b) => a - b,
  );

  const variantes = await Promise.all(
    unicos.map(async (objetivo) => ({
      ancho: objetivo,
      datos: await girada.clone().resize({ width: objetivo, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    })),
  );
  // JPEG de 1200 px para compartir en redes (algunas aplicaciones no muestran WebP en la vista previa).
  const anchoCompartir = Math.min(ancho, ANCHO_COMPARTIR);
  const compartir = {
    ancho: anchoCompartir,
    datos: await girada
      .clone()
      .resize({ width: anchoCompartir, withoutEnlargement: true })
      .flatten({ background: "#fbfaf6" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer(),
  };

  return {
    mime: FORMATOS[formato],
    ancho,
    alto,
    megapixeles: Math.round(((ancho * alto) / 1_000_000) * 100) / 100,
    sha256: createHash("sha256").update(datos).digest("hex"),
    maestro,
    variantes,
    compartir,
  };
}
