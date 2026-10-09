import { createHash } from "node:crypto";
import { auditar } from "@/server/auditoria";
import type { ClienteBD } from "@/server/db";

export class ErrorLegal extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorLegal";
  }
}

/**
 * Publica una versión del texto legal: copia inmutable del texto actual (LegalVersion) con su huella.
 * Requisitos: texto marcado como completo y no vacío. Si el texto no ha cambiado desde la última versión,
 * no se crea otra. La versión de privacidad vigente es la que se acepta en el formulario.
 */
export async function publicarVersionLegal(
  bd: ClienteBD,
  opciones: { paginaId: string; version: number; actorId: string; ahora?: Date },
): Promise<{ etiqueta: string; nueva: boolean }> {
  return bd.$transaction(async (tx) => {
    const pagina = await tx.legalPage.findUnique({
      where: { id: opciones.paginaId },
      include: { versions: { orderBy: { publishedAt: "desc" }, take: 1 } },
    });
    if (!pagina) throw new ErrorLegal("El texto legal ya no existe.");
    if (pagina.version !== opciones.version) {
      throw new ErrorLegal("El texto ha cambiado mientras tanto. Recarga la página y revísalo antes de publicar.");
    }
    const cuerpo = pagina.body.trim();
    if (!pagina.isComplete) throw new ErrorLegal("Marca «Texto completo y revisado» y guarda antes de publicar.");
    if (cuerpo.length < 200) throw new ErrorLegal("El texto es demasiado corto para publicarlo.");
    if (/\[\s*pendiente\s*\]/i.test(cuerpo)) throw new ErrorLegal("El texto todavía contiene «[PENDIENTE]».");

    const huella = createHash("sha256").update(cuerpo).digest("hex");
    const ultima = pagina.versions[0];
    if (ultima && ultima.bodyHash === huella) return { etiqueta: ultima.versionLabel, nueva: false };

    const total = await tx.legalVersion.count({ where: { legalPageId: pagina.id } });
    const etiqueta = `v${total + 1}`;
    await tx.legalVersion.create({
      data: {
        legalPageId: pagina.id,
        versionLabel: etiqueta,
        bodyHash: huella,
        body: cuerpo,
        publishedAt: opciones.ahora ?? new Date(),
      },
    });
    await auditar(tx, {
      actorId: opciones.actorId,
      accion: "PUBLICACION",
      entidad: "LegalVersion",
      entidadId: pagina.id,
      resumen: `Publicada la versión ${etiqueta} de «${pagina.title}»`,
    });
    return { etiqueta, nueva: true };
  });
}
