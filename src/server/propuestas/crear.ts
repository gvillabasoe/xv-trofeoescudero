import { TEXTO_CONSENTIMIENTO, describirOrigen, type DatosPropuesta, type OrigenPropuesta } from "@/lib/proponer";
import { registrarIntento } from "@/server/auth/limite";
import type { ClienteBD, ConsultasBD } from "@/server/db";

/** Slug de la página legal cuya versión vigente se acepta al enviar una propuesta. */
export const SLUG_PRIVACIDAD = "privacidad";

export class FormularioCerrado extends Error {
  constructor() {
    super("El formulario está cerrado: falta publicar la política de privacidad.");
    this.name = "FormularioCerrado";
  }
}

export class DemasiadosEnvios extends Error {
  constructor() {
    super("Demasiados envíos seguidos desde la misma conexión.");
    this.name = "DemasiadosEnvios";
  }
}

export class PrivacidadCambiada extends Error {
  /** Versión vigente, para que el formulario muestre y acepte la nueva. */
  readonly vigenteId: string;

  constructor(vigenteId: string) {
    super("La versión de la política de privacidad aceptada ya no es la vigente.");
    this.name = "PrivacidadCambiada";
    this.vigenteId = vigenteId;
  }
}

/**
 * Versión vigente de la política de privacidad: la última publicada (LegalVersion, inmutable).
 * Solo se puede publicar una versión con el texto marcado como completo (panel › Textos legales).
 */
export async function privacidadVigente(bd: ConsultasBD) {
  return bd.legalVersion.findFirst({
    where: { legalPage: { slug: SLUG_PRIVACIDAD } },
    orderBy: { publishedAt: "desc" },
    select: { id: true, versionLabel: true },
  });
}

export interface EnvioPropuesta {
  datos: DatosPropuesta;
  origen: OrigenPropuesta;
  /** Id de la LegalVersion que se mostró junto a la casilla. */
  versionLegalId: string;
  /** Huella HMAC de la IP (nunca la IP). */
  huella: string;
  contexto?: {
    sourcePath?: string | null;
    referrer?: string | null;
    utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content", string | null>>;
  };
  ahora?: Date;
}

function recortar(valor: string | null | undefined, maximo: number): string | null {
  const limpio = valor?.trim();
  return limpio ? limpio.slice(0, maximo) : null;
}

/** El referrer se guarda solo como origen (esquema + host), sin ruta ni parámetros. */
export function limpiarReferrer(valor: string | null | undefined): string | null {
  if (!valor) return null;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * Guarda una propuesta (Neon primero, siempre): comprueba el límite de envíos, que la política de privacidad
 * aceptada sea la vigente, y registra el consentimiento con su versión exacta y el historial inicial.
 */
export async function registrarPropuesta(bd: ClienteBD, envio: EnvioPropuesta): Promise<{ id: string; creadaEn: Date }> {
  const ahora = envio.ahora ?? new Date();
  const { permitido } = await registrarIntento(bd, { accion: "FORM", huella: envio.huella, ahora });
  if (!permitido) throw new DemasiadosEnvios();

  return bd.$transaction(async (tx) => {
    const vigente = await privacidadVigente(tx);
    if (!vigente) throw new FormularioCerrado();
    if (vigente.id !== envio.versionLegalId) throw new PrivacidadCambiada(vigente.id);

    const { datos, origen, contexto } = envio;
    const propuesta = await tx.submission.create({
      data: {
        name: datos.nombre,
        company: datos.empresa,
        jobTitle: datos.cargo,
        email: datos.email.toLowerCase(),
        phone: datos.telefono,
        collaborationType: datos.tipo,
        originRouteKey: origen.via,
        originHoleNumber: origen.hoyo,
        formOrigin: describirOrigen(origen),
        message: datos.mensaje,
        consentAt: ahora,
        consentLegalVersionId: vigente.id,
        consentText: TEXTO_CONSENTIMIENTO,
        status: "NUEVA",
        lastActivityAt: ahora,
        sourcePath: recortar(contexto?.sourcePath, 200),
        referrer: limpiarReferrer(contexto?.referrer),
        utmSource: recortar(contexto?.utm?.utm_source, 100),
        utmMedium: recortar(contexto?.utm?.utm_medium, 100),
        utmCampaign: recortar(contexto?.utm?.utm_campaign, 100),
        utmTerm: recortar(contexto?.utm?.utm_term, 100),
        utmContent: recortar(contexto?.utm?.utm_content, 100),
        statusHistory: { create: { fromStatus: null, toStatus: "NUEVA", changedAt: ahora } },
      },
      select: { id: true, createdAt: true },
    });
    return { id: propuesta.id, creadaEn: propuesta.createdAt };
  });
}
