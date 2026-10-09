import { z } from "zod";
import { TIPOS_COLABORACION, type ClaveVia, type TipoColaboracion } from "@/lib/snapshot/comun";
import { hoyoDesdeParametro, tipoDesdeParametro, viaDesdeParametro } from "@/lib/etiquetas";

/** Formulario /proponer: campos, límites y textos de error (fase-1 §6). */

export const CAMPOS_PROPUESTA = ["nombre", "empresa", "cargo", "email", "telefono", "tipo", "mensaje", "privacidad"] as const;
export type CampoPropuesta = (typeof CAMPOS_PROPUESTA)[number];

export const MENSAJES_ERROR: Readonly<Record<CampoPropuesta, string>> = {
  nombre: "Escribe tu nombre y apellidos.",
  empresa: "Dinos qué empresa o marca representas.",
  cargo: "Revisa el cargo: es demasiado largo.",
  email: "Revisa el email: falta algo, por ejemplo nombre@empresa.com.",
  telefono: "Revisa el teléfono: solo números, espacios y el prefijo.",
  tipo: "Elige una opción. «Otra propuesta» también vale.",
  mensaje: "Cuéntanos algo más (mínimo 20 caracteres).",
  privacidad: "Para enviar la propuesta necesitamos que aceptes la política de privacidad.",
};

export const TEXTOS_ESTADO = {
  demasiados: "Has enviado varias propuestas seguidas. Espera unos minutos y vuelve a intentarlo.",
  servidor: "Algo ha fallado de nuestro lado. Tu texto sigue aquí; inténtalo de nuevo en un momento.",
  red: "No ha salido. Revisa la conexión y vuelve a enviarla; no hemos perdido lo que escribiste.",
  privacidadCambiada:
    "La política de privacidad se ha actualizado mientras escribías. Revísala y vuelve a marcar la casilla para enviar.",
  cerrado: "Ahora mismo no podemos recibir propuestas por aquí.",
} as const;

export function resumenErrores(numero: number): string {
  return numero === 1 ? "Hay 1 campo por revisar." : `Hay ${numero} campos por revisar.`;
}

/** Texto exacto de la casilla de consentimiento: se guarda con cada propuesta. */
export const TEXTO_CONSENTIMIENTO = "He leído y acepto la política de privacidad.";

export const LIMITES = {
  nombre: 120,
  empresa: 160,
  cargo: 120,
  email: 254,
  telefono: 32,
  mensaje: 4000,
  mensajeMinimo: 20,
} as const;

const PATRON_TELEFONO = /^\+?[\d\s]{6,}$/;

const textoObligatorio = (maximo: number) => z.string().trim().min(1).max(maximo);
const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .transform((valor) => (valor === "" ? null : valor));

export const esquemaPropuesta = z.object({
  nombre: textoObligatorio(LIMITES.nombre),
  empresa: textoObligatorio(LIMITES.empresa),
  cargo: textoOpcional(LIMITES.cargo),
  email: z.string().trim().max(LIMITES.email).pipe(z.email()),
  telefono: textoOpcional(LIMITES.telefono).refine((valor) => valor === null || PATRON_TELEFONO.test(valor)),
  tipo: z.enum(TIPOS_COLABORACION),
  mensaje: z.string().trim().min(LIMITES.mensajeMinimo).max(LIMITES.mensaje),
  privacidad: z.literal("si"),
});

export type DatosPropuesta = z.infer<typeof esquemaPropuesta>;

/** Valores tal como llegaron, para volver a rellenar el formulario (también sin JavaScript). */
export type ValoresPropuesta = Partial<Record<CampoPropuesta, string>>;

export type ResultadoValidacion =
  | { ok: true; datos: DatosPropuesta }
  | { ok: false; errores: Partial<Record<CampoPropuesta, string>> };

function leer(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

export function valoresDelFormulario(formulario: FormData): ValoresPropuesta {
  return Object.fromEntries(CAMPOS_PROPUESTA.map((campo) => [campo, leer(formulario, campo)]));
}

export function validarPropuesta(formulario: FormData): ResultadoValidacion {
  const resultado = esquemaPropuesta.safeParse(valoresDelFormulario(formulario));
  if (resultado.success) return { ok: true, datos: resultado.data };
  const errores: Partial<Record<CampoPropuesta, string>> = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0];
    if (typeof campo === "string" && (CAMPOS_PROPUESTA as readonly string[]).includes(campo)) {
      errores[campo as CampoPropuesta] ??= MENSAJES_ERROR[campo as CampoPropuesta];
    }
  }
  return { ok: false, errores };
}

/** Origen de la propuesta, a partir de los parámetros de /proponer (?tipo=, ?via=, ?hoyo=). */
export interface OrigenPropuesta {
  tipo: TipoColaboracion | null;
  via: ClaveVia | null;
  hoyo: number | null;
}

export function origenDesdeParametros(parametros: { get(nombre: string): string | null }): OrigenPropuesta {
  return {
    tipo: tipoDesdeParametro(parametros.get("tipo")),
    via: viaDesdeParametro(parametros.get("via")),
    hoyo: hoyoDesdeParametro(parametros.get("hoyo")),
  };
}

/** `formOrigin`: ruta + tipo preseleccionado, legible en la bandeja. */
export function describirOrigen(origen: OrigenPropuesta): string {
  const partes = ["/proponer"];
  if (origen.tipo) partes.push(`tipo=${origen.tipo}`);
  if (origen.via) partes.push(`via=${origen.via}`);
  if (origen.hoyo) partes.push(`hoyo=${origen.hoyo}`);
  return partes.join(" · ");
}

/** Mínimo de segundos entre que se carga el formulario y se envía (trampa de tiempo). */
export const SEGUNDOS_MINIMOS = 3;

/** true si el envío parece automático: campo trampa relleno o enviado demasiado rápido. */
export function pareceAutomatico(formulario: FormData, ahora = Date.now()): boolean {
  if (leer(formulario, "sitio_web").trim() !== "") return true;
  const inicio = Number(leer(formulario, "inicio"));
  // Sin JavaScript no hay marca de tiempo: se acepta y quedan el límite de envíos y el campo trampa.
  if (!Number.isFinite(inicio) || inicio <= 0) return false;
  return ahora - inicio < SEGUNDOS_MINIMOS * 1000;
}

/** Parámetros UTM aceptados (sin datos personales; recortados). */
export const CLAVES_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
