"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccesoRechazado, iniciarSesionConContrasena, verificarSegundoFactor } from "@/server/auth/acceso";
import { huellaDeCabeceras } from "@/server/auth/huella";
import { obtenerAuth } from "@/server/auth/instancia";
import { obtenerPrisma } from "@/server/db";

export type EstadoAcceso = { paso: "credenciales" | "segundo-factor"; error?: string };

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

function rutaDe(destino: "panel" | "seguridad"): string {
  return destino === "panel" ? "/admin" : "/admin/seguridad";
}

export async function accionIniciarSesion(_previo: EstadoAcceso, formulario: FormData): Promise<EstadoAcceso> {
  const cabeceras = await headers();
  let destino: "panel" | "seguridad";
  try {
    const resultado = await iniciarSesionConContrasena(obtenerPrisma(), obtenerAuth(), {
      email: texto(formulario, "email"),
      contrasena: texto(formulario, "contrasena"),
      cabeceras,
      huella: huellaDeCabeceras(cabeceras, process.env.FINGERPRINT_HMAC_SECRET),
    });
    if (resultado.destino === "segundo-factor") return { paso: "segundo-factor" };
    destino = resultado.destino;
  } catch (error) {
    if (error instanceof AccesoRechazado) return { paso: "credenciales", error: error.message };
    throw error;
  }
  redirect(rutaDe(destino));
}

export async function accionSegundoFactor(_previo: EstadoAcceso, formulario: FormData): Promise<EstadoAcceso> {
  const cabeceras = await headers();
  let destino: "panel" | "seguridad";
  try {
    const resultado = await verificarSegundoFactor(obtenerPrisma(), obtenerAuth(), {
      codigo: texto(formulario, "codigo"),
      tipo: texto(formulario, "tipo") === "recuperacion" ? "recuperacion" : "totp",
      cabeceras,
      huella: huellaDeCabeceras(cabeceras, process.env.FINGERPRINT_HMAC_SECRET),
    });
    destino = resultado.destino === "segundo-factor" ? "seguridad" : resultado.destino;
  } catch (error) {
    if (error instanceof AccesoRechazado) return { paso: "segundo-factor", error: error.message };
    throw error;
  }
  redirect(rutaDe(destino));
}
