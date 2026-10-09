import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, list, put } from "@vercel/blob";

/**
 * Almacenamiento de archivos (Entrega 5). Único punto que usa Vercel Blob (ESLint lo impone).
 *
 * D-MEDIA-PRIVADO: un solo almacén PRIVADO para todo.
 * - Originales: «originales/…», nunca se sirven.
 * - Variantes web: «variantes/…», se sirven solo a través de /medios/[archivo], que comprueba en cada
 *   petición que la imagen sigue publicada (si se retira por consentimiento, deja de servirse).
 *
 * Adaptadores:
 * - Vercel Blob: si el almacén está conectado al proyecto (BLOB_STORE_ID + OIDC) o hay BLOB_READ_WRITE_TOKEN.
 * - Disco local: solo fuera de Vercel y con ALMACEN_LOCAL_DIR (pruebas locales y de extremo a extremo).
 * - Ninguno: la biblioteca de imágenes explica qué falta y no deja subir nada.
 */
export interface Almacen {
  readonly nombre: "vercel-blob" | "disco-local";
  guardar(ruta: string, datos: Buffer, tipo: string): Promise<void>;
  leer(ruta: string): Promise<{ cuerpo: ReadableStream<Uint8Array>; tipo: string } | null>;
  borrar(rutas: string[]): Promise<void>;
  listar(prefijo: string): Promise<string[]>;
}

type Variables = Readonly<Record<string, string | undefined>>;

const PATRON_RUTA = /^(originales|variantes)\/[a-z0-9][a-z0-9.-]*$/;

function comprobarRuta(ruta: string): string {
  if (!PATRON_RUTA.test(ruta) || ruta.includes("..")) throw new Error(`Ruta de almacenamiento no válida: ${ruta}`);
  return ruta;
}

function almacenVercelBlob(): Almacen {
  return {
    nombre: "vercel-blob",
    async guardar(ruta, datos, tipo) {
      await put(comprobarRuta(ruta), datos, {
        access: "private",
        contentType: tipo,
        addRandomSuffix: false,
        // Rutas con identificador único: si un reintento escribe lo mismo, no falla.
        allowOverwrite: true,
      });
    },
    async leer(ruta) {
      const resultado = await get(comprobarRuta(ruta), { access: "private" });
      if (!resultado || resultado.statusCode !== 200) return null;
      return { cuerpo: resultado.stream, tipo: resultado.blob.contentType };
    },
    async borrar(rutas) {
      if (rutas.length > 0) await del(rutas.map(comprobarRuta));
    },
    async listar(prefijo) {
      const rutas: string[] = [];
      let cursor: string | undefined;
      do {
        const pagina = await list({ prefix: prefijo, cursor, limit: 1000 });
        rutas.push(...pagina.blobs.map((blob) => blob.pathname));
        cursor = pagina.hasMore ? pagina.cursor : undefined;
      } while (cursor);
      return rutas;
    },
  };
}

function almacenDisco(directorio: string): Almacen {
  const base = path.resolve(directorio);
  const absoluta = (ruta: string) => path.join(base, ...comprobarRuta(ruta).split("/"));
  return {
    nombre: "disco-local",
    async guardar(ruta, datos, tipo) {
      const destino = absoluta(ruta);
      await mkdir(path.dirname(destino), { recursive: true });
      await writeFile(destino, datos);
      await writeFile(`${destino}.tipo`, tipo);
    },
    async leer(ruta) {
      try {
        const destino = absoluta(ruta);
        const [datos, tipo] = await Promise.all([readFile(destino), readFile(`${destino}.tipo`, "utf8")]);
        return { cuerpo: Readable.toWeb(Readable.from(datos)) as ReadableStream<Uint8Array>, tipo };
      } catch {
        return null;
      }
    },
    async borrar(rutas) {
      for (const ruta of rutas) {
        const destino = absoluta(ruta);
        await rm(destino, { force: true });
        await rm(`${destino}.tipo`, { force: true });
      }
    },
    async listar(prefijo) {
      const [carpeta] = prefijo.split("/");
      try {
        const archivos = await readdir(path.join(base, carpeta ?? ""));
        return archivos
          .filter((archivo) => !archivo.endsWith(".tipo"))
          .map((archivo) => `${carpeta}/${archivo}`)
          .filter((ruta) => ruta.startsWith(prefijo));
      } catch {
        return [];
      }
    },
  };
}

/** Qué almacén hay disponible en este entorno, o null si no hay ninguno configurado. */
export function describirAlmacen(env: Variables = process.env): "vercel-blob" | "disco-local" | null {
  if (env.BLOB_READ_WRITE_TOKEN || env.BLOB_STORE_ID) return "vercel-blob";
  if (!env.VERCEL && env.ALMACEN_LOCAL_DIR) return "disco-local";
  return null;
}

export function obtenerAlmacen(env: Variables = process.env): Almacen | null {
  const tipo = describirAlmacen(env);
  if (tipo === "vercel-blob") return almacenVercelBlob();
  if (tipo === "disco-local" && env.ALMACEN_LOCAL_DIR) return almacenDisco(env.ALMACEN_LOCAL_DIR);
  return null;
}
