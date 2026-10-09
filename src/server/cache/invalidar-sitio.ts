import { revalidatePath, updateTag } from "next/cache";
import { crearInvalidador } from "@/server/cache/invalidacion";

/**
 * Invalida la caché pública después de publicar. Solo desde una Server Action.
 * La acción de publicación del CMS (Fase 5) la llamará justo después de publicar().
 */
export function invalidarSitioPublico() {
  return crearInvalidador({ updateTag, revalidatePath }).invalidarSitioPublico();
}
