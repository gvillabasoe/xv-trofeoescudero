"use client";

import { useActionState, useState, useTransition } from "react";
import type { EstadoEdicion } from "@/server/panel/acciones";
import { Estado } from "./formulario-entidad";

const INICIAL: EstadoEdicion = {};
const MAXIMO_BYTES = 4 * 1024 * 1024;
const LADO_MAXIMO = 2560;

/**
 * Reduce en el navegador una foto demasiado grande (más de 4 MB o de 2560 px) antes de subirla.
 * El límite de 4 MB lo impone Vercel al cuerpo de las peticiones. Al redibujar también se pierden los
 * metadatos EXIF (ubicación incluida). El servidor vuelve a comprobarlo todo.
 */
async function prepararArchivo(archivo: File): Promise<File> {
  const imagen = await createImageBitmap(archivo).catch(() => null);
  if (!imagen) return archivo;
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  if (archivo.size <= MAXIMO_BYTES && escala === 1) return archivo;
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext("2d")?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  const tipo = archivo.type === "image/png" ? "image/png" : "image/jpeg";
  for (const calidad of [0.9, 0.82, 0.72]) {
    const blob = await new Promise<Blob | null>((resolver) => lienzo.toBlob(resolver, tipo, calidad));
    if (blob && blob.size <= MAXIMO_BYTES) {
      return new File([blob], archivo.name.replace(/\.[a-z0-9]+$/i, tipo === "image/png" ? ".png" : ".jpg"), { type: tipo });
    }
  }
  return archivo;
}

export function SubirImagen({ accion }: { accion: (previo: EstadoEdicion, formulario: FormData) => Promise<EstadoEdicion> }) {
  const [estado, enviar, enviando] = useActionState(accion, INICIAL);
  const [, iniciar] = useTransition();
  const [preparando, setPreparando] = useState(false);

  return (
    <form
      action={enviar}
      className="cms-form"
      onSubmit={async (evento) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        const archivo = datos.get("archivo");
        if (archivo instanceof File && archivo.size > 0) {
          setPreparando(true);
          datos.set("archivo", await prepararArchivo(archivo));
          setPreparando(false);
        }
        iniciar(() => enviar(datos));
      }}
    >
      <div className="cms-campos">
        <div className="campo">
          <label htmlFor="archivo">Imagen (JPEG, PNG o WebP)</label>
          <input id="archivo" name="archivo" type="file" accept="image/jpeg,image/png,image/webp" required />
          <p className="ayuda">Hasta 4 MB (si pesa más, se reduce aquí antes de subirla) y al menos 200 px por lado.</p>
        </div>
        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" name="tipo" defaultValue="FOTO">
            <option value="FOTO">Foto</option>
            <option value="LOGO">Logo de una marca</option>
            <option value="ILUSTRACION">Ilustración</option>
          </select>
        </div>
      </div>
      <div className="cms-pie">
        <button type="submit" className="boton" disabled={enviando || preparando}>
          {preparando ? "Preparando…" : enviando ? "Subiendo…" : "Subir"}
        </button>
        <Estado estado={estado} />
      </div>
    </form>
  );
}
