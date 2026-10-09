"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AltaInicialNoDisponible, AltaInicialRechazada, crearPrimerAdministrador } from "@/server/auth/alta-inicial";
import { huellaDeCabeceras } from "@/server/auth/huella";
import { obtenerAuth } from "@/server/auth/instancia";
import { obtenerPrisma } from "@/server/db";

export type EstadoAlta = { error?: string };

function texto(formulario: FormData, campo: string): string {
  const valor = formulario.get(campo);
  return typeof valor === "string" ? valor : "";
}

export async function accionAltaInicial(_previo: EstadoAlta, formulario: FormData): Promise<EstadoAlta> {
  const contrasena = texto(formulario, "contrasena");
  if (contrasena !== texto(formulario, "confirmacion")) {
    return { error: "Las dos contraseñas no coinciden." };
  }

  const cabeceras = await headers();
  const auth = obtenerAuth();
  try {
    const { email } = await crearPrimerAdministrador(
      obtenerPrisma(),
      auth,
      { nombre: texto(formulario, "nombre"), email: texto(formulario, "email"), contrasena, secreto: texto(formulario, "secreto") },
      {
        secretoEsperado: process.env.ADMIN_SETUP_SECRET,
        huella: huellaDeCabeceras(cabeceras, process.env.FINGERPRINT_HMAC_SECRET),
      },
    );
    // Primera sesión, sin TOTP todavía: el panel solo deja entrar en Seguridad hasta activarlo.
    await auth.api.signInEmail({ body: { email, password: contrasena }, headers: cabeceras });
  } catch (error) {
    if (error instanceof AltaInicialNoDisponible) return { error: "El alta inicial ya no está disponible." };
    if (error instanceof AltaInicialRechazada) return { error: error.message };
    throw error;
  }
  redirect("/admin/seguridad");
}
