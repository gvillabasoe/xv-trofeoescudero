"use server";

import { redirect } from "next/navigation";
import { auditarSeguridad } from "@/server/auth/auditoria";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerAuth } from "@/server/auth/instancia";
import { obtenerPrisma } from "@/server/db";
import { DemoNoPermitida, reiniciarDemo } from "@/server/semilla/demo";

export type EstadoDemo = { mensaje?: string; error?: string };

export async function accionCerrarSesion(): Promise<void> {
  const { usuario, cabeceras } = await requerirAdmin({ exigirTotp: false });
  await obtenerAuth().api.signOut({ headers: cabeceras });
  await auditarSeguridad(obtenerPrisma(), { actorId: usuario.id, accion: "CIERRE_SESION", resumen: "Cierre de sesión" });
  redirect("/admin/login");
}

/** Reset demo: solo preview/desarrollo con NONPROD, doble confirmación y sesión con TOTP. */
export async function accionReiniciarDemo(_previo: EstadoDemo, formulario: FormData): Promise<EstadoDemo> {
  const { usuario } = await requerirAdmin({ exigirTotp: true });
  if (formulario.get("entiendo") !== "si" || formulario.get("confirmacion") !== "BORRAR DEMO") {
    return { error: "Marca la casilla y escribe BORRAR DEMO, en mayúsculas, para confirmar." };
  }
  try {
    const { borradas, creadas } = await reiniciarDemo(obtenerPrisma(), { env: process.env, actorId: usuario.id });
    return { mensaje: `Hecho: ${borradas} propuestas ficticias borradas y ${creadas} creadas de nuevo.` };
  } catch (error) {
    if (error instanceof DemoNoPermitida) return { error: error.message };
    throw error;
  }
}
