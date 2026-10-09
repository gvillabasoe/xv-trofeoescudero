"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import {
  CLAVES_UTM,
  TEXTOS_ESTADO,
  pareceAutomatico,
  validarPropuesta,
  valoresDelFormulario,
  type CampoPropuesta,
  type ValoresPropuesta,
} from "@/lib/proponer";
import { hoyoDesdeParametro, tipoDesdeParametro, viaDesdeParametro } from "@/lib/etiquetas";
import { urlBaseSitio } from "@/lib/sitio";
import { huellaDeCabeceras } from "@/server/auth/huella";
import { obtenerPrisma } from "@/server/db";
import { crearNotificador } from "@/server/notificaciones/notificador";
import { DemasiadosEnvios, FormularioCerrado, PrivacidadCambiada, registrarPropuesta } from "@/server/propuestas/crear";
import { verificarTurnstile } from "@/server/propuestas/turnstile";

export type EstadoPropuesta =
  | { estado: "inicial" }
  | { estado: "enviada" }
  | {
      estado: "errores";
      errores: Partial<Record<CampoPropuesta, string>>;
      valores: ValoresPropuesta;
    }
  | { estado: "error"; mensaje: string; valores: ValoresPropuesta; versionLegalVigente?: string };

function leer(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

/**
 * Envío de /proponer. Funciona sin JavaScript (formulario HTML normal) y con él (sin recargar).
 * La propuesta se guarda primero en Neon; el aviso por email, si está configurado, va después y nunca la bloquea.
 */
export async function enviarPropuesta(_previo: EstadoPropuesta, formulario: FormData): Promise<EstadoPropuesta> {
  const valores = valoresDelFormulario(formulario);
  // Primero se valida: una persona que envía el formulario incompleto siempre ve sus errores.
  const validacion = validarPropuesta(formulario);
  if (!validacion.ok) return { estado: "errores", errores: validacion.errores, valores };
  // Envíos automáticos (campo trampa o demasiado rápidos): se responde como a un envío correcto y no se guarda nada.
  if (pareceAutomatico(formulario)) return { estado: "enviada" };

  try {
    if (!(await verificarTurnstile(leer(formulario, "cf-turnstile-response")))) {
      return { estado: "error", mensaje: TEXTOS_ESTADO.servidor, valores };
    }
    const cabeceras = await headers();
    const origen = {
      tipo: tipoDesdeParametro(leer(formulario, "origen_tipo")),
      via: viaDesdeParametro(leer(formulario, "origen_via")),
      hoyo: hoyoDesdeParametro(leer(formulario, "origen_hoyo")),
    };
    const propuesta = await registrarPropuesta(obtenerPrisma(), {
      datos: validacion.datos,
      origen,
      versionLegalId: leer(formulario, "version_legal"),
      huella: huellaDeCabeceras(cabeceras, process.env.FINGERPRINT_HMAC_SECRET),
      contexto: {
        sourcePath: "/proponer",
        referrer: leer(formulario, "referencia") || null,
        utm: Object.fromEntries(CLAVES_UTM.map((clave) => [clave, leer(formulario, clave) || null])),
      },
    });

    after(async () => {
      await crearNotificador().nuevaPropuesta({
        id: propuesta.id,
        creadaEn: propuesta.creadaEn,
        tipo: validacion.datos.tipo,
        enlace: `${urlBaseSitio()}/admin/propuestas/${propuesta.id}`,
      });
    });
    return { estado: "enviada" };
  } catch (error) {
    if (error instanceof DemasiadosEnvios) return { estado: "error", mensaje: TEXTOS_ESTADO.demasiados, valores };
    if (error instanceof FormularioCerrado) return { estado: "error", mensaje: TEXTOS_ESTADO.cerrado, valores };
    if (error instanceof PrivacidadCambiada) {
      // La casilla vuelve sin marcar: hay que aceptar la versión nueva.
      return {
        estado: "error",
        mensaje: TEXTOS_ESTADO.privacidadCambiada,
        valores: { ...valores, privacidad: "" },
        versionLegalVigente: error.vigenteId,
      };
    }
    console.error("[proponer] Error al guardar una propuesta:", error instanceof Error ? error.name : "desconocido");
    return { estado: "error", mensaje: TEXTOS_ESTADO.servidor, valores };
  }
}
