import { NOMBRE_TIPO_COLABORACION } from "@/lib/etiquetas";
import type { TipoColaboracion } from "@/lib/snapshot/comun";

/**
 * Notificaciones (Entrega 5). Avisa al equipo de que hay una propuesta nueva, SIN datos personales:
 * solo el identificador, la fecha, el tipo y el enlace al panel. El contenido se lee dentro del panel.
 *
 * Adaptadores:
 * - Resend (API HTTP, sin dependencia): con RESEND_API_KEY, NOTIFICACIONES_DE (remitente de un dominio
 *   verificado en Resend) y NOTIFICACIONES_PARA (destinatarios separados por comas).
 * - Sin configurar: no envía nada. La propuesta ya está guardada en Neon; el aviso es opcional.
 */
export interface AvisoPropuesta {
  id: string;
  creadaEn: Date;
  tipo: TipoColaboracion;
  enlace: string;
}

export type ResultadoAviso = { enviado: true } | { enviado: false; motivo: "sin-configurar" | "error" };

export interface Notificador {
  readonly nombre: "resend" | "ninguno";
  nuevaPropuesta(aviso: AvisoPropuesta): Promise<ResultadoAviso>;
}

type Variables = Readonly<Record<string, string | undefined>>;

const formatoFecha = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Madrid",
});

export function textoAviso(aviso: AvisoPropuesta): { asunto: string; texto: string } {
  return {
    asunto: `Nueva propuesta en el panel · ${NOMBRE_TIPO_COLABORACION[aviso.tipo]}`,
    texto: [
      "Ha llegado una propuesta nueva al panel del Trofeo Escudero.",
      "",
      `Tipo: ${NOMBRE_TIPO_COLABORACION[aviso.tipo]}`,
      `Recibida: ${formatoFecha.format(aviso.creadaEn)}`,
      `Referencia: ${aviso.id}`,
      "",
      `Ábrela en el panel: ${aviso.enlace}`,
      "",
      "Por privacidad, este aviso no incluye los datos de la propuesta.",
    ].join("\n"),
  };
}

function notificadorResend(clave: string, de: string, para: string[], peticion: typeof fetch): Notificador {
  return {
    nombre: "resend",
    async nuevaPropuesta(aviso) {
      const { asunto, texto } = textoAviso(aviso);
      try {
        const respuesta = await peticion("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: de, to: para, subject: asunto, text: texto }),
          signal: AbortSignal.timeout(8000),
        });
        if (!respuesta.ok) {
          console.warn(`[notificaciones] Resend respondió ${respuesta.status}; la propuesta ${aviso.id} sigue guardada.`);
          return { enviado: false, motivo: "error" };
        }
        return { enviado: true };
      } catch {
        console.warn(`[notificaciones] No se pudo contactar con Resend; la propuesta ${aviso.id} sigue guardada.`);
        return { enviado: false, motivo: "error" };
      }
    },
  };
}

const ninguno: Notificador = {
  nombre: "ninguno",
  async nuevaPropuesta() {
    return { enviado: false, motivo: "sin-configurar" };
  },
};

export function crearNotificador(env: Variables = process.env, peticion: typeof fetch = fetch): Notificador {
  const clave = env.RESEND_API_KEY;
  const de = env.NOTIFICACIONES_DE?.trim();
  const para = (env.NOTIFICACIONES_PARA ?? "")
    .split(",")
    .map((direccion) => direccion.trim())
    .filter(Boolean);
  if (!clave || !de || para.length === 0) return ninguno;
  return notificadorResend(clave, de, para, peticion);
}
